import { NextResponse } from 'next/server'
import { requireAuth } from '@/lib/auth'

const WA_TOKEN = process.env.WHATSAPP_API_TOKEN

// Lista apps WhatsApp acessíveis pelo token: tenta businesses → owned_apps,
// depois retorna pelo menos o app configurado como fallback.
export async function GET() {
  const auth = await requireAuth()
  if (auth instanceof NextResponse) return auth

  if (!WA_TOKEN) {
    return NextResponse.json({ error: 'WHATSAPP_API_TOKEN não configurado' }, { status: 503 })
  }

  const headers = { Authorization: `Bearer ${WA_TOKEN}` }

  try {
    // Tenta listar negócios associados ao token
    const bizRes = await fetch(
      'https://graph.facebook.com/v19.0/me/businesses?fields=id,name,owned_apps{id,name,link}&limit=50',
      { headers }
    )

    if (bizRes.ok) {
      const biz = await bizRes.json() as { data?: { id: string; name: string; owned_apps?: { data?: { id: string; name: string; link?: string }[] } }[] }
      const apps: { app_id: string; name: string; business_name: string }[] = []
      for (const b of biz.data ?? []) {
        for (const app of b.owned_apps?.data ?? []) {
          apps.push({ app_id: app.id, name: app.name, business_name: b.name })
        }
      }
      if (apps.length > 0) return NextResponse.json({ apps })
    }

    // Fallback: tenta /me como app token
    const meRes = await fetch('https://graph.facebook.com/v19.0/me?fields=id,name', { headers })
    if (meRes.ok) {
      const me = await meRes.json() as { id?: string; name?: string }
      if (me.id && me.name) {
        return NextResponse.json({
          apps: [{ app_id: me.id, name: me.name, business_name: '' }],
          note: 'Apenas o app associado ao token foi encontrado',
        })
      }
    }

    return NextResponse.json({ apps: [], note: 'Nenhum app encontrado. Verifique as permissões do token.' })
  } catch (err) {
    console.error('[meta/apps] erro:', err)
    return NextResponse.json({ error: 'Erro ao consultar Meta Graph API' }, { status: 500 })
  }
}
