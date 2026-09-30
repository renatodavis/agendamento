import { createServerClient } from '@/lib/supabase'
import { getClinicBasicConfig, capitalize } from '@/lib/clinic-config-server'

const CANCEL_RE     = /\b(cancelar|cancelamento|desmarcar|cancela)\b/i
const RESCHEDULE_RE = /\b(remarcar|remarca[çc][aã]o|alterar\s+(o\s+)?hor[aá]rio|mudar\s+(o\s+)?hor[aá]rio|mudar\s+(a\s+)?data|trocar\s+(o\s+)?hor[aá]rio)\b/i
const ATTENDANT_RE  = /\b(atendente|recepcionista|atendimento\s+humano|falar\s+com\s+(um|uma|a|o)?\s*(pessoa|humano|algu[eé]m|recep[çc][aã]o))\b/i
const NEGATION_RE   = /\bn[aã]o\s+(quero\s+|vou\s+|preciso\s+|precisa\s+|pretendo\s+|quis\s+)?(cancelar|desmarcar|remarcar|falar)/i

export type EscalationType = 'cancelamento' | 'alteracao_horario' | 'atendente'

function detectType(text: string): EscalationType | null {
  if (NEGATION_RE.test(text))   return null
  if (CANCEL_RE.test(text))     return 'cancelamento'
  if (RESCHEDULE_RE.test(text)) return 'alteracao_horario'
  if (ATTENDANT_RE.test(text))  return 'atendente'
  return null
}

/**
 * Cria um approval_request ANTES de chamar o modelo, garantindo que a recepção
 * veja a solicitação independentemente do comportamento do modelo.
 * O modelo depois complementa a mesma solicitação (appointment_id, novo horário).
 */
export async function maybeCreateApprovalIntercept(opts: { text: string; sessionId: string }): Promise<void> {
  const { text, sessionId } = opts
  if (!text) return

  const reqType = detectType(text)
  if (!reqType) return

  const db = createServerClient()

  const { count: pendingCount } = await db
    .from('approval_requests')
    .select('*', { count: 'exact', head: true })
    .eq('session_id', sessionId)
    .eq('request_type', reqType)
    .eq('status', 'pending')
  if ((pendingCount ?? 0) > 0) return

  const { data: sess } = await db.from('wa_sessions').select('patient_id, name, phone').eq('id', sessionId).single()
  const patientId = sess?.patient_id ?? null

  let patientName: string | null = sess?.name ?? sess?.phone ?? null
  if (patientId) {
    const { data: p } = await db.from('patients').select('name').eq('id', patientId).single()
    if (p?.name) patientName = p.name
  }
  if (!patientName) {
    const { vocabulary } = await getClinicBasicConfig()
    patientName = capitalize(vocabulary.client)
  }

  let apptDetails: Record<string, unknown> | null = null
  let doctorId: string | null = null
  if (patientId) {
    const { data: appts } = await db
      .from('appointments')
      .select('id, scheduled_at, status, doctor:doctors(id, name, specialty)')
      .eq('patient_id', patientId)
      .not('status', 'in', '("cancelada","lista_espera")')
      .gte('scheduled_at', new Date().toISOString())
      .order('scheduled_at', { ascending: true })
      .limit(1)
    const appt = appts?.[0]
    if (appt) {
      const doc = appt.doctor as unknown as { id: string; name: string; specialty: string } | null
      doctorId = doc?.id ?? null
      apptDetails = {
        appointment_id:   appt.id,
        scheduled_at:     appt.scheduled_at,
        doctor_name:      doc?.name,
        doctor_specialty: doc?.specialty,
      }
    }
  }

  const { data: created } = await db.from('approval_requests').insert({
    session_id:              sessionId,
    patient_id:              patientId,
    patient_name:            patientName,
    doctor_id:               doctorId,
    request_type:            reqType,
    status:                  'pending',
    message_to_receptionist: text,
    details:                 apptDetails,
  }).select('id').single()

  if (created?.id) {
    await db.from('audit_log').insert({
      actor_type: 'system', actor_id: 'approval-intercept', action: 'approval_request_created',
      record_type: 'approval_request', record_id: created.id,
    })
  }
}
