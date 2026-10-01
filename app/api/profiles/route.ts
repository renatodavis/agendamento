import { NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase'
import { requireAuth } from '@/lib/auth'

export async function GET() {
  const auth = await requireAuth()
  if (auth instanceof NextResponse) return auth

  const db = createServerClient()
  const { data, error } = await db
    .from('profiles')
    .select('*')
    .order('created_at', { ascending: true })
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}

export async function POST(req: Request) {
  const auth = await requireAuth()
  if (auth instanceof NextResponse) return auth

  const body = await req.json()
  const db = createServerClient()
  const { data, error } = await db
    .from('profiles')
    .insert({
      name: body.name,
      domain_type: body.domain_type,
      business_context: body.business_context ?? '',
      out_of_scope_message: body.out_of_scope_message ?? '',
      specialties: body.specialties ?? [],
      vocabulary: body.vocabulary ?? {},
      is_active: false,
    })
    .select()
    .single()
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data, { status: 201 })
}
