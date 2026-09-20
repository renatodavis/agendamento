import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase'

const DAY_NAMES = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb']

type ScheduleRow = {
  id: string
  doctor_id: string
  day_of_week: number
  start_time: string
  end_time: string
  slot_minutes: number
}

type DoctorWithSchedules = {
  id: string
  name: string
  specialty: string
  schedules: ScheduleRow[]
}

// GET /api/doctor-schedules — list all doctors with their schedules
export async function GET() {
  const db = createServerClient()
  const { data: doctors, error } = await db
    .from('doctors')
    .select('id, name, specialty')
    .order('specialty')

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  const { data: schedules } = await db
    .from('doctor_schedules')
    .select('id, doctor_id, day_of_week, start_time, end_time, slot_minutes')

  const result: DoctorWithSchedules[] = (doctors ?? []).map(doc => ({
    ...doc,
    schedules: (schedules ?? [])
      .filter(s => s.doctor_id === doc.id)
      .sort((a, b) => a.day_of_week - b.day_of_week),
  }))

  return NextResponse.json(result)
}

// PUT /api/doctor-schedules — upsert schedules for one doctor
// Body: { doctor_id, schedules: [{ day_of_week, start_time, end_time, slot_minutes }] }
export async function PUT(req: NextRequest) {
  const db = createServerClient()
  const { doctor_id, schedules } = await req.json() as {
    doctor_id: string
    schedules: { day_of_week: number; start_time: string; end_time: string; slot_minutes: number }[]
  }

  if (!doctor_id) return NextResponse.json({ error: 'doctor_id required' }, { status: 400 })

  // Delete existing and re-insert
  await db.from('doctor_schedules').delete().eq('doctor_id', doctor_id)

  if (schedules.length > 0) {
    const rows = schedules.map(s => ({ ...s, doctor_id }))
    const { error } = await db.from('doctor_schedules').insert(rows)
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ ok: true })
}

export { DAY_NAMES }
