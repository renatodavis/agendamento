import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase'
import { requireAuth } from '@/lib/auth'

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireAuth()
  if (auth instanceof NextResponse) return auth

  const { id } = await params
  const db = createServerClient()
  const { name, specialty } = await req.json() as { name: string; specialty: string }
  if (!name?.trim() || !specialty?.trim())
    return NextResponse.json({ error: 'name e specialty são obrigatórios' }, { status: 400 })

  const { error } = await db.from('doctors').update({ name: name.trim(), specialty: specialty.trim() }).eq('id', id)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireAuth()
  if (auth instanceof NextResponse) return auth

  const { id } = await params
  const db = createServerClient()

  // Verifica se há consultas futuras vinculadas
  const { data: future } = await db
    .from('appointments')
    .select('id')
    .eq('doctor_id', id)
    .gte('scheduled_at', new Date().toISOString())
    .not('status', 'in', '("cancelada","lista_espera")')
    .limit(1)

  if (future && future.length > 0)
    return NextResponse.json({ error: 'Médico possui consultas futuras. Cancele-as antes de excluir.' }, { status: 409 })

  const { error } = await db.from('doctors').delete().eq('id', id)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}
