import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase'

export async function GET() {
  const db = createServerClient()
  const { data, error } = await db.from('clinic_config').select('key, value, updated_at')
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  const config = Object.fromEntries((data ?? []).map(r => [r.key, r.value]))
  return NextResponse.json(config)
}

export async function PUT(req: NextRequest) {
  try {
    const body = await req.json() as Record<string, unknown>
    const db = createServerClient()

    const updates = Object.entries(body).map(([key, value]) =>
      db.from('clinic_config')
        .upsert({ key, value }, { onConflict: 'key' })
    )
    await Promise.all(updates)

    return NextResponse.json({ ok: true })
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 })
  }
}
