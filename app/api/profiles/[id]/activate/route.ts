import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'

export async function POST(_req: Request, { params }: { params: { id: string } }) {
  const cookieStore = cookies()
  const db = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    {
      cookies: {
        getAll: () => cookieStore.getAll(),
        setAll: () => {},
      },
    }
  )

  // Desativa todos, depois ativa o escolhido — two-step to avoid unique index conflict
  const { error: e1 } = await db.from('profiles').update({ is_active: false }).neq('id', params.id)
  if (e1) return NextResponse.json({ error: e1.message }, { status: 500 })

  const { data, error: e2 } = await db
    .from('profiles')
    .update({ is_active: true })
    .eq('id', params.id)
    .select()
    .single()
  if (e2) return NextResponse.json({ error: e2.message }, { status: 500 })

  return NextResponse.json(data)
}
