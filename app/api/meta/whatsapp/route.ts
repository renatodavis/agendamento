import { NextRequest, NextResponse } from 'next/server'
import { requireAuth } from '@/lib/auth'

const WA_TOKEN    = process.env.WHATSAPP_API_TOKEN
const PHONE_ID    = process.env.WHATSAPP_PHONE_NUMBER_ID
const APP_URL     = process.env.NEXT_PUBLIC_APP_URL ?? ''

// GET — retorna o número registrado e o webhook atual
export async function GET() {
  const auth = await requireAuth()
  if (auth instanceof NextResponse) return auth

  if (!WA_TOKEN || !PHONE_ID) {
    return NextResponse.json({ error: 'WHATSAPP_API_TOKEN ou WHATSAPP_PHONE_NUMBER_ID não configurados' }, { status: 503 })
  }

  try {
    const [phoneRes, wabaRes] = await Promise.all([
      fetch(`https://graph.facebook.com/v19.0/${PHONE_ID}?fields=display_phone_number,verified_name,quality_rating,platform_type,status`, {
        headers: { Authorization: `Bearer ${WA_TOKEN}` },
      }),
      fetch(`https://graph.facebook.com/v19.0/${PHONE_ID}?fields=account_id`, {
        headers: { Authorization: `Bearer ${WA_TOKEN}` },
      }),
    ])

    if (!phoneRes.ok) {
      const err = await phoneRes.json().catch(() => ({}))
      return NextResponse.json({ error: 'Erro ao buscar dados do número', detail: err }, { status: 502 })
    }

    const phone = await phoneRes.json()
    const wabaData = wabaRes.ok ? await wabaRes.json().catch(() => ({})) : {}

    return NextResponse.json({
      phone_number_id: PHONE_ID,
      display_phone_number: phone.display_phone_number,
      verified_name: phone.verified_name,
      quality_rating: phone.quality_rating,
      platform_type: phone.platform_type,
      status: phone.status,
      waba_id: wabaData.account_id ?? null,
      webhook_url: `${APP_URL}/api/whatsapp`,
    })
  } catch (err) {
    console.error('[meta/whatsapp] erro:', err)
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 })
  }
}

// POST — atualiza o webhook no Meta via Graph API
export async function POST(req: NextRequest) {
  const auth = await requireAuth()
  if (auth instanceof NextResponse) return auth

  const { callback_url, verify_token } = await req.json()
  if (!callback_url || !verify_token) {
    return NextResponse.json({ error: 'callback_url e verify_token são obrigatórios' }, { status: 400 })
  }

  const APP_ID     = process.env.META_APP_ID
  const APP_SECRET = process.env.WHATSAPP_APP_SECRET

  if (!APP_ID || !APP_SECRET || !WA_TOKEN) {
    return NextResponse.json({ error: 'META_APP_ID, WHATSAPP_APP_SECRET ou WHATSAPP_API_TOKEN não configurados' }, { status: 503 })
  }

  // App Access Token = app_id|app_secret
  const appToken = `${APP_ID}|${APP_SECRET}`

  const fields = [
    'messages', 'message_template_components_update', 'message_template_status_update',
    'account_alerts', 'account_review_update', 'account_update', 'calls',
    'message_template_quality_update', 'phone_number_name_update',
    'phone_number_quality_update', 'security',
  ]

  const body = new URLSearchParams({
    object: 'whatsapp_business_account',
    callback_url,
    verify_token,
    fields: fields.join(','),
    include_values: 'true',
    access_token: appToken,
  })

  const res = await fetch(`https://graph.facebook.com/v19.0/${APP_ID}/subscriptions`, {
    method: 'POST',
    body,
  })

  const data = await res.json().catch(() => ({}))
  if (!res.ok) {
    console.error('[meta/whatsapp] falha ao atualizar webhook:', data)
    return NextResponse.json({ error: 'Falha ao atualizar webhook no Meta', detail: data }, { status: 502 })
  }

  return NextResponse.json({ ok: true, callback_url })
}
