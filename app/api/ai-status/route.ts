import { NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase'
import { requireAuth } from '@/lib/auth'

export const revalidate = 0

export async function GET() {
  const auth = await requireAuth()
  if (auth instanceof NextResponse) return auth

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
