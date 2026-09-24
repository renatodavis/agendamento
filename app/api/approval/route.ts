import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase'
import { requireAuth } from '@/lib/auth'
import { getClinicBasicConfig } from '@/lib/clinic-config-server'

// ── GET: lista approval_requests pendentes (service role bypassa RLS) ──
export async function GET(req: NextRequest) {
  const auth = await requireAuth()
  if (auth instanceof NextResponse) return auth

  const db = createServerClient()
  const { data, error } = await db
    .from('approval_requests')
    .select('*, doctor:doctors(name, specialty)')
    .eq('status', 'pending')
    .order('created_at', { ascending: true })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data ?? [])
}

// ── GET (count): usado pelo badge ─────────────────────────────────────
// /api/approval?count=1
// Mantido no mesmo handler acima via query param — veja ApprovalPanel.

const WA_TOKEN    = process.env.WHATSAPP_API_TOKEN
const WA_PHONE_ID = process.env.WHATSAPP_PHONE_NUMBER_ID

async function sendWhatsApp(phone: string, text: string) {
  if (!WA_TOKEN || !WA_PHONE_ID) return
  await fetch(`https://graph.facebook.com/v19.0/${WA_PHONE_ID}/messages`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${WA_TOKEN}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ messaging_product: 'whatsapp', to: phone, type: 'text', text: { body: text } }),
  })
}

async function getSessionPhone(db: ReturnType<typeof createServerClient>, sessionId: string | null) {
  if (!sessionId) return null
  const { data } = await db.from('wa_sessions').select('phone, id').eq('id', sessionId).single()
  return data ?? null
}

async function notifyAndLog(
  db: ReturnType<typeof createServerClient>,
  sessionId: string | null,
  message: string
) {
  const session = await getSessionPhone(db, sessionId)
  if (session?.phone) {
    await sendWhatsApp(session.phone, message)
    await db.from('wa_messages').insert({
      session_id: session.id,
      direction: 'outbound',
      body: message,
      status: 'sent',
    })
  }
}

export async function POST(req: NextRequest) {
  const auth = await requireAuth()
  if (auth instanceof NextResponse) return auth

  try {
    const { id, action, rejectionReason } = await req.json()
    if (!id || !action) return NextResponse.json({ error: 'id e action são obrigatórios' }, { status: 400 })

    const db = createServerClient()
    const { clinicName } = await getClinicBasicConfig()

    const { data: approval, error } = await db
      .from('approval_requests')
      .select('*, doctor:doctors(name, specialty)')
      .eq('id', id)
      .single()

    if (error || !approval) return NextResponse.json({ error: 'Aprovação não encontrada' }, { status: 404 })

    const patientName = approval.patient_name ?? 'Paciente'
    const now = new Date().toISOString()

    // Helper: format appointment details from details jsonb or doctor join
    type ApptDetails = { appointment_id?: string; scheduled_at?: string; doctor_name?: string; doctor_specialty?: string; new_scheduled_at?: string }
    const det = approval.details as ApptDetails | null
    const doc = approval.doctor as unknown as { name: string; specialty: string } | null
    const doctorName = doc?.name ?? det?.doctor_name ?? null
    const doctorSpec = doc?.specialty ?? det?.doctor_specialty ?? null
    const apptIso = det?.scheduled_at ?? null
    function fmtAppt() {
      if (!apptIso) return null
      const d = new Date(apptIso)
      const date = d.toLocaleDateString('pt-BR', { weekday: 'long', day: '2-digit', month: '2-digit', year: 'numeric', timeZone: 'UTC' })
      const time = d.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit', timeZone: 'UTC' })
      return `${date} às ${time}`
    }
    const apptStr = fmtAppt()

    // ── disponibilidade: approve ──────────────────────────────────────────────
    if (action === 'approve') {
      await db.from('approval_requests').update({
        status: 'approved',
        reviewed_at: now,
        reviewed_by: 'receptionist',
      }).eq('id', id)

      if (approval.session_id && approval.message_to_patient) {
        await notifyAndLog(db, approval.session_id, approval.message_to_patient)
      }

      await db.from('audit_log').insert({
        actor_type: 'receptionist', actor_id: 'recepcao',
        action: 'approval_approved', record_type: 'approval_request', record_id: id,
      })

      return NextResponse.json({ ok: true, action: 'approved' })
    }

    // ── disponibilidade: reject ───────────────────────────────────────────────
    if (action === 'reject') {
      await db.from('approval_requests').update({
        status: 'rejected',
        rejection_reason: rejectionReason ?? 'Sem disponibilidade',
        reviewed_at: now,
        reviewed_by: 'receptionist',
      }).eq('id', id)

      const msg =
        `Olá, *${patientName}*!\n\n` +
        `Infelizmente o horário sugerido não está mais disponível. 😔\n\n` +
        `Nossa equipe está buscando outras opções e entrará em contato em breve.\n\n` +
        `Ou se preferir, pode nos dizer qual especialidade e período prefere para agilizarmos! — ${clinicName} 🏥`
      await notifyAndLog(db, approval.session_id, msg)

      return NextResponse.json({ ok: true, action: 'rejected' })
    }

    // ── cancelamento: confirm_cancel ──────────────────────────────────────────
    if (action === 'confirm_cancel') {
      // Resolve appointment ID: from details jsonb, or fallback to patient's next upcoming
      let apptId = (approval.details as { appointment_id?: string } | null)?.appointment_id ?? null

      if (!apptId && approval.patient_id) {
        const { data: appts } = await db
          .from('appointments')
          .select('id')
          .eq('patient_id', approval.patient_id)
          .not('status', 'in', '("cancelada","lista_espera")')
          .gte('scheduled_at', new Date().toISOString())
          .order('scheduled_at', { ascending: true })
          .limit(1)
        apptId = appts?.[0]?.id ?? null
      }

      if (apptId) {
        const { error: cancelErr } = await db.from('appointments').update({
          status: 'cancelada',
          cancel_reason: 'Solicitado pelo paciente via WhatsApp',
        }).eq('id', apptId)
        if (cancelErr) {
          console.error('[approval confirm_cancel] appointments update failed:', cancelErr)
          return NextResponse.json({ error: `Falha ao cancelar consulta: ${cancelErr.message}` }, { status: 500 })
        }
      } else {
        console.warn('[approval confirm_cancel] no appointment_id found for approval', id)
      }

      await db.from('approval_requests').update({
        status: 'resolved',
        reviewed_at: now,
        reviewed_by: 'receptionist',
      }).eq('id', id)

      const apptLine = apptStr && doctorName
        ? `📅 *${apptStr}*\n👨‍⚕️ ${doctorName}${doctorSpec ? ` (${doctorSpec})` : ''}\n\n`
        : apptStr ? `📅 *${apptStr}*\n\n` : ''
      const msg =
        `Olá, *${patientName}*! ✅\n\n` +
        `Sua consulta foi cancelada conforme solicitado.\n\n` +
        apptLine +
        `Se precisar remarcar, é só nos chamar aqui no WhatsApp! — ${clinicName} 🏥`
      await notifyAndLog(db, approval.session_id, msg)

      return NextResponse.json({ ok: true, action: 'confirm_cancel', cancelled_appointment_id: apptId })
    }

    // ── cancelamento / alteracao_horario: keep_appointment ────────────────────
    if (action === 'keep_appointment') {
      await db.from('approval_requests').update({
        status: 'resolved',
        reviewed_at: now,
        reviewed_by: 'receptionist',
      }).eq('id', id)

      const isAlteracao = approval.request_type === 'alteracao_horario'
      const apptInfo = apptStr
        ? `\n📅 *${apptStr}*${doctorName ? `\n👨‍⚕️ ${doctorName}` : ''}\n`
        : ''
      const msg = isAlteracao
        ? `Olá, *${patientName}*! 🗓\n\n` +
          `Confirmamos que sua consulta foi mantida no horário original.${apptInfo}\n` +
          `Se quiser remarcar, é só nos dizer a data preferida! — ${clinicName} 🏥`
        : `Olá, *${patientName}*! 😊\n\n` +
          `Ótimo! Sua consulta foi mantida. Aguardamos sua presença!${apptInfo}\n` +
          `Se precisar de algo mais, estamos aqui. — ${clinicName} 🏥`
      await notifyAndLog(db, approval.session_id, msg)

      return NextResponse.json({ ok: true, action: 'keep_appointment' })
    }

    // ── atendente: resolve ────────────────────────────────────────────────────
    if (action === 'resolve' && approval.request_type === 'atendente') {
      await db.from('approval_requests').update({
        status: 'resolved', reviewed_at: now, reviewed_by: 'receptionist',
      }).eq('id', id)

      const msg =
        `Olá, *${patientName}*! 📞\n\n` +
        `Nossa equipe já está ciente da sua solicitação e entrará em contato com você em breve.\n\n` +
        `${clinicName} 🏥`
      await notifyAndLog(db, approval.session_id, msg)
      return NextResponse.json({ ok: true, action: 'resolve' })
    }

    // ── reagendamento_forcado: recepção aprova → envia sugestão ao paciente ──
    // O agendamento já foi cancelado ao criar o bloqueio; aqui só notifica.
    if (action === 'confirm_forced_reschedule') {
      type ForcedDetails = { appointment_id?: string; scheduled_at?: string; suggested_new_at?: string; doctor_name?: string; doctor_specialty?: string; block_reason?: string }
      const fd = approval.details as ForcedDetails | null
      const newIso   = fd?.suggested_new_at ?? null
      const fdocName = fd?.doctor_name ?? doctorName
      const fdocSpec = fd?.doctor_specialty ?? doctorSpec

      await db.from('approval_requests').update({
        status: 'resolved', reviewed_at: now, reviewed_by: 'receptionist',
      }).eq('id', id)

      let msg: string
      if (newIso) {
        const d = new Date(newIso)
        const newDate = d.toLocaleDateString('pt-BR', { weekday: 'long', day: '2-digit', month: '2-digit', year: 'numeric', timeZone: 'UTC' })
        const newTime = d.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit', timeZone: 'UTC' })
        msg =
          `Olá, *${patientName}*! 😔\n\n` +
          `Informamos que houve um imprevisto e sua consulta precisou ser cancelada.\n\n` +
          `Sugerimos um novo horário para reagendamento:\n` +
          `📅 *${newDate} às ${newTime}*\n` +
          (fdocName ? `👨‍⚕️ ${fdocName}${fdocSpec ? ` (${fdocSpec})` : ''}\n\n` : '\n') +
          `Se esse horário for conveniente, é só confirmar! Caso contrário, nos diga sua preferência. Pedimos desculpas pelo transtorno. — ${clinicName} 🏥`
      } else {
        msg =
          `Olá, *${patientName}*! 😔\n\n` +
          `Informamos que houve um imprevisto e sua consulta precisou ser cancelada.\n\n` +
          `Por favor, entre em contato para reagendar em uma data de sua preferência. Pedimos desculpas pelo transtorno. — ${clinicName} 🏥`
      }
      await notifyAndLog(db, approval.session_id, msg)
      return NextResponse.json({ ok: true, action: 'confirm_forced_reschedule' })
    }

    // ── alteracao_horario: confirm_reschedule ─────────────────────────────────
    if (action === 'resolve' && approval.request_type === 'alteracao_horario') {
      const newIso   = det?.new_scheduled_at ?? null
      const apptId   = det?.appointment_id ?? null

      // Atualiza o agendamento se tiver o novo horário e o appointment_id
      let rescheduled = false
      if (newIso && apptId) {
        const { error: updErr } = await db.from('appointments')
          .update({ scheduled_at: newIso, status: 'agendada' })
          .eq('id', apptId)
        if (updErr) {
          console.error('[approval resolve] falha ao remarcar appointment:', updErr)
        } else {
          rescheduled = true
        }
      }

      await db.from('approval_requests').update({
        status: 'resolved', reviewed_at: now, reviewed_by: 'receptionist',
      }).eq('id', id)

      let msg: string
      if (rescheduled && newIso) {
        const d = new Date(newIso)
        const newDate = d.toLocaleDateString('pt-BR', { weekday: 'long', day: '2-digit', month: '2-digit', year: 'numeric', timeZone: 'UTC' })
        const newTime = d.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit', timeZone: 'UTC' })
        msg =
          `Olá, *${patientName}*! ✅\n\n` +
          `Sua consulta foi remarcada com sucesso!\n\n` +
          `📅 *${newDate} às ${newTime}*\n` +
          (doctorName ? `👨‍⚕️ ${doctorName}${doctorSpec ? ` (${doctorSpec})` : ''}\n\n` : '\n') +
          `Até lá! — ${clinicName} 🏥`
      } else {
        const apptInfo = apptStr
          ? `\n📅 *${apptStr}*${doctorName ? `\n👨‍⚕️ ${doctorName}` : ''}\n`
          : ''
        msg =
          `Olá, *${patientName}*! 🗓\n\n` +
          `Sua solicitação de remarcação foi processada. Nossa equipe entrará em contato para confirmar o novo horário.${apptInfo}\n` +
          `${clinicName} 🏥`
      }
      await notifyAndLog(db, approval.session_id, msg)
      return NextResponse.json({ ok: true, action: 'resolve', rescheduled })
    }

    return NextResponse.json({ error: 'Ação inválida.' }, { status: 400 })
  } catch (err) {
    console.error('[approval/route] error:', err)
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 })
  }
}
