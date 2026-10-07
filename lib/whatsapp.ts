import type { SupabaseClient } from '@supabase/supabase-js'
import { getWhatsAppConfig } from './whatsapp-config'

export async function sendWhatsAppText(phone: string, body: string): Promise<{ ok: boolean; id?: string }> {
  const { apiToken, phoneNumberId } = await getWhatsAppConfig()
  if (!apiToken || !phoneNumberId) return { ok: false }
  const res = await fetch(`https://graph.facebook.com/v19.0/${phoneNumberId}/messages`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${apiToken}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ messaging_product: 'whatsapp', to: phone, type: 'text', text: { body } }),
  })
  if (!res.ok) {
    console.error('[whatsapp] falha ao enviar mensagem:', res.status, await res.text().catch(() => ''))
    return { ok: false }
  }
  const data = await res.json().catch(() => null) as { messages?: { id: string }[] } | null
  return { ok: true, id: data?.messages?.[0]?.id }
}

// Fora da janela de 24h desde a última mensagem do cliente, a Meta só aceita templates aprovados.
// Parâmetros de template não podem conter quebras de linha.
export async function sendWhatsAppTemplate(
  phone: string,
  template: string,
  language: string,
  params: string[],
): Promise<{ ok: boolean; id?: string }> {
  const { apiToken, phoneNumberId } = await getWhatsAppConfig()
  if (!apiToken || !phoneNumberId) return { ok: false }
  const res = await fetch(`https://graph.facebook.com/v19.0/${phoneNumberId}/messages`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${apiToken}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      messaging_product: 'whatsapp', to: phone, type: 'template',
      template: {
        name: template,
        language: { code: language },
        components: [{ type: 'body', parameters: params.map(text => ({ type: 'text', text: text.replace(/\s*\n+\s*/g, ' ') })) }],
      },
    }),
  })
  if (!res.ok) {
    console.error('[whatsapp] falha ao enviar template:', res.status, await res.text().catch(() => ''))
    return { ok: false }
  }
  const data = await res.json().catch(() => null) as { messages?: { id: string }[] } | null
  return { ok: true, id: data?.messages?.[0]?.id }
}

export const isWithinServiceWindow = (lastInboundAt: string | null | undefined) =>
  !!lastInboundAt && Date.now() - new Date(lastInboundAt).getTime() < 24 * 60 * 60 * 1000

export async function sendAndLog(
  db: SupabaseClient,
  session: { id: string; phone: string },
  body: string,
): Promise<{ ok: boolean; id?: string }> {
  const result = await sendWhatsAppText(session.phone, body)
  await db.from('wa_messages').insert({
    session_id: session.id, direction: 'outbound', body, status: result.ok ? 'sent' : 'failed',
  })
  return result
}
