import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase'
import { requireAuth } from '@/lib/auth'

// Sem sessão, expõe só o nome (usado na tela de login). A configuração completa
// inclui contexto do negócio, stats de uso e estado da IA — exige autenticação.
export async function GET() {
  const auth = await requireAuth()
  const db = createServerClient()

  if (auth instanceof NextResponse) {
    const { data } = await db.from('clinic_config').select('value').eq('key', 'clinic_name').maybeSingle()
    return NextResponse.json({ clinic_name: data?.value ?? null })
  }

  const { data, error } = await db.from('clinic_config').select('key, value, updated_at')
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  const config = Object.fromEntries((data ?? []).map(r => [r.key, r.value]))
  return NextResponse.json(config)
}

export async function PUT(req: NextRequest) {
  const auth = await requireAuth()
  if (auth instanceof NextResponse) return auth

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
