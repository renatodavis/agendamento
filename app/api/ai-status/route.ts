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

  const val = data?.value as { error?: string; at?: string } | null
  if (!val?.error) return NextResponse.json({ ok: true })

  // Considera estável se o erro foi há mais de 30 minutos (pode ter sido recarregado)
  if (val.at) {
    const age = Date.now() - new Date(val.at).getTime()
    if (age > 30 * 60 * 1000) return NextResponse.json({ ok: true })
  }

  return NextResponse.json({ ok: false, error: val.error, at: val.at })
}

// Chamado internamente por chat.ts para registrar/limpar o erro
export async function POST(req: Request) {
  const { error } = await req.json() as { error: string | null }
  const db = createServerClient()
  // value é NOT NULL — usar { error: null } em vez de null para limpar
  await db.from('clinic_config').upsert(
    { key: 'ai_credit_error', value: { error, at: new Date().toISOString() } },
    { onConflict: 'key' }
  )
  return NextResponse.json({ ok: true })
}
