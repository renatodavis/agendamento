import { NextResponse } from 'next/server'
import { createAuthClient } from './supabase-server'

// Verifica sessão em API routes protegidas.
// Uso: const auth = await requireAuth(); if (auth instanceof NextResponse) return auth
export async function requireAuth() {
  const client = await createAuthClient()
  const { data: { user } } = await client.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
  return { user }
}
