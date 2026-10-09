import { NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase'
import { requireAuth } from '@/lib/auth'

export const revalidate = 0

// scheduled_at guarda a hora de Brasília marcada como UTC (15h → "T15:00:00Z")
const BRT_OFFSET_MS = 3 * 60 * 60 * 1000
const DAY_MS = 24 * 60 * 60 * 1000

function todayKey() {
  return 'stats_' + new Date().toISOString().split('T')[0]
}

type DayStats = { messages: number; input_tokens: number; output_tokens: number; cost_usd: number }

// GET — uso de IA do dia + contagens de agendamentos confirmados
export async function GET() {
  const auth = await requireAuth()
  if (auth instanceof NextResponse) return auth

  const db = createServerClient()

  const nowWall  = new Date(Date.now() - BRT_OFFSET_MS)
  const day      = nowWall.toISOString().slice(0, 10)
  const dayStart = `${day}T00:00:00Z`
  const dayEnd   = `${day}T23:59:59.999Z`
  const weekStart = new Date(Date.parse(dayStart) - 6 * DAY_MS).toISOString()
  // created_at é um instante real: o dia de Brasília começa às 03:00Z
  const realDayStart = new Date(Date.parse(dayStart) + BRT_OFFSET_MS).toISOString()
  const realDayEnd   = new Date(Date.parse(realDayStart) + DAY_MS).toISOString()

  const [usage, confirmedToday, assistantToday, attendedWeek, missedWeek] = await Promise.all([
    db.from('clinic_config').select('value').eq('key', todayKey()).maybeSingle(),
    db.from('appointments').select('id', { count: 'exact', head: true })
      .in('status', ['agendada', 'confirmada', 'atendida'])
      .gte('scheduled_at', dayStart).lte('scheduled_at', dayEnd),
    db.from('audit_log').select('id', { count: 'exact', head: true })
      .eq('action', 'appointment_confirmed_by_patient')
      .gte('created_at', realDayStart).lt('created_at', realDayEnd),
    db.from('appointments').select('id', { count: 'exact', head: true })
      .eq('status', 'atendida')
      .gte('scheduled_at', weekStart).lte('scheduled_at', dayEnd),
    db.from('appointments').select('id', { count: 'exact', head: true })
      .eq('status', 'cancelada').ilike('cancel_reason', '%não compareceu%')
      .gte('scheduled_at', weekStart).lte('scheduled_at', dayEnd),
  ])

  const ai = (usage.data?.value ?? { messages: 0, input_tokens: 0, output_tokens: 0, cost_usd: 0 }) as DayStats
  return NextResponse.json({
    ...ai,
    confirmed_today:           confirmedToday.count ?? 0,
    assistant_confirmed_today: assistantToday.count ?? 0,
    attended_week:             attendedWeek.count ?? 0,
    missed_week:               missedWeek.count ?? 0,
  })
}
