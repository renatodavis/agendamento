import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase'

const WA_TOKEN    = process.env.WHATSAPP_API_TOKEN
const WA_PHONE_ID = process.env.WHATSAPP_PHONE_NUMBER_ID

async function sendWhatsApp(phone: string, text: string) {
  if (!WA_TOKEN || !WA_PHONE_ID) return { skipped: true }

  const res = await fetch(
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
        text: { body: text },
      }),
    }
  )
  return res.json()
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleString('pt-BR', {
    day: '2-digit', month: '2-digit', year: 'numeric',
    hour: '2-digit', minute: '2-digit', timeZone: 'UTC',
  })
}

export async function POST(req: NextRequest) {
  try {
    const { appointmentId, type, reason, cancelledBy } = await req.json()

    if (!appointmentId || !type) {
      return NextResponse.json({ error: 'appointmentId e type são obrigatórios' }, { status: 400 })
    }

    const db = createServerClient()

    // Load appointment with patient + doctor + wa_session phone
    const { data: appt, error } = await db
      .from('appointments')
      .select(`
        id, scheduled_at, type,
        patient:patients(id, name, phone),
        doctor:doctors(name, specialty)
      `)
      .eq('id', appointmentId)
      .single()

    if (error || !appt) {
      return NextResponse.json({ error: 'Consulta não encontrada' }, { status: 404 })
    }

    // Get patient phone: prefer wa_session phone (matches WhatsApp), fallback to patients.phone
    const patientId = (appt.patient as { id: string; name: string; phone: string | null } | null)?.id
    let phone: string | null = (appt.patient as { phone: string | null } | null)?.phone ?? null

    if (patientId) {
      const { data: session } = await db
        .from('wa_sessions')
        .select('phone')
        .eq('patient_id', patientId)
        .limit(1)
        .single()
      if (session?.phone) phone = session.phone
    }

    if (!phone) {
      return NextResponse.json({ ok: false, reason: 'Paciente sem telefone cadastrado no WhatsApp' })
    }

    const patientName = (appt.patient as { name: string } | null)?.name ?? 'Paciente'
    const doctorName  = (appt.doctor as { name: string } | null)?.name ?? 'Médico'
    const specialty   = (appt.doctor as { specialty: string } | null)?.specialty ?? ''
    const dateStr     = formatDate(appt.scheduled_at)

    let message = ''

    if (type === 'cancel') {
      const byClinic  = !cancelledBy || cancelledBy === 'clinic'
      const reasonStr = reason ? `\n*Motivo:* ${reason}` : ''

      if (byClinic) {
        message =
          `Olá, *${patientName}*! 😔\n\n` +
          `Informamos que sua consulta com *${doctorName}* (${specialty}) ` +
          `agendada para *${dateStr}* precisou ser cancelada pela clínica.${reasonStr}\n\n` +
          `Pedimos desculpas pelo transtorno. 🏥\n\n` +
          `Deseja *remarcar* para um novo horário?\n\n` +
          `Responda *SIM* para agendar ou *NÃO* se não precisar.`
      } else {
        message =
          `Olá, *${patientName}*!\n\n` +
          `Confirmamos o cancelamento da sua consulta com *${doctorName}* (${specialty}) ` +
          `agendada para *${dateStr}*.${reasonStr}\n\n` +
          `Deseja *remarcar* para outro horário?\n\n` +
          `Responda *SIM* para agendar ou *NÃO* se não precisar. — Clínica São Lucas 🏥`
      }
    } else {
      return NextResponse.json({ error: `Tipo de notificação desconhecido: ${type}` }, { status: 400 })
    }

    // Send WhatsApp
    const waResult = await sendWhatsApp(phone, message)

    // Store outbound message in wa_messages if there's a session
    if (patientId) {
      const { data: session } = await db
        .from('wa_sessions')
        .select('id')
        .eq('patient_id', patientId)
        .limit(1)
        .single()

      if (session?.id) {
        await db.from('wa_messages').insert({
          session_id: session.id,
          direction: 'outbound',
          body: message,
          status: 'sent',
        })
      }
    }

    // Audit log
    await db.from('audit_log').insert({
      actor_type: 'agent',
      actor_id:   'sistema-notificacoes',
      action:     `whatsapp_notify_${type}`,
      record_type: 'appointment',
      record_id:   appointmentId,
    })

    return NextResponse.json({ ok: true, phone, waResult })
  } catch (err) {
    console.error('[appointments/notify] error:', err)
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 })
  }
}
