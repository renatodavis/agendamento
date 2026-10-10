import { NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase'
import { requireAuth } from '@/lib/auth'

const BRT_OFFSET_MS = 3 * 60 * 60 * 1000

export async function GET() {
  const auth = await requireAuth()
  if (auth instanceof NextResponse) return auth

  const db = createServerClient()

  const nowBrt = new Date(Date.now() - BRT_OFFSET_MS)
  const todayStr = nowBrt.toISOString().slice(0, 10)

  const tomorrowBrt = new Date(nowBrt)
  tomorrowBrt.setUTCDate(tomorrowBrt.getUTCDate() + 1)
  const tomorrowStr = tomorrowBrt.toISOString().slice(0, 10)

  const fields = `
    id, scheduled_at, status, type, reminder_sent_at,
    patient:patients(name, phone),
    doctor:doctors(name, specialty)
  `

  const [sentRes, pendingRes, confirmedRes] = await Promise.all([
    db
      .from('appointments')
      .select(fields)
      .not('reminder_sent_at', 'is', null)
      .gte('scheduled_at', `${todayStr}T00:00:00Z`)
      .lte('scheduled_at', `${tomorrowStr}T23:59:59.999Z`)
      .order('scheduled_at', { ascending: true }),

    db
      .from('appointments')
      .select(fields)
      .in('status', ['agendada', 'confirmada'])
      .is('reminder_sent_at', null)
      .gte('scheduled_at', `${tomorrowStr}T00:00:00Z`)
      .lte('scheduled_at', `${tomorrowStr}T23:59:59.999Z`)
      .order('scheduled_at', { ascending: true }),

    db
      .from('audit_log')
      .select('record_id, created_at')
      .eq('action', 'reminder_sent')
      .gte('created_at', `${todayStr}T00:00:00Z`)
      .order('created_at', { ascending: false }),
  ])

  if (sentRes.error || pendingRes.error) {
    return NextResponse.json({ error: sentRes.error?.message ?? pendingRes.error?.message }, { status: 500 })
  }

  const sentIds = new Set((confirmedRes.data ?? []).map((r: { record_id: string }) => r.record_id))

  function mapRow(r: Record<string, unknown>) {
    const patient = Array.isArray(r.patient) ? r.patient[0] : r.patient
    const doctor = Array.isArray(r.doctor) ? r.doctor[0] : r.doctor
    return {
      id: r.id as string,
      scheduledAt: r.scheduled_at as string,
      status: r.status as string,
      type: r.type as string,
      reminderSentAt: r.reminder_sent_at as string | null,
      patientName: (patient as { name?: string } | null)?.name ?? '—',
      patientPhone: (patient as { phone?: string } | null)?.phone ?? '',
      doctorName: (doctor as { name?: string } | null)?.name ?? '—',
      doctorSpecialty: (doctor as { specialty?: string } | null)?.specialty ?? '',
    }
  }

  const sentRows = (sentRes.data ?? []) as Record<string, unknown>[]
  const pendingRows = (pendingRes.data ?? []) as Record<string, unknown>[]

  return NextResponse.json({
    today: todayStr,
    tomorrow: tomorrowStr,
    sent: sentRows.map(mapRow),
    pending: pendingRows.map(mapRow),
    sentCount: sentRows.length,
    pendingCount: pendingRows.length,
  })
}
