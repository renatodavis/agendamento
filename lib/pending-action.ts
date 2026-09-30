import type { SupabaseClient } from '@supabase/supabase-js'
import { getClinicBasicConfig, capitalize, artigo, fmtSlot } from '@/lib/clinic-config-server'

// Uma única pergunta SIM/NÃO em aberto por sessão. Quem pergunta por último define a ação;
// a resposta do cliente é resolvida aqui, em código — nunca pelo modelo.

export type PendingBook = {
  kind: 'book'
  patient_id: string
  doctor_id: string
  scheduled_at: string
  status: 'agendada' | 'lista_espera'
  convenio?: string | null
  approval_id?: string | null
}

export type PendingReminder = {
  kind: 'reminder'
  appointment_ids: string[]
}

type PendingAction = (PendingBook | PendingReminder) & { created_at: string; expires_at: string }

export const PENDING_TTL = {
  book: 30 * 60 * 1000,
  approval: 24 * 60 * 60 * 1000,
  reminder: 26 * 60 * 60 * 1000,
}

const YES_RE = /^(sim|s|yes|1|confirmo|confirmar|confirmado|ok|pode ser|pode|isso|claro|vou|estarei|comparecerei)[\s.!]*$/i
const NO_RE  = /^(n[aã]o|n|no|2|cancelar|desmarcar|n[aã]o posso|n[aã]o vou)[\s.!]*$/i

export async function setPendingAction(
  db: SupabaseClient,
  sessionId: string,
  action: PendingBook | PendingReminder,
  ttlMs: number,
) {
  const now = Date.now()
  const value: PendingAction = {
    ...action,
    created_at: new Date(now).toISOString(),
    expires_at: new Date(now + ttlMs).toISOString(),
  }
  await db.from('wa_sessions').update({ pending_action: value }).eq('id', sessionId)
}

/**
 * Resolve a resposta do cliente à pergunta em aberto.
 * Retorna o texto a enviar ao cliente, ou null para seguir para o modelo
 * (sem pendência, resposta ambígua, ou NÃO a uma proposta — o modelo oferece alternativas).
 */
export async function resolvePendingReply(db: SupabaseClient, sessionId: string, text: string): Promise<string | null> {
  const { data: session } = await db.from('wa_sessions').select('pending_action').eq('id', sessionId).single()
  const pa = session?.pending_action as PendingAction | null
  if (!pa) return null

  if (new Date(pa.expires_at).getTime() < Date.now()) {
    await db.from('wa_sessions').update({ pending_action: null }).eq('id', sessionId)
    return null
  }

  const trimmed = text.trim()
  const isYes = YES_RE.test(trimmed)
  const isNo  = !isYes && NO_RE.test(trimmed)
  if (!isYes && !isNo) return null

  // Consome a pendência de forma atômica — uma retentativa concorrente não processa duas vezes
  const { data: claimed } = await db.from('wa_sessions')
    .update({ pending_action: null })
    .eq('id', sessionId)
    .eq('pending_action->>created_at', pa.created_at)
    .select('id')
  if (!claimed?.length) return null

  if (pa.kind === 'book') {
    if (isYes) return confirmBooking(db, sessionId, pa)
    if (pa.approval_id) {
      await db.from('approval_requests')
        .update({ status: 'rejected', rejection_reason: 'Cliente recusou o horário sugerido' })
        .eq('id', pa.approval_id)
    }
    return null
  }

  return isYes ? confirmReminder(db, sessionId, pa) : cancelFromReminder(db, sessionId, pa)
}

async function confirmBooking(db: SupabaseClient, sessionId: string, pa: PendingBook): Promise<string> {
  const { clinicName, vocabulary: voc } = await getClinicBasicConfig()

  const { data: appt, error } = await db.from('appointments').insert({
    patient_id: pa.patient_id,
    doctor_id: pa.doctor_id,
    scheduled_at: pa.scheduled_at,
    status: pa.status,
    type: capitalize(voc.appointment),
  }).select('id, doctor:doctors(name, specialty)').single()

  if (error) {
    if (error.code === '23505') {
      return `Poxa, esse horário acabou de ser ocupado. 😕 Quer que eu veja outros horários disponíveis?`
    }
    console.error('[pending-action] falha ao criar agendamento:', error)
    return `Não consegui concluir o agendamento agora. Pode tentar novamente em instantes?`
  }

  if (pa.convenio) await db.from('patients').update({ convenio: pa.convenio }).eq('id', pa.patient_id)
  if (pa.approval_id) {
    await db.from('approval_requests').update({ status: 'confirmed' }).eq('id', pa.approval_id)
  }
  await db.from('audit_log').insert({
    actor_type: 'user', actor_id: sessionId,
    action: pa.status === 'lista_espera' ? 'waitlist_confirmed' : 'appointment_confirmed_by_patient',
    record_type: 'appointment', record_id: appt.id,
  })

  const doc = appt.doctor as unknown as { name: string; specialty: string } | null
  const { date, time } = fmtSlot(pa.scheduled_at)
  const docLine = doc ? `👤 ${doc.name} — ${doc.specialty}\n\n` : '\n'

  if (pa.status === 'lista_espera') {
    return `✅ *Você entrou na fila de espera!*\n\n📅 ${date} às ${time}\n${docLine}` +
      `Avisaremos se o horário liberar. — ${clinicName} ${voc.emoji}`
  }
  return `✅ *${capitalize(voc.appointment)} confirmad${artigo(voc.appointment)}!*\n\n📅 ${date} às *${time}*\n${docLine}` +
    `${clinicName} ${voc.emoji}\nQualquer dúvida, estamos à disposição!`
}

async function confirmReminder(db: SupabaseClient, sessionId: string, pa: PendingReminder): Promise<string> {
  const { clinicName, vocabulary: voc } = await getClinicBasicConfig()
  const { data: appts } = await db.from('appointments')
    .update({ status: 'confirmada' })
    .in('id', pa.appointment_ids)
    .in('status', ['agendada', 'confirmada'])
    .select('id, scheduled_at, doctor:doctors(name, specialty)')
    .order('scheduled_at')

  if (!appts?.length) return `Não encontrei esse agendamento ativo. Posso ajudar com algo mais?`

  await db.from('audit_log').insert(appts.map(a => ({
    actor_type: 'user', actor_id: sessionId,
    action: 'appointment_confirmed_by_patient', record_type: 'appointment', record_id: a.id,
  })))
  const lines = appts.map(a => {
    const doc = a.doctor as unknown as { name: string; specialty: string } | null
    const { date, time } = fmtSlot(a.scheduled_at)
    return `📅 ${date} às *${time}*` + (doc ? `\n👤 ${doc.name} — ${doc.specialty}` : '')
  }).join('\n\n')
  return `✅ *Presença confirmada!*\n\n${lines}\n\nTe esperamos! — ${clinicName} ${voc.emoji}`
}

async function cancelFromReminder(db: SupabaseClient, sessionId: string, pa: PendingReminder): Promise<string> {
  const { clinicName, vocabulary: voc } = await getClinicBasicConfig()
  const { data: appts } = await db.from('appointments')
    .select('id, scheduled_at, patient_id, doctor_id, patient:patients(name), doctor:doctors(name, specialty)')
    .in('id', pa.appointment_ids)
    .in('status', ['agendada', 'confirmada'])

  for (const appt of appts ?? []) {
    const { data: existing } = await db.from('approval_requests')
      .select('id').eq('session_id', sessionId).eq('request_type', 'cancelamento').eq('status', 'pending')
      .eq('details->>appointment_id', appt.id)
      .limit(1).maybeSingle()
    if (existing) continue

    const doc = appt.doctor as unknown as { name: string; specialty: string } | null
    const patient = appt.patient as unknown as { name: string } | null
    const { date, time } = fmtSlot(appt.scheduled_at)
    await db.from('approval_requests').insert({
      session_id: sessionId,
      patient_id: appt.patient_id,
      patient_name: patient?.name ?? null,
      doctor_id: appt.doctor_id,
      request_type: 'cancelamento',
      status: 'pending',
      message_to_receptionist: `Respondeu NÃO ao lembrete. ${capitalize(voc.appointment)}: ${date} às ${time} — ${doc?.specialty ?? ''}`,
      details: { appointment_id: appt.id, scheduled_at: appt.scheduled_at, doctor_name: doc?.name, doctor_specialty: doc?.specialty },
    })
  }

  return `Entendido! Sua solicitação de cancelamento foi registrada. 📋\n\n` +
    `Nossa equipe entrará em contato para confirmar. — ${clinicName} ${voc.emoji}`
}
