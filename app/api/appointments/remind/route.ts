import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase'

const WA_TOKEN    = process.env.WHATSAPP_API_TOKEN
const WA_PHONE_ID = process.env.WHATSAPP_PHONE_NUMBER_ID
const CRON_SECRET = process.env.CRON_SECRET

// Janela: consultas entre 23h e 25h a partir de agora
const WINDOW_MIN_H = 23
const WINDOW_MAX_H = 25

export async function GET(req: NextRequest) {
  // Protege o endpoint com segredo para evitar chamadas não autorizadas
  const auth = req.headers.get('authorization')
  if (CRON_SECRET && auth !== `Bearer ${CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const db = createServerClient()
  const now = Date.now()
  const windowStart = new Date(now + WINDOW_MIN_H * 60 * 60 * 1000).toISOString()
  const windowEnd   = new Date(now + WINDOW_MAX_H * 60 * 60 * 1000).toISOString()

  const { data: appointments, error } = await db
    .from('appointments')
    .select(`
      id, scheduled_at,
      doctor:doctors(name, specialty),
      patient:patients(name),
      session:wa_sessions!inner(id, phone, patient_id)
    `)
    .in('status', ['agendada', 'confirmada'])
    .is('reminder_sent_at', null)
    .gte('scheduled_at', windowStart)
    .lte('scheduled_at', windowEnd)

  if (error) {
    console.error('[remind] erro ao buscar consultas:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  let sent = 0
  let failed = 0

  for (const appt of appointments ?? []) {
    const session = appt.session as unknown as { id: string; phone: string; patient_id: string | null } | null
    const doctor  = appt.doctor  as unknown as { name: string; specialty: string } | null
    const patient = appt.patient as unknown as { name: string } | null

    if (!session?.phone) continue

    const d = new Date(appt.scheduled_at)
    const dateStr = d.toLocaleDateString('pt-BR', {
      weekday: 'long', day: '2-digit', month: 'long', year: 'numeric', timeZone: 'UTC',
    })
    const timeStr = d.toLocaleTimeString('pt-BR', {
      hour: '2-digit', minute: '2-digit', timeZone: 'UTC',
    })
    const patientName = patient?.name ?? 'Paciente'

    const msg =
      `🏥 *Clínica São Lucas — Lembrete de Consulta*\n\n` +
      `Olá, *${patientName}*! Sua consulta está marcada para *amanhã*:\n\n` +
      `📅 ${dateStr} às *${timeStr}*\n` +
      `👨‍⚕️ ${doctor?.name ?? ''} — ${doctor?.specialty ?? ''}\n\n` +
      `Você confirma a presença?\n` +
      `Responda *SIM* para confirmar ou *NÃO* para cancelar.`

    if (!WA_TOKEN || !WA_PHONE_ID) {
      console.warn('[remind] WhatsApp não configurado — pulando envio')
      break
    }

    const waRes = await fetch(`https://graph.facebook.com/v19.0/${WA_PHONE_ID}/messages`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${WA_TOKEN}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        messaging_product: 'whatsapp',
        to: session.phone,
        type: 'text',
        text: { body: msg },
      }),
    })

    if (!waRes.ok) {
      const errBody = await waRes.text().catch(() => '')
      console.error('[remind] falha ao enviar lembrete para', session.phone, waRes.status, errBody)
      failed++
      continue
    }

    // Marca lembrete como enviado e registra a mensagem
    await Promise.all([
      db.from('appointments').update({ reminder_sent_at: new Date().toISOString() }).eq('id', appt.id),
      db.from('wa_messages').insert({
        session_id: session.id, direction: 'outbound', body: msg, status: 'sent',
      }),
      db.from('audit_log').insert({
        actor_type: 'system', actor_id: 'reminder-cron',
        action: 'reminder_sent', record_type: 'appointment', record_id: appt.id,
      }),
    ])
    sent++
  }

  console.log(`[remind] lembretes enviados: ${sent}, falhas: ${failed}`)
  return NextResponse.json({ ok: true, sent, failed })
}
