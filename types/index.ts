export type AppointmentStatus = 'agendada' | 'confirmada' | 'pendente' | 'atendida' | 'cancelada' | 'lista_espera'

export type HistoryKind = 'schedule' | 'confirm' | 'attend' | 'cancel' | 'reschedule' | 'waitlist'

export interface Patient {
  id: string
  name: string
  phone: string
  cpf_hash?: string
  convenio: string
  photo_emoji: string
  lgpd_consent_at?: string
  created_at: string
}

export interface Doctor {
  id: string
  name: string
  specialty: string
  crm: string
}

export interface AppointmentHistory {
  id: string
  appointment_id: string
  event: string
  kind: HistoryKind
  actor: string
  created_at: string
}

export interface Appointment {
  id: string
  patient_id: string
  doctor_id: string
  scheduled_at: string // ISO datetime
  status: AppointmentStatus
  type: string
  cancel_reason?: string
  created_at: string
  updated_at: string
  // Joined
  patient?: Patient
  doctor?: Doctor
  history?: AppointmentHistory[]
}

export interface WaSession {
  id: string
  patient_id: string
  phone: string
  last_inbound_at: string
  opt_in: boolean
  opt_out_at?: string
}

export interface WaMessage {
  id: string
  session_id: string
  direction: 'inbound' | 'outbound'
  template_id?: string
  body: string
  status: 'sent' | 'delivered' | 'read' | 'failed'
  sent_at: string
}

export interface AuditLog {
  id: string
  actor_type: 'agent' | 'user' | 'system'
  actor_id: string
  action: string
  record_type: string
  record_id: string
  created_at: string
}
