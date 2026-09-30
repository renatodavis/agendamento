import type { SupabaseClient } from '@supabase/supabase-js'

const WA_TOKEN    = process.env.WHATSAPP_API_TOKEN
const WA_PHONE_ID = process.env.WHATSAPP_PHONE_NUMBER_ID

export async function sendWhatsAppText(phone: string, body: string): Promise<{ ok: boolean; id?: string }> {
  if (!WA_TOKEN || !WA_PHONE_ID) return { ok: false }
  const res = await fetch(`https://graph.facebook.com/v19.0/${WA_PHONE_ID}/messages`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${WA_TOKEN}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ messaging_product: 'whatsapp', to: phone, type: 'text', text: { body } }),
  })
  if (!res.ok) {
    console.error('[whatsapp] falha ao enviar mensagem:', res.status, await res.text().catch(() => ''))
    return { ok: false }
  }
  const data = await res.json().catch(() => null) as { messages?: { id: string }[] } | null
  return { ok: true, id: data?.messages?.[0]?.id }
}

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
