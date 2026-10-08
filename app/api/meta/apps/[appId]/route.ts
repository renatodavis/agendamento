import { NextRequest, NextResponse } from 'next/server'
import { requireAuth } from '@/lib/auth'

const WA_TOKEN = process.env.WHATSAPP_API_TOKEN
const APP_URL  = process.env.NEXT_PUBLIC_APP_URL ?? ''

// Dado um appId, retorna: info do app, WABA(s), números de telefone, webhook atual
export async function GET(_req: NextRequest, { params }: { params: Promise<{ appId: string }> }) {
  const auth = await requireAuth()
  if (auth instanceof NextResponse) return auth

  const { appId } = await params

  if (!WA_TOKEN) {
    return NextResponse.json({ error: 'WHATSAPP_API_TOKEN não configurado' }, { status: 503 })
  }

  const headers = { Authorization: `Bearer ${WA_TOKEN}` }

  try {
    // Info básica do app
    const appRes = await fetch(
      `https://graph.facebook.com/v19.0/${appId}?fields=id,name,link`,
      { headers }
    )
    const appInfo = appRes.ok ? await appRes.json() : null

    // WABAs vinculadas ao app (precisa de permissão whatsapp_business_management)
    const wabaRes = await fetch(
      `https://graph.facebook.com/v19.0/${appId}/subscribed_apps`,
      { headers }
    )
    const wabaData = wabaRes.ok ? await wabaRes.json().catch(() => ({})) : {}

    // Números via WABA: tenta buscar a WABA do número configurado
    const phoneId = process.env.WHATSAPP_PHONE_NUMBER_ID
    let phones: object[] = []
    let wabaId: string | null = null

    if (phoneId) {
      const phoneRes = await fetch(
        `https://graph.facebook.com/v19.0/${phoneId}?fields=id,display_phone_number,verified_name,quality_rating,status,platform_type,account_id`,
        { headers }
      )
      if (phoneRes.ok) {
        const p = await phoneRes.json()
        wabaId = p.account_id ?? null
        phones = [p]

        // Se temos o WABA ID, busca todos os números desse WABA
        if (wabaId) {
          const allPhonesRes = await fetch(
            `https://graph.facebook.com/v19.0/${wabaId}/phone_numbers?fields=id,display_phone_number,verified_name,quality_rating,status,platform_type`,
            { headers }
          )
          if (allPhonesRes.ok) {
            const all = await allPhonesRes.json() as { data?: object[] }
            if (all.data?.length) phones = all.data
          }
        }
      }
    }

    // Webhook atual do app
    const webhookRes = await fetch(
      `https://graph.facebook.com/v19.0/${appId}/subscriptions?access_token=${WA_TOKEN}`,
    )
    const webhookData = webhookRes.ok ? await webhookRes.json().catch(() => ({})) : {}
    const waWebhook = (webhookData?.data as { object?: string; callback_url?: string }[] | undefined)
      ?.find(s => s.object === 'whatsapp_business_account')

    return NextResponse.json({
      app_id: appId,
      app_name: appInfo?.name ?? null,
      waba_id: wabaId,
      phones,
      current_webhook: waWebhook?.callback_url ?? null,
      suggested_webhook: `${APP_URL}/api/whatsapp`,
      verify_token_env: 'WHATSAPP_VERIFY_TOKEN',
    })
  } catch (err) {
    console.error('[meta/apps/:appId] erro:', err)
    return NextResponse.json({ error: 'Erro ao consultar Meta Graph API' }, { status: 500 })
  }
}
