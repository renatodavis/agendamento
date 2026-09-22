'use client'
import { useState, useEffect, useCallback } from 'react'
import { supabase } from './supabase'
import type { Appointment, AppointmentStatus } from '@/types'

function dayBounds(offsetFromToday: number) {
  const d = new Date()
  d.setDate(d.getDate() + offsetFromToday)
  const start = new Date(d); start.setHours(0, 0, 0, 0)
  const end   = new Date(d); end.setHours(23, 59, 59, 999)
  return { start: start.toISOString(), end: end.toISOString() }
}

export function useAppointments(dayOffset: number) {
  const [appointments, setAppointments] = useState<Appointment[]>([])
  const [loading, setLoading]           = useState(true)
  const [error, setError]               = useState<string | null>(null)

  const fetch = useCallback(async () => {
    setLoading(true); setError(null)
    const { start, end } = dayBounds(dayOffset)
    const { data, error } = await supabase
      .from('appointments')
      .select(`
        *,
        patient:patients(*),
        doctor:doctors(*),
        history:appointment_history!appointment_id(*)
      `)
      .gte('scheduled_at', start)
      .lte('scheduled_at', end)
      .order('scheduled_at', { ascending: true })

    if (error) { setError(error.message); setLoading(false); return }
    setAppointments(data ?? [])
    setLoading(false)
  }, [dayOffset])

  useEffect(() => { fetch() }, [fetch])

  // Supabase Realtime: live appointment updates
  useEffect(() => {
    const { start, end } = dayBounds(dayOffset)
    const channel = supabase
      .channel(`appointments-day-${dayOffset}`)
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'appointments',
        filter: `scheduled_at=gte.${start}`,
      }, () => fetch())
      .subscribe()

    return () => { supabase.removeChannel(channel) }
  }, [dayOffset, fetch])

  const updateStatus = useCallback(async (
    id: string,
    status: AppointmentStatus,
    opts?: { cancelReason?: string; event: string; kind: string }
  ) => {
    const { error } = await supabase
      .from('appointments')
      .update({ status, cancel_reason: opts?.cancelReason ?? null })
      .eq('id', id)
    if (error) throw error

    if (opts?.event) {
      await supabase.from('appointment_history').insert({
        appointment_id: id,
        event: opts.event,
        kind: opts.kind,
        actor: 'recepcionista',
      })
    }
    await fetch()
  }, [fetch])

  const createAppointment = useCallback(async (data: {
    patientId: string
    doctorId: string
    scheduledAt: string
    type: string
  }) => {
    const { data: appt, error } = await supabase
      .from('appointments')
      .insert({
        patient_id: data.patientId,
        doctor_id: data.doctorId,
        scheduled_at: data.scheduledAt,
        type: data.type,
        status: 'confirmada',
      })
      .select()
      .single()
    if (error) throw error

    await supabase.from('appointment_history').insert({
      appointment_id: appt.id,
      event: 'Agendado via sistema',
      kind: 'schedule',
      actor: 'sistema',
    })
    await fetch()
    return appt
  }, [fetch])

  return { appointments, loading, error, refetch: fetch, updateStatus, createAppointment }
}
