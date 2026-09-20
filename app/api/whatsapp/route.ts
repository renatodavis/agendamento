import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase'

// Meta WhatsApp Business Cloud API webhook
// Docs: https://developers.facebook.com/docs/whatsapp/cloud-api/webhooks

const VERIFY_TOKEN = process.env.WHATSAPP_VERIFY_TOKEN ?? 'clinica_saolucas_token'
const WA_TOKEN = process.env.WHATSAPP_API_TOKEN
const WA_PHONE_ID = process.env.WHATSAPP_PHONE_NUMBER_ID

// ── GET: Meta webhook verification handshake ─────────────────────────
export async function GET(req: NextRequest) {
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
    const body = await req.json()
    const db = createServerClient()

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
    const text = message.text?.body ?? ''
    const contactName = value?.contacts?.[0]?.profile?.name ?? null

    // Upsert WhatsApp session (only stable columns — name requires migration 0002)
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
          // Book the appointment directly
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
            `Clínica São Lucas 🏥\nQualquer dúvida, estamos à disposição!`

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
          await db.from('audit_log').insert({
            actor_type: 'agent', actor_id: 'sistema-agendamento',
            action: 'appointment_confirmed_by_patient',
            record_type: 'appointment', record_id: appt?.id ?? 'unknown',
          })
          return NextResponse.json({ ok: true, action: 'confirmed', appointmentId: appt?.id })
        }

        if (isNo) {
          // Mark rejected, fall through to Claude for natural response
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

    // Store inbound message
    await db.from('wa_messages').insert({
      session_id: session?.id,
      direction: 'inbound',
      body: text,
      status: 'delivered',
    })

    // Process through AI (reuse chat route logic)
    const chatRes = await fetch(`${process.env.NEXT_PUBLIC_APP_URL}/api/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ message: text, sessionId: session?.id, history }),
    })
    const { response, workflow } = await chatRes.json()

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

      const waData = await waRes.json()

      await db.from('wa_messages').insert({
        session_id: session?.id,
        direction: 'outbound',
        body: response,
        status: 'sent',
      })

      // Log para auditoria
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
