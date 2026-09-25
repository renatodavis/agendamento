import { NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase'

export const revalidate = 0

export async function GET() {
  const db = createServerClient()
  const { data } = await db
    .from('clinic_config')
    .select('value')
    .eq('key', 'ai_credit_error')
    .single()

  if (!data?.value) return NextResponse.json({ ok: true })

  const errorAt = (data.value as { at?: string })?.at
  // Considera estável se o erro foi há mais de 30 minutos (pode ter sido recarregado)
  if (errorAt) {
    const age = Date.now() - new Date(errorAt).getTime()
    if (age > 30 * 60 * 1000) return NextResponse.json({ ok: true })
  }

  return NextResponse.json({ ok: false, error: 'no_credits', at: errorAt })
}

// Chamado internamente por chat.ts para registrar/limpar o erro
export async function POST(req: Request) {
  const { error } = await req.json() as { error: string | null }
  const db = createServerClient()

  if (error === null) {
    await db.from('clinic_config').upsert({ key: 'ai_credit_error', value: null }, { onConflict: 'key' })
  } else {
    await db.from('clinic_config').upsert(
      { key: 'ai_credit_error', value: { error, at: new Date().toISOString() } },
      { onConflict: 'key' }
    )
  }
  return NextResponse.json({ ok: true })
}
