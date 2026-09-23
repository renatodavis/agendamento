import { NextRequest, NextResponse } from 'next/server'
import { createHmac, timingSafeEqual } from 'crypto'
import { createServerClient } from '@/lib/supabase'
import { processMessage } from '@/lib/chat'
import { getClinicBasicConfig } from '@/lib/clinic-config-server'

// Meta WhatsApp Business Cloud API webhook
// Docs: https://developers.facebook.com/docs/whatsapp/cloud-api/webhooks

const VERIFY_TOKEN = process.env.WHATSAPP_VERIFY_TOKEN
const APP_SECRET   = process.env.WHATSAPP_APP_SECRET
const WA_TOKEN     = process.env.WHATSAPP_API_TOKEN
const WA_PHONE_ID  = process.env.WHATSAPP_PHONE_NUMBER_ID

// O1: Rate limiting — max inbound messages per minute per session
const RATE_LIMIT_MAX = 10
const RATE_LIMIT_WINDOW_MS = 60_000

// ── S6: Valida assinatura X-Hub-Signature-256 ────────────────────────
// Se APP_SECRET não estiver configurado, a validação é ignorada (modo desenvolvimento).
function verifySignature(rawBody: string, signature: string | null): boolean {
  if (!APP_SECRET) return true
  if (!signature) return false
  const expected = 'sha256=' + createHmac('sha256', APP_SECRET).update(rawBody).digest('hex')
  try {
    return timingSafeEqual(Buffer.from(signature), Buffer.from(expected))
  } catch {
    return false
  }
}

// ── GET: Meta webhook verification handshake ─────────────────────────
export async function GET(req: NextRequest) {
  if (!VERIFY_TOKEN) {
    console.error('[whatsapp/GET] WHATSAPP_VERIFY_TOKEN não configurado')
    return new Response('Forbidden', { status: 403 })
  }
  const { searchParams } = new URL(req.url)
  const mode = searchParams.get('hub.mode')
  const token = searchParams.get('hub.verify_token')
  const challenge = searchParams.get('hub.challenge')

  if (mode === 'subscribe' && token === VERIFY_TOKEN) {
    return new Response(challenge, { status: 200 })
  }
  return new Response('Forbidden', { status: 403 })
}

// ── POST: Receive inbound WhatsApp messages ──────────────────────────
export async function POST(req: NextRequest) {
  try {
    const rawBody = await req.text()

    // S6: Valida assinatura quando WHATSAPP_APP_SECRET estiver configurado
    const signature = req.headers.get('x-hub-signature-256')
    if (!verifySignature(rawBody, signature)) {
      console.warn('[whatsapp/POST] assinatura X-Hub-Signature-256 inválida')
      return new Response('Unauthorized', { status: 401 })
    }

    const body = JSON.parse(rawBody)
    const db = createServerClient()
    const { clinicName } = await getClinicBasicConfig()

    // Extract message from Meta webhook payload
    const entry = body?.entry?.[0]
    const changes = entry?.changes?.[0]
    const value = changes?.value

    if (value?.statuses) {
      // Delivery status update — update wa_messages status
      for (const status of value.statuses) {
        await db
          .from('wa_messages')
          .update({ status: status.status })
          .eq('id', status.id)
      }
      return NextResponse.json({ ok: true })
    }

    const message = value?.messages?.[0]
    if (!message) return NextResponse.json({ ok: true })

    const phone = message.from
    const text  = message.text?.body ?? ''
    const wamid = message.id as string | undefined
    const contactName = value?.contacts?.[0]?.profile?.name ?? null

    // S7: Deduplicação — Meta reenvia o mesmo wamid em retentativas (até 72h)
    if (wamid) {
      const { data: existing } = await createServerClient()
        .from('wa_messages')
        .select('id')
        .eq('wamid', wamid)
        .limit(1)
        .single()
      if (existing) {
        console.log('[whatsapp/POST] wamid duplicado ignorado:', wamid)
        return NextResponse.json({ ok: true })
      }
    }

    // Upsert WhatsApp session
    const { data: session } = await db
      .from('wa_sessions')
      .upsert({ phone, last_inbound_at: new Date().toISOString() }, { onConflict: 'phone' })
      .select()
      .single()

    // Update contact name from WhatsApp profile
    if (session?.id && contactName) {
      await db.from('wa_sessions').update({ name: contactName }).eq('id', session.id)
    }

    // Check opt-out
    if (session?.opt_out_at) {
      return NextResponse.json({ ok: true })
    }

    // S12: LGPD consent — obrigatório no primeiro contato (Art. 11 Lei 13.709/2018)
    if (session?.id && !session?.lgpd_consent_at) {
      const isConsent = /^(sim|s|yes|1|aceito|aceitar|concordo|autorizo|ok)$/i.test(text.trim())

      if (isConsent) {
        await db.from('wa_sessions').update({ lgpd_consent_at: new Date().toISOString() }).eq('id', session.id)
        // Armazena mensagem de aceite e deixa o fluxo continuar normalmente
        // (a próxima mensagem do paciente já será processada pela IA)
      } else {
        // Primeiro contato — solicita consentimento antes de processar
        const consentMsg =
          `🏥 *${clinicName} — Privacidade de Dados*\n\n` +
          `Olá! Para iniciar seu atendimento, precisamos do seu consentimento conforme a *Lei Geral de Proteção de Dados (LGPD — Lei 13.709/2018)*.\n\n` +
          `📋 *Seus dados serão utilizados para:*\n` +
          `• Agendamento e controle de consultas\n` +
          `• Comunicação sobre seus atendimentos\n` +
          `• Prontuário médico (dados sensíveis de saúde, Art. 11 LGPD)\n\n` +
          `🔒 Seus dados são protegidos e *não serão compartilhados* com terceiros sem sua autorização.\n\n` +
          `Responda *SIM* para aceitar e iniciar o atendimento.`

        // Salva mensagem inbound e resposta de consentimento
        await db.from('wa_messages').insert({
          session_id: session.id, direction: 'inbound', body: text, status: 'delivered',
          ...(wamid ? { wamid } : {}),
        })
        if (WA_TOKEN && WA_PHONE_ID) {
          const waRes = await fetch(`https://graph.facebook.com/v19.0/${WA_PHONE_ID}/messages`, {
            method: 'POST',
            headers: { Authorization: `Bearer ${WA_TOKEN}`, 'Content-Type': 'application/json' },
            body: JSON.stringify({ messaging_product: 'whatsapp', to: phone, type: 'text', text: { body: consentMsg } }),
          })
          if (!waRes.ok) {
            const errBody = await waRes.text().catch(() => '')
            console.error('[whatsapp/POST] falha ao enviar mensagem LGPD:', waRes.status, errBody)
          }
        }
        await db.from('wa_messages').insert({
          session_id: session.id, direction: 'outbound', body: consentMsg, status: 'sent',
        })
        return NextResponse.json({ ok: true, action: 'lgpd_consent_requested' })
      }
    }

    // O1: Rate limiting — max RATE_LIMIT_MAX inbound messages per RATE_LIMIT_WINDOW_MS
    if (session?.id) {
      const windowStart = new Date(Date.now() - RATE_LIMIT_WINDOW_MS).toISOString()
      const { count } = await db
        .from('wa_messages')
        .select('id', { count: 'exact', head: true })
        .eq('session_id', session.id)
        .eq('direction', 'inbound')
        .gte('sent_at', windowStart)
      if ((count ?? 0) >= RATE_LIMIT_MAX) {
        console.warn('[whatsapp/POST] rate limit excedido para sessão:', session.id)
        return NextResponse.json({ ok: true })
      }
    }

    // ── Intercept: resposta ao lembrete de 24h (SIM confirma / NÃO escala cancelamento) ──
    if (session?.id && text) {
      const isYes = /^(sim|s|yes|1|confirmo|vou|estarei|ok|comparecer)$/i.test(text.trim())
      const isNo  = /^(n[aã]o|n|no|2|cancelar|nao|desmarcar)$/i.test(text.trim())

      if (isYes || isNo) {
        const windowStart = new Date(Date.now() + 20 * 60 * 60 * 1000).toISOString()
        const windowEnd   = new Date(Date.now() + 28 * 60 * 60 * 1000).toISOString()

        // Busca consulta com lembrete enviado dentro da janela de 24h
        const { data: remindedAppt } = await db
          .from('appointments')
          .select('id, scheduled_at, patient_id, doctor:doctors(name, specialty)')
          .eq('session_id', session.id)
          .not('reminder_sent_at', 'is', null)
          .in('status', ['agendada', 'confirmada'])
          .gte('scheduled_at', windowStart)
          .lte('scheduled_at', windowEnd)
          .order('scheduled_at', { ascending: true })
          .limit(1)
          .single()

        // Fallback: busca por patient_id se session_id não vinculado
        let appt = remindedAppt
        if (!appt && session.patient_id) {
          const { data: byPatient } = await db
            .from('appointments')
            .select('id, scheduled_at, patient_id, doctor:doctors(name, specialty)')
            .eq('patient_id', session.patient_id)
            .not('reminder_sent_at', 'is', null)
            .in('status', ['agendada', 'confirmada'])
            .gte('scheduled_at', windowStart)
            .lte('scheduled_at', windowEnd)
            .order('scheduled_at', { ascending: true })
            .limit(1)
            .single()
          appt = byPatient
        }

        if (appt) {
          const doctor = appt.doctor as unknown as { name: string; specialty: string } | null
          const d = new Date(appt.scheduled_at)
          const dateStr = d.toLocaleDateString('pt-BR', { weekday: 'long', day: '2-digit', month: 'long', timeZone: 'UTC' })
          const timeStr = d.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit', timeZone: 'UTC' })

          if (isYes) {
            await db.from('appointments').update({ status: 'confirmada' }).eq('id', appt.id)
            await db.from('audit_log').insert({
              actor_type: 'user', actor_id: session.id,
              action: 'appointment_confirmed_by_patient',
              record_type: 'appointment', record_id: appt.id,
            })

            const confirmMsg =
              `✅ *Presença confirmada!*\n\n` +
              `📅 ${dateStr} às *${timeStr}*\n` +
              `👨‍⚕️ ${doctor?.name ?? ''} — ${doctor?.specialty ?? ''}\n\n` +
              `Te esperamos amanhã! — ${clinicName} 🏥`

            await db.from('wa_messages').insert({
              session_id: session.id, direction: 'inbound', body: text, status: 'delivered',
              ...(wamid ? { wamid } : {}),
            })
            if (WA_TOKEN && WA_PHONE_ID) {
              await fetch(`https://graph.facebook.com/v19.0/${WA_PHONE_ID}/messages`, {
                method: 'POST',
                headers: { Authorization: `Bearer ${WA_TOKEN}`, 'Content-Type': 'application/json' },
                body: JSON.stringify({ messaging_product: 'whatsapp', to: phone, type: 'text', text: { body: confirmMsg } }),
              })
            }
            await db.from('wa_messages').insert({
              session_id: session.id, direction: 'outbound', body: confirmMsg, status: 'sent',
            })
            return NextResponse.json({ ok: true, action: 'reminder_confirmed' })
          }

          if (isNo) {
            // Escala cancelamento para recepção
            await db.from('approval_requests').insert({
              session_id: session.id,
              patient_id: appt.patient_id,
              patient_name: contactName ?? phone,
              doctor_id: null,
              request_type: 'cancelamento',
              status: 'pending',
              message_to_receptionist: `Paciente respondeu NÃO ao lembrete de 24h. Consulta: ${dateStr} às ${timeStr} — ${doctor?.specialty ?? ''}`,
              details: { appointment_id: appt.id, scheduled_at: appt.scheduled_at, doctor_name: doctor?.name, doctor_specialty: doctor?.specialty },
            })

            const cancelMsg =
              `Entendido! Sua solicitação de cancelamento foi registrada. 📋\n\n` +
              `Nossa equipe entrará em contato para confirmar. — ${clinicName} 🏥`

            await db.from('wa_messages').insert({
              session_id: session.id, direction: 'inbound', body: text, status: 'delivered',
              ...(wamid ? { wamid } : {}),
            })
            if (WA_TOKEN && WA_PHONE_ID) {
              await fetch(`https://graph.facebook.com/v19.0/${WA_PHONE_ID}/messages`, {
                method: 'POST',
                headers: { Authorization: `Bearer ${WA_TOKEN}`, 'Content-Type': 'application/json' },
                body: JSON.stringify({ messaging_product: 'whatsapp', to: phone, type: 'text', text: { body: cancelMsg } }),
              })
            }
            await db.from('wa_messages').insert({
              session_id: session.id, direction: 'outbound', body: cancelMsg, status: 'sent',
            })
            return NextResponse.json({ ok: true, action: 'reminder_cancelled' })
          }
        }
      }
    }
    // ── end reminder intercept ──

    // ── HITL intercept: approved approval waiting for patient confirmation ──
    if (session?.id && text) {
      const { data: pending } = await db
        .from('approval_requests')
        .select('*, doctor:doctors(name, specialty)')
        .eq('session_id', session.id)
        .eq('status', 'approved')
        .order('created_at', { ascending: false })
        .limit(1)
        .single()

      if (pending) {
        const isYes = /^(sim|s|yes|1|confirmo|ok)$/i.test(text.trim())
        const isNo  = /^(n[aã]o|n|no|2|outro|cancelar)$/i.test(text.trim())

        if (isYes) {
          const { data: appt } = await db
            .from('appointments')
            .insert({
              patient_id:   pending.patient_id,
              doctor_id:    pending.doctor_id,
              scheduled_at: pending.suggested_at,
              status: 'agendada',
              type: 'Consulta',
            })
            .select('id')
            .single()

          await db.from('approval_requests').update({ status: 'confirmed' }).eq('id', pending.id)

          const doctor = pending.doctor as unknown as { name: string; specialty: string } | null
          const dateStr = new Date(pending.suggested_at).toLocaleDateString('pt-BR', {
            weekday: 'long', day: '2-digit', month: 'long', year: 'numeric', timeZone: 'UTC',
          })
          const timeStr = new Date(pending.suggested_at).toLocaleTimeString('pt-BR', {
            hour: '2-digit', minute: '2-digit', timeZone: 'UTC',
          })

          const confirmMsg =
            `✅ *Consulta confirmada!*\n\n` +
            `📅 ${dateStr} às ${timeStr}\n` +
            `👨‍⚕️ ${doctor?.name ?? ''} — ${doctor?.specialty ?? ''}\n\n` +
            `${clinicName} 🏥\nQualquer dúvida, estamos à disposição!`

          if (WA_TOKEN && WA_PHONE_ID) {
            const waRes = await fetch(`https://graph.facebook.com/v19.0/${WA_PHONE_ID}/messages`, {
              method: 'POST',
              headers: { Authorization: `Bearer ${WA_TOKEN}`, 'Content-Type': 'application/json' },
              body: JSON.stringify({ messaging_product: 'whatsapp', to: phone, type: 'text', text: { body: confirmMsg } }),
            })
            if (!waRes.ok) {
              const errBody = await waRes.text().catch(() => '')
              console.error('[whatsapp/POST] falha ao enviar confirmação HITL:', waRes.status, errBody)
            }
          }
          await db.from('wa_messages').insert({
            session_id: session.id, direction: 'outbound', body: confirmMsg, status: 'sent',
          })
          await db.from('audit_log').insert({
            actor_type: 'agent', actor_id: 'sistema-agendamento',
            action: 'appointment_confirmed_by_patient',
            record_type: 'appointment', record_id: appt?.id ?? 'unknown',
          })
          return NextResponse.json({ ok: true, action: 'confirmed', appointmentId: appt?.id })
        }

        if (isNo) {
          await db.from('approval_requests').update({
            status: 'rejected',
            rejection_reason: 'Paciente recusou o horário sugerido',
          }).eq('id', pending.id)
        }
      }
    }
    // ── end HITL intercept ──

    // Carrega histórico ANTES de inserir a mensagem atual (evita duplicata no contexto)
    const { data: historyMsgs } = await db
      .from('wa_messages')
      .select('direction, body')
      .eq('session_id', session?.id)
      .order('sent_at', { ascending: false })
      .limit(20)
    const history = (historyMsgs ?? []).reverse().map(m => ({
      role: m.direction === 'inbound' ? 'user' : 'assistant',
      content: m.body,
    }))

    // Store inbound message (wamid gravado para deduplicação de retentativas)
    await db.from('wa_messages').insert({
      session_id: session?.id,
      direction: 'inbound',
      body: text,
      status: 'delivered',
      ...(wamid ? { wamid } : {}),
    })

    // ── Pre-AI keyword intercept: cancelamento / alteracao_horario ──────────────
    // Garante o approval_request ANTES de chamar o AI, independente do comportamento do modelo.
    if (session?.id && text) {
      const CANCEL_RE     = /\b(cancelar|cancelamento|desmarcar|cancela)\b/i
      const RESCHEDULE_RE = /\b(remarcar|remarca[çc][aã]o|alterar\s+hor[aá]rio|mudar\s+hor[aá]rio|mudar\s+data|trocar\s+hor[aá]rio)\b/i
      const ATTENDANT_RE  = /\b(atendente|recepcionista|recep[çc][aã]o|humano|pessoa|falar\s+com\s+algu[eé]m|quero\s+ser\s+atendido|falar\s+com\s+atendente|falar\s+com\s+recepcionista)\b/i
      const wantCancel     = CANCEL_RE.test(text)
      const wantReschedule = !wantCancel && RESCHEDULE_RE.test(text)
      const wantAttendant  = !wantCancel && !wantReschedule && ATTENDANT_RE.test(text)

      if (wantCancel || wantReschedule || wantAttendant) {
        const reqType: 'cancelamento' | 'alteracao_horario' | 'atendente' =
          wantCancel ? 'cancelamento' : wantReschedule ? 'alteracao_horario' : 'atendente'

        // Dedup: não criar se já existe um pending criado nos últimos 2 minutos
        const recentCutoff = new Date(Date.now() - 2 * 60 * 1000).toISOString()
        const { count: recentCount } = await db.from('approval_requests')
          .select('*', { count: 'exact', head: true })
          .eq('session_id', session.id)
          .eq('request_type', reqType)
          .eq('status', 'pending')
          .gte('created_at', recentCutoff)

        if ((recentCount ?? 0) === 0) {
          const { data: sessData } = await db.from('wa_sessions').select('patient_id').eq('id', session.id).single()
          const patientId = sessData?.patient_id ?? null
          let patientName = contactName ?? phone
          if (patientId) {
            const { data: p } = await db.from('patients').select('name').eq('id', patientId).single()
            if (p?.name) patientName = p.name
          }
          // Busca a próxima consulta ativa para incluir detalhes no card
          let apptDetails: Record<string, unknown> | null = null
          if (patientId) {
            const { data: appts } = await db.from('appointments')
              .select('id, scheduled_at, status, doctor:doctors(id, name, specialty)')
              .eq('patient_id', patientId)
              .not('status', 'in', '("cancelada","lista_espera")')
              .gte('scheduled_at', new Date().toISOString())
              .order('scheduled_at', { ascending: true })
              .limit(1)
            const appt = appts?.[0]
            if (appt) {
              const doc = appt.doctor as unknown as { id: string; name: string; specialty: string } | null
              apptDetails = { appointment_id: appt.id, scheduled_at: appt.scheduled_at, doctor_name: doc?.name, doctor_specialty: doc?.specialty }
            }
          }
          await db.from('approval_requests').insert({
            session_id: session.id,
            patient_id: patientId,
            patient_name: patientName,
            request_type: reqType,
            status: 'pending',
            message_to_receptionist: text,
            details: apptDetails,
          })
          console.log(`[whatsapp/POST] approval_request "${reqType}" criado (keyword intercept) para sessão`, session.id)
        }
      }
    }
    // ── end keyword intercept ──

    // R2: Chama a lógica de chat diretamente (sem HTTP interno)
    const { response, workflow } = await processMessage({
      message: text,
      sessionId: session?.id,
      history,
    })

    // Send reply via WhatsApp Cloud API
    if (response && WA_TOKEN && WA_PHONE_ID) {
      const waRes = await fetch(
        `https://graph.facebook.com/v19.0/${WA_PHONE_ID}/messages`,
        {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${WA_TOKEN}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            messaging_product: 'whatsapp',
            to: phone,
            type: 'text',
            text: { body: response },
          }),
        }
      )

      // R3: Detecta e loga falhas no envio WhatsApp
      if (!waRes.ok) {
        const errBody = await waRes.text().catch(() => '')
        console.error('[whatsapp/POST] falha ao enviar mensagem:', waRes.status, errBody)
        await db.from('wa_messages').insert({
          session_id: session?.id, direction: 'outbound', body: response, status: 'failed',
        })
        return NextResponse.json({ ok: true, error: 'whatsapp_send_failed' })
      }

      const waData = await waRes.json()

      await db.from('wa_messages').insert({
        session_id: session?.id,
        direction: 'outbound',
        body: response,
        status: 'sent',
      })

      await db.from('audit_log').insert({
        actor_type: 'agent',
        actor_id: 'comunicacao-whatsapp',
        action: 'whatsapp_send',
        record_type: 'wa_message',
        record_id: waData?.messages?.[0]?.id ?? 'unknown',
      })
    }

    return NextResponse.json({ ok: true, response, workflow })
  } catch (err) {
    console.error('[whatsapp/route] error:', err)
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 })
  }
}
