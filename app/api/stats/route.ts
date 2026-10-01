import { NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase'
import { requireAuth } from '@/lib/auth'

export const revalidate = 0

function todayKey() {
  return 'stats_' + new Date().toISOString().split('T')[0]
}

type DayStats = { messages: number; input_tokens: number; output_tokens: number; cost_usd: number }

// GET — retorna stats do dia atual
export async function GET() {
  const auth = await requireAuth()
  if (auth instanceof NextResponse) return auth

  const db = createServerClient()
  const { data } = await db.from('clinic_config').select('value').eq('key', todayKey()).single()
  const stats = (data?.value ?? { messages: 0, input_tokens: 0, output_tokens: 0, cost_usd: 0 }) as DayStats
  return NextResponse.json(stats)
}
