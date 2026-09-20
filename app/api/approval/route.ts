import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase'

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
  try {
    const { id, action, rejectionReason } = await req.json()
    if (!id || !action) return NextResponse.json({ error: 'id e action são obrigatórios' }, { status: 400 })

    const db = createServerClient()

    const { data: approval, error } = await db
      .from('approval_requests')
      .select('*, doctor:doctors(name, specialty)')
      .eq('id', id)
      .single()

    if (error || !approval) return NextResponse.json({ error: 'Aprovação não encontrada' }, { status: 404 })

    const patientName = approval.patient_name ?? 'Paciente'
    const now = new Date().toISOString()

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
        actor_type: 'receptionist', actor_id: 'receptionist',
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
        `Ou se preferir, pode nos dizer qual especialidade e período prefere para agilizarmos! — Clínica São Lucas 🏥`
      await notifyAndLog(db, approval.session_id, msg)

      return NextResponse.json({ ok: true, action: 'rejected' })
    }

    // ── cancelamento: confirm_cancel ──────────────────────────────────────────
    if (action === 'confirm_cancel') {
      // Cancel linked appointment if present
      const apptId = (approval.details as { appointment_id?: string } | null)?.appointment_id
      if (apptId) {
        await db.from('appointments').update({
          status: 'cancelada',
          cancel_reason: 'Solicitado pelo paciente via WhatsApp',
        }).eq('id', apptId)
      }

      await db.from('approval_requests').update({
        status: 'resolved',
        reviewed_at: now,
        reviewed_by: 'receptionist',
      }).eq('id', id)

      const msg =
        `Olá, *${patientName}*! ✅\n\n` +
        `Sua consulta foi cancelada conforme solicitado.\n\n` +
        `Se precisar remarcar, é só nos chamar aqui no WhatsApp! — Clínica São Lucas 🏥`
      await notifyAndLog(db, approval.session_id, msg)

      return NextResponse.json({ ok: true, action: 'confirm_cancel' })
    }

    // ── cancelamento / alteracao_horario: keep_appointment ────────────────────
    if (action === 'keep_appointment') {
      await db.from('approval_requests').update({
        status: 'resolved',
        reviewed_at: now,
        reviewed_by: 'receptionist',
      }).eq('id', id)

      const isAlteracao = approval.request_type === 'alteracao_horario'
      const msg = isAlteracao
        ? `Olá, *${patientName}*! 🗓\n\n` +
          `Confirmamos que sua consulta foi mantida no horário original.\n\n` +
          `Se quiser remarcar, é só nos dizer a data preferida! — Clínica São Lucas 🏥`
        : `Olá, *${patientName}*! 😊\n\n` +
          `Ótimo! Sua consulta foi mantida. Aguardamos sua presença!\n\n` +
          `Se precisar de algo mais, estamos aqui. — Clínica São Lucas 🏥`
      await notifyAndLog(db, approval.session_id, msg)

      return NextResponse.json({ ok: true, action: 'keep_appointment' })
    }

    // ── atendente / alteracao_horario: resolve ────────────────────────────────
    if (action === 'resolve') {
      await db.from('approval_requests').update({
        status: 'resolved',
        reviewed_at: now,
        reviewed_by: 'receptionist',
      }).eq('id', id)

      let msg: string
      if (approval.request_type === 'atendente') {
        msg =
          `Olá, *${patientName}*! 📞\n\n` +
          `Nossa equipe já está ciente da sua solicitação e entrará em contato com você em breve.\n\n` +
          `Clínica São Lucas 🏥`
      } else {
        msg =
          `Olá, *${patientName}*! 🗓\n\n` +
          `Sua solicitação de remarcação foi processada. Nossa equipe verificará a disponibilidade e confirmará o novo horário em breve.\n\n` +
          `Clínica São Lucas 🏥`
      }
      await notifyAndLog(db, approval.session_id, msg)

      return NextResponse.json({ ok: true, action: 'resolve' })
    }

    return NextResponse.json({ error: 'Ação inválida.' }, { status: 400 })
  } catch (err) {
    console.error('[approval/route] error:', err)
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 })
  }
}
