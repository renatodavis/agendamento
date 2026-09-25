import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase'

export const revalidate = 0

function todayKey() {
  return 'stats_' + new Date().toISOString().split('T')[0]
}

type DayStats = { messages: number; input_tokens: number; output_tokens: number; cost_usd: number }

// GET — retorna stats do dia atual
export async function GET() {
  const db = createServerClient()
  const { data } = await db.from('clinic_config').select('value').eq('key', todayKey()).single()
  const stats = (data?.value ?? { messages: 0, input_tokens: 0, output_tokens: 0, cost_usd: 0 }) as DayStats
  return NextResponse.json(stats)
}

// POST — incrementa stats do dia (chamado pelo chat.ts após cada resposta)
export async function POST(req: NextRequest) {
  const delta = await req.json() as Partial<DayStats>
  const db = createServerClient()
  const key = todayKey()

  const { data: existing } = await db.from('clinic_config').select('value').eq('key', key).single()
  const current = (existing?.value ?? { messages: 0, input_tokens: 0, output_tokens: 0, cost_usd: 0 }) as DayStats

  const updated: DayStats = {
    messages:      (current.messages      ?? 0) + (delta.messages      ?? 0),
    input_tokens:  (current.input_tokens  ?? 0) + (delta.input_tokens  ?? 0),
    output_tokens: (current.output_tokens ?? 0) + (delta.output_tokens ?? 0),
    cost_usd:      (current.cost_usd      ?? 0) + (delta.cost_usd      ?? 0),
  }

  await db.from('clinic_config').upsert({ key, value: updated }, { onConflict: 'key' })
  return NextResponse.json(updated)
}
