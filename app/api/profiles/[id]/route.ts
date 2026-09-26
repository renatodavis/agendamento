import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'

function makeClient() {
  const cookieStore = cookies()
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    {
      cookies: {
        getAll: () => cookieStore.getAll(),
        setAll: () => {},
      },
    }
  )
}

export async function PUT(req: Request, { params }: { params: { id: string } }) {
  const body = await req.json()
  const db = makeClient()
  const { data, error } = await db
    .from('profiles')
    .update({
      name: body.name,
      domain_type: body.domain_type,
      business_context: body.business_context,
      out_of_scope_message: body.out_of_scope_message,
      specialties: body.specialties,
      vocabulary: body.vocabulary,
    })
    .eq('id', params.id)
    .select()
    .single()
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}

export async function DELETE(_req: Request, { params }: { params: { id: string } }) {
  const db = makeClient()
  const { error } = await db.from('profiles').delete().eq('id', params.id)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}
