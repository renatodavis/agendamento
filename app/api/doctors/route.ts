import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase'
import { requireAuth } from '@/lib/auth'

export async function GET() {
  const db = createServerClient()
  const { data, error } = await db.from('doctors').select('id, name, specialty').order('specialty')
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}

export async function POST(req: NextRequest) {
  const auth = await requireAuth()
  if (auth instanceof NextResponse) return auth

  const db = createServerClient()
  const { name, specialty } = await req.json() as { name: string; specialty: string }
  if (!name?.trim() || !specialty?.trim())
    return NextResponse.json({ error: 'name e specialty são obrigatórios' }, { status: 400 })

  const { data, error } = await db.from('doctors').insert({ name: name.trim(), specialty: specialty.trim() }).select('id, name, specialty').single()
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data, { status: 201 })
}
