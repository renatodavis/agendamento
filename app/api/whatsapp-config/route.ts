import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase'
import { requireAuth } from '@/lib/auth'
import { invalidateWhatsAppConfigCache } from '@/lib/whatsapp-config'

const SECRET_KEYS = [
  'whatsapp_api_token',
  'whatsapp_phone_number_id',
  'whatsapp_verify_token',
  'whatsapp_app_secret',
] as const

type SecretKey = typeof SECRET_KEYS[number]

function maskValue(value: string): string {
  if (value.length <= 6) return '••••••'
  return '••••' + value.slice(-4)
}

// GET: retorna status mascarado de cada credencial (nunca expõe o valor real)
export async function GET() {
  const auth = await requireAuth()
  if (auth instanceof NextResponse) return auth

  const db = createServerClient()
  const { data } = await db
    .from('clinic_secrets')
    .select('key, value, updated_at')
    .in('key', [...SECRET_KEYS])

  const rows = Object.fromEntries((data ?? []).map(r => [r.key, r]))

  const result: Record<string, { set: boolean; masked: string | null; updated_at: string | null }> = {}
  for (const key of SECRET_KEYS) {
    const row = rows[key]
    result[key] = {
      set: !!row,
      masked: row ? maskValue(row.value) : null,
      updated_at: row?.updated_at ?? null,
    }
  }

  const connected = SECRET_KEYS.every(k => result[k].set)
  return NextResponse.json({ ...result, connected })
}

// PUT: salva/atualiza credenciais (valores em branco são ignorados)
export async function PUT(req: NextRequest) {
  const auth = await requireAuth()
  if (auth instanceof NextResponse) return auth

  const body = await req.json() as Partial<Record<SecretKey, string>>
  const db = createServerClient()

  const entries = Object.entries(body)
    .filter(([key, value]) => SECRET_KEYS.includes(key as SecretKey) && typeof value === 'string' && value.trim().length > 0)

  for (const [key, value] of entries) {
    await db.from('clinic_secrets').upsert({ key, value: (value as string).trim() }, { onConflict: 'key' })
  }

  if (entries.length > 0) invalidateWhatsAppConfigCache()

  return NextResponse.json({ ok: true })
}

// POST: troca code do Meta Embedded Signup por access token e salva phone_number_id
export async function POST(req: NextRequest) {
  const auth = await requireAuth()
  if (auth instanceof NextResponse) return auth

  const { code, phone_number_id, waba_id } = await req.json() as {
    code?: string
    phone_number_id?: string
    waba_id?: string
  }

  const appId     = process.env.FACEBOOK_APP_ID
  const appSecret = process.env.FACEBOOK_APP_SECRET
  const appUrl    = process.env.NEXT_PUBLIC_APP_URL ?? ''

  if (!code || !appId || !appSecret) {
    return NextResponse.json({ error: 'Parâmetros insuficientes' }, { status: 400 })
  }

  // Troca o code por um access token de curta duração
  const tokenRes = await fetch(
    `https://graph.facebook.com/v20.0/oauth/access_token?` +
    `client_id=${appId}&client_secret=${appSecret}&code=${code}&redirect_uri=${encodeURIComponent(appUrl)}`,
    { method: 'GET' }
  )

  if (!tokenRes.ok) {
    const err = await tokenRes.text().catch(() => '')
    console.error('[whatsapp-config/POST] token exchange failed:', tokenRes.status, err)
    return NextResponse.json({ error: 'Falha ao trocar token com a Meta' }, { status: 502 })
  }

  const { access_token } = await tokenRes.json() as { access_token?: string }
  if (!access_token) return NextResponse.json({ error: 'Token não retornado' }, { status: 502 })

  const db = createServerClient()
  await db.from('clinic_secrets').upsert({ key: 'whatsapp_api_token', value: access_token }, { onConflict: 'key' })

  if (phone_number_id) {
    await db.from('clinic_secrets').upsert({ key: 'whatsapp_phone_number_id', value: phone_number_id }, { onConflict: 'key' })
  }

  invalidateWhatsAppConfigCache()

  return NextResponse.json({ ok: true, phone_number_id, waba_id })
}
