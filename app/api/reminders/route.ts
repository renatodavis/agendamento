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

  type Row = {
    id: string; scheduled_at: string; status: string; type: string; reminder_sent_at: string | null;
    patient: { name: string; phone: string } | null;
    doctor: { name: string; specialty: string } | null;
  }

  function mapRow(r: Row) {
    return {
      id: r.id,
      scheduledAt: r.scheduled_at,
      status: r.status,
      type: r.type,
      reminderSentAt: r.reminder_sent_at,
      patientName: r.patient?.name ?? '—',
      patientPhone: r.patient?.phone ?? '',
      doctorName: r.doctor?.name ?? '—',
      doctorSpecialty: r.doctor?.specialty ?? '',
    }
  }

  return NextResponse.json({
    today: todayStr,
    tomorrow: tomorrowStr,
    sent: ((sentRes.data ?? []) as Row[]).map(mapRow),
    pending: ((pendingRes.data ?? []) as Row[]).map(mapRow),
    sentCount: sentRes.data?.length ?? 0,
    pendingCount: pendingRes.data?.length ?? 0,
  })
}
