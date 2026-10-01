import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase'
import { invalidateClinicBasicConfigCache } from '@/lib/clinic-config-server'
import { requireAuth } from '@/lib/auth'

export async function POST(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireAuth()
  if (auth instanceof NextResponse) return auth

  const { id } = await params
  const db = createServerClient()

  // Desativa todos, depois ativa o escolhido — evita conflito no índice único
  const { error: e1 } = await db.from('profiles').update({ is_active: false }).neq('id', id)
  if (e1) return NextResponse.json({ error: e1.message }, { status: 500 })

  const { data, error: e2 } = await db
    .from('profiles')
    .update({ is_active: true })
    .eq('id', id)
    .select()
    .single()
  if (e2) return NextResponse.json({ error: e2.message }, { status: 500 })

  invalidateClinicBasicConfigCache()

  return NextResponse.json(data)
}
