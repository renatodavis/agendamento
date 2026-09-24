import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase'
import { requireAuth } from '@/lib/auth'
import { processBlockAffectedAppointments } from '@/lib/doctor-blocks-processor'

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const doctorId = searchParams.get('doctor_id')
  const db = createServerClient()

  let query = db
    .from('doctor_blocked_slots')
    .select('id, doctor_id, blocked_date, start_time, end_time, reason')
    .order('blocked_date', { ascending: true })
    .gte('blocked_date', new Date().toISOString().split('T')[0]) // só futuros/hoje

  if (doctorId) query = query.eq('doctor_id', doctorId)

  const { data, error } = await query
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}

export async function POST(req: NextRequest) {
  const auth = await requireAuth()
  if (auth instanceof NextResponse) return auth

  const db = createServerClient()
  const { doctor_id, blocked_date, start_time, end_time, reason } =
    await req.json() as { doctor_id: string; blocked_date: string; start_time?: string; end_time?: string; reason?: string }

  if (!doctor_id || !blocked_date)
    return NextResponse.json({ error: 'doctor_id e blocked_date são obrigatórios' }, { status: 400 })

  const { data, error } = await db
    .from('doctor_blocked_slots')
    .insert({ doctor_id, blocked_date, start_time: start_time || null, end_time: end_time || null, reason: reason || null })
    .select('id, blocked_date, start_time, end_time, reason')
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  // Background: find affected appointments and create approval_requests
  processBlockAffectedAppointments({
    id: data.id,
    doctor_id,
    blocked_date,
    start_time: start_time || null,
    end_time: end_time || null,
    reason: reason || null,
  }).catch(err => console.error('[doctor-blocks] processBlockAffectedAppointments error:', err))

  return NextResponse.json(data, { status: 201 })
}

export async function DELETE(req: NextRequest) {
  const auth = await requireAuth()
  if (auth instanceof NextResponse) return auth

  const { searchParams } = new URL(req.url)
  const id = searchParams.get('id')
  if (!id) return NextResponse.json({ error: 'id obrigatório' }, { status: 400 })

  const db = createServerClient()
  const { error } = await db.from('doctor_blocked_slots').delete().eq('id', id)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}
