import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase'
import { getClinicBasicConfig, capitalize, artigo, fmtSlot } from '@/lib/clinic-config-server'
import { setPendingAction, PENDING_TTL } from '@/lib/pending-action'
import { sendAndLog, sendWhatsAppTemplate, isWithinServiceWindow } from '@/lib/whatsapp'

const CRON_SECRET = process.env.CRON_SECRET
// Template aprovado na Meta, usado fora da janela de 24h. Corpo esperado com 3 variáveis:
// {{1}} nome do cliente · {{2}} data · {{3}} horário(s) e profissional(is)
const REMINDER_TEMPLATE      = process.env.WHATSAPP_REMINDER_TEMPLATE
const REMINDER_TEMPLATE_LANG = process.env.WHATSAPP_REMINDER_TEMPLATE_LANG ?? 'pt_BR'

type Session = { id: string; phone: string | null; last_inbound_at: string | null; opt_out_at: string | null; lgpd_consent_at: string | null }
type Appt = {
  id: string
  scheduled_at: string
  doctor: { name: string; specialty: string } | null
  patient: { name: string; sessions: Session[] } | null
}

// Roda uma vez por dia (vercel.json) e lembra todos os agendamentos de amanhã (horário de Brasília).
// reminder_sent_at impede lembrete duplicado se a rotina rodar mais de uma vez.
export async function GET(req: NextRequest) {
  // Sem CRON_SECRET a rota fica fechada: qualquer um poderia disparar lembretes.
  if (!CRON_SECRET || req.headers.get('authorization') !== `Bearer ${CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const db = createServerClient()
  const { clinicName, vocabulary: voc } = await getClinicBasicConfig()

  // Horários são gravados como hora de Brasília marcada em UTC
  const tomorrowBrt = new Date(Date.now() - 3 * 60 * 60 * 1000)
  tomorrowBrt.setUTCDate(tomorrowBrt.getUTCDate() + 1)
  const day = tomorrowBrt.toISOString().slice(0, 10)

  const { data, error } = await db
    .from('appointments')
    .select(`
      id, scheduled_at,
      doctor:doctors(name, specialty),
      patient:patients(name, sessions:wa_sessions(id, phone, last_inbound_at, opt_out_at, lgpd_consent_at))
    `)
    .in('status', ['agendada', 'confirmada'])
    .is('reminder_sent_at', null)
    .gte('scheduled_at', `${day}T00:00:00Z`)
    .lte('scheduled_at', `${day}T23:59:59.999Z`)
    .order('scheduled_at', { ascending: true })

  if (error) {
    console.error('[remind] erro ao buscar agendamentos:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  // Um lembrete por cliente, mesmo com vários agendamentos no dia — um único SIM/NÃO responde todos
  const bySession = new Map<string, { session: Session; name: string | null; appts: Appt[] }>()
  let semWhatsApp = 0
  for (const appt of (data ?? []) as unknown as Appt[]) {
    const session = appt.patient?.sessions?.find(s => s.phone && !s.opt_out_at && s.lgpd_consent_at)
    if (!session) { semWhatsApp++; continue }
    const group = bySession.get(session.id) ?? { session, name: appt.patient?.name ?? null, appts: [] }
    group.appts.push(appt)
    bySession.set(session.id, group)
  }

  const a = artigo(voc.appointment)
  let sent = 0, failed = 0, foraDaJanela = 0

  for (const { session, name, appts } of bySession.values()) {
    const clientName = name ?? capitalize(voc.client)
    const date = fmtSlot(appts[0].scheduled_at).date
    const details = appts.map(ap => {
      const time = fmtSlot(ap.scheduled_at).time
      return ap.doctor ? `${time} com ${ap.doctor.name} (${ap.doctor.specialty})` : time
    })
    const plural = appts.length > 1

    const text =
      `${voc.emoji} *${clinicName} — Lembrete*\n\n` +
      `Olá, *${clientName}*! ${plural ? `Seus agendamentos estão marcados` : `${a === 'a' ? 'Sua' : 'Seu'} ${voc.appointment} está marcad${a}`} para *amanhã*, ${date}:\n\n` +
      details.map(d => `📅 ${d}`).join('\n') + `\n\n` +
      `Você confirma a presença?\nResponda *SIM* para confirmar ou *NÃO* para cancelar.`

    let result: { ok: boolean }
    if (isWithinServiceWindow(session.last_inbound_at)) {
      result = await sendAndLog(db, { id: session.id, phone: session.phone! }, text)
    } else if (REMINDER_TEMPLATE) {
      result = await sendWhatsAppTemplate(session.phone!, REMINDER_TEMPLATE, REMINDER_TEMPLATE_LANG, [clientName, date, details.join(' e ')])
      // Registra o texto equivalente para o assistente ter contexto da próxima resposta
      await db.from('wa_messages').insert({ session_id: session.id, direction: 'outbound', body: text, status: result.ok ? 'sent' : 'failed' })
    } else {
      foraDaJanela++
      continue
    }

    if (!result.ok) { failed++; continue }

    const ids = appts.map(ap => ap.id)
    await Promise.all([
      db.from('appointments').update({ reminder_sent_at: new Date().toISOString() }).in('id', ids),
      setPendingAction(db, session.id, { kind: 'reminder', appointment_ids: ids }, PENDING_TTL.reminder),
      db.from('audit_log').insert(ids.map(id => ({
        actor_type: 'system', actor_id: 'reminder-cron', action: 'reminder_sent', record_type: 'appointment', record_id: id,
      }))),
    ])
    sent++
  }

  const summary = { ok: true, dia: day, clientes_lembrados: sent, falhas: failed, fora_da_janela_24h_sem_template: foraDaJanela, sem_whatsapp_ou_consentimento: semWhatsApp }
  console.log('[remind]', summary)
  return NextResponse.json(summary)
}
