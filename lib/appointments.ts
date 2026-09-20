import { supabase } from './supabase'
import type { Appointment, AppointmentStatus, HistoryKind } from '@/types'

export async function getAppointmentsByDay(date: Date): Promise<Appointment[]> {
  const start = new Date(date)
  start.setHours(0, 0, 0, 0)
  const end = new Date(date)
  end.setHours(23, 59, 59, 999)

  const { data, error } = await supabase
    .from('appointments')
    .select(`
      *,
      patient:patients(*),
      doctor:doctors(*),
      history:appointment_history(*)
    `)
    .gte('scheduled_at', start.toISOString())
    .lte('scheduled_at', end.toISOString())
    .order('scheduled_at', { ascending: true })

  if (error) throw error
  return data ?? []
}

export async function updateAppointmentStatus(
  id: string,
  status: AppointmentStatus,
  opts?: { cancelReason?: string }
) {
  const { error } = await supabase
    .from('appointments')
    .update({ status, cancel_reason: opts?.cancelReason ?? null })
    .eq('id', id)

  if (error) throw error
}

export async function addAppointmentHistory(
  appointmentId: string,
  event: string,
  kind: HistoryKind,
  actor = 'system'
) {
  const { error } = await supabase
    .from('appointment_history')
    .insert({ appointment_id: appointmentId, event, kind, actor })

  if (error) throw error
}

export async function createAppointment(data: {
  patientId: string
  doctorId: string
  scheduledAt: string
  type: string
  status?: AppointmentStatus
}): Promise<Appointment> {
  const { data: appt, error } = await supabase
    .from('appointments')
    .insert({
      patient_id: data.patientId,
      doctor_id: data.doctorId,
      scheduled_at: data.scheduledAt,
      type: data.type,
      status: data.status ?? 'agendada',
    })
    .select()
    .single()

  if (error) throw error
  return appt
}
