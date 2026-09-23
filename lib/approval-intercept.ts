import { createServerClient } from '@/lib/supabase'

const CANCEL_RE     = /\b(cancelar|cancelamento|desmarcar|cancela)\b/i
const RESCHEDULE_RE = /\b(remarcar|remarca[çc][aã]o|alterar\s+hor[aá]rio|mudar\s+hor[aá]rio|mudar\s+data|trocar\s+hor[aá]rio)\b/i
const ATTENDANT_RE  = /\b(atendente|recepcionista|recep[çc][aã]o|humano|pessoa|falar\s+com\s+algu[eé]m|quero\s+ser\s+atendido|falar\s+com\s+atendente|falar\s+com\s+recepcionista)\b/i

export type EscalationType = 'cancelamento' | 'alteracao_horario' | 'atendente'

function detectType(text: string): EscalationType | null {
  if (CANCEL_RE.test(text))     return 'cancelamento'
  if (RESCHEDULE_RE.test(text)) return 'alteracao_horario'
  if (ATTENDANT_RE.test(text))  return 'atendente'
  return null
}

/**
 * Cria um approval_request ANTES de chamar o AI, garantindo que a recepção
 * sempre veja a solicitação no painel, independente do comportamento do modelo.
 * Usa janela de dedup de 2 minutos para evitar duplicatas.
 */
export async function maybeCreateApprovalIntercept(opts: {
  text: string
  sessionId: string | undefined
  contactName?: string | null
  phone?: string | null
}): Promise<void> {
  const { text, sessionId, contactName, phone } = opts
  if (!sessionId || !text) return

  const reqType = detectType(text)
  if (!reqType) return

  const db = createServerClient()

  const recentCutoff = new Date(Date.now() - 2 * 60 * 1000).toISOString()
  const { count: recentCount } = await db
    .from('approval_requests')
    .select('*', { count: 'exact', head: true })
    .eq('session_id', sessionId)
    .eq('request_type', reqType)
    .eq('status', 'pending')
    .gte('created_at', recentCutoff)

  if ((recentCount ?? 0) > 0) return

  const { data: sessData } = await db
    .from('wa_sessions')
    .select('patient_id')
    .eq('id', sessionId)
    .single()
  const patientId = sessData?.patient_id ?? null

  let patientName = contactName ?? phone ?? 'Paciente'
  if (patientId) {
    const { data: p } = await db.from('patients').select('name').eq('id', patientId).single()
    if (p?.name) patientName = p.name
  }

  let apptDetails: Record<string, unknown> | null = null
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
      apptDetails = {
        appointment_id:   appt.id,
        scheduled_at:     appt.scheduled_at,
        doctor_name:      doc?.name,
        doctor_specialty: doc?.specialty,
      }
    }
  }

  await db.from('approval_requests').insert({
    session_id:              sessionId,
    patient_id:              patientId,
    patient_name:            patientName,
    request_type:            reqType,
    status:                  'pending',
    message_to_receptionist: text,
    details:                 apptDetails,
  })
  console.log(`[approval-intercept] approval_request "${reqType}" criado para sessão ${sessionId}`)
}
