import { NextRequest, NextResponse, after } from 'next/server'
import { createHmac, timingSafeEqual } from 'crypto'
import { createServerClient } from '@/lib/supabase'
import { processMessage } from '@/lib/chat'
import { getClinicBasicConfig, isHealthBusiness } from '@/lib/clinic-config-server'
import { maybeCreateApprovalIntercept } from '@/lib/approval-intercept'
import { resolvePendingReply } from '@/lib/pending-action'
import { sendWhatsAppText, sendAndLog } from '@/lib/whatsapp'

// Meta WhatsApp Business Cloud API webhook
// Docs: https://developers.facebook.com/docs/whatsapp/cloud-api/webhooks

const VERIFY_TOKEN = process.env.WHATSAPP_VERIFY_TOKEN
const APP_SECRET   = process.env.WHATSAPP_APP_SECRET
const WA_TOKEN     = process.env.WHATSAPP_API_TOKEN
const GROQ_API_KEY = process.env.GROQ_API_KEY

const RATE_LIMIT_MAX = 10
const RATE_LIMIT_WINDOW_MS = 60_000

type InboundMessage = {
  from: string
  id?: string
  type?: string
  text?: { body?: string }
  audio?: { id?: string }
}

// ── Transcrição de áudio (mensagens de voz) via Groq Whisper ──────────
async function transcribeAudio(mediaId: string): Promise<string | null> {
  if (!WA_TOKEN || !GROQ_API_KEY) return null
  try {
    const metaRes = await fetch(`https://graph.facebook.com/v19.0/${mediaId}`, {
      headers: { Authorization: `Bearer ${WA_TOKEN}` },
    })
    if (!metaRes.ok) {
      console.error('[whatsapp] falha ao resolver media:', metaRes.status)
      return null
    }
    const meta = await metaRes.json() as { url?: string; mime_type?: string }
    if (!meta.url) return null

    const audioRes = await fetch(meta.url, { headers: { Authorization: `Bearer ${WA_TOKEN}` } })
    if (!audioRes.ok) {
      console.error('[whatsapp] falha ao baixar áudio:', audioRes.status)
      return null
    }
    const audioBuffer = await audioRes.arrayBuffer()

    const ext = meta.mime_type?.includes('ogg') ? 'ogg' : meta.mime_type?.includes('mp4') ? 'mp4' : 'mp3'
    const form = new FormData()
    form.append('file', new Blob([audioBuffer], { type: meta.mime_type ?? 'audio/ogg' }), `audio.${ext}`)
    form.append('model', 'whisper-large-v3-turbo')
    form.append('language', 'pt')

    const groqRes = await fetch('https://api.groq.com/openai/v1/audio/transcriptions', {
      method: 'POST',
      headers: { Authorization: `Bearer ${GROQ_API_KEY}` },
      body: form,
    })
    if (!groqRes.ok) {
      console.error('[whatsapp] Groq transcription failed:', groqRes.status, await groqRes.text().catch(() => ''))
      return null
    }
    const data = await groqRes.json() as { text?: string }
    return data.text?.trim() || null
  } catch (err) {
    console.error('[whatsapp] transcribeAudio error:', err)
    return null
  }
}

// ── Valida assinatura X-Hub-Signature-256 ─────────────────────────────
// Sem APP_SECRET, só aceita fora de produção (desenvolvimento local).
function verifySignature(rawBody: string, signature: string | null): boolean {
  if (!APP_SECRET) {
    if (process.env.NODE_ENV === 'production') {
      console.error('[whatsapp] WHATSAPP_APP_SECRET não configurado — webhook recusado')
      return false
    }
    return true
  }
  if (!signature) return false
  const expected = 'sha256=' + createHmac('sha256', APP_SECRET).update(rawBody).digest('hex')
  try {
    return timingSafeEqual(Buffer.from(signature), Buffer.from(expected))
  } catch {
    return false
  }
}

// ── GET: Meta webhook verification handshake ─────────────────────────
export async function GET(req: NextRequest) {
  if (!VERIFY_TOKEN) {
    console.error('[whatsapp/GET] WHATSAPP_VERIFY_TOKEN não configurado')
    return new Response('Forbidden', { status: 403 })
  }
  const { searchParams } = new URL(req.url)
  if (searchParams.get('hub.mode') === 'subscribe' && searchParams.get('hub.verify_token') === VERIFY_TOKEN) {
    return new Response(searchParams.get('hub.challenge'), { status: 200 })
  }
  return new Response('Forbidden', { status: 403 })
}

// ── POST: confirma recebimento à Meta na hora e processa em background ──
export async function POST(req: NextRequest) {
  try {
    const rawBody = await req.text()
    if (!verifySignature(rawBody, req.headers.get('x-hub-signature-256'))) {
      console.warn('[whatsapp/POST] assinatura X-Hub-Signature-256 inválida')
      return new Response('Unauthorized', { status: 401 })
    }

    const body = JSON.parse(rawBody)
    const value = body?.entry?.[0]?.changes?.[0]?.value
    const db = createServerClient()

    if (value?.statuses) {
      for (const status of value.statuses) {
        await db.from('wa_messages').update({ status: status.status }).eq('id', status.id)
      }
      return NextResponse.json({ ok: true })
    }

    const message = value?.messages?.[0] as InboundMessage | undefined
    if (!message) return NextResponse.json({ ok: true })

    // Meta reenvia o mesmo wamid em retentativas (até 72h)
    if (message.id) {
      const { data: existing } = await db.from('wa_messages').select('id').eq('wamid', message.id).limit(1).maybeSingle()
      if (existing) return NextResponse.json({ ok: true })
    }

    const contactName = (value?.contacts?.[0]?.profile?.name as string | undefined) ?? null
    after(() => handleInbound(message, contactName).catch(err => console.error('[whatsapp] handleInbound error:', err)))
    return NextResponse.json({ ok: true })
  } catch (err) {
    console.error('[whatsapp/route] error:', err)
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 })
  }
}

async function handleInbound(message: InboundMessage, contactName: string | null) {
  const db = createServerClient()
  const { clinicName, vocabulary: voc } = await getClinicBasicConfig()
  const isHealth = isHealthBusiness(voc.business_noun)
  const phone = message.from
  const wamid = message.id
  let text = message.text?.body ?? ''

  if (message.type === 'audio' && message.audio?.id) {
    const transcript = await transcribeAudio(message.audio.id)
    if (!transcript) {
      await sendWhatsAppText(phone, 'Desculpe, não consegui entender o áudio. Pode escrever sua mensagem, por favor? 🙏')
      return
    }
    text = transcript
  }
  if (!text.trim()) return

  const { data: session } = await db
    .from('wa_sessions')
    .upsert({ phone, last_inbound_at: new Date().toISOString(), ...(contactName ? { name: contactName } : {}) }, { onConflict: 'phone' })
    .select()
    .single()
  if (!session) return
  if (session.opt_out_at) return

  const waSession = { id: session.id as string, phone }
  const storeInbound = () => db.from('wa_messages').insert({
    session_id: session.id, direction: 'inbound', body: text, status: 'delivered', ...(wamid ? { wamid } : {}),
  })

  // Consentimento LGPD obrigatório no primeiro contato (Art. 11 Lei 13.709/2018)
  if (!session.lgpd_consent_at) {
    const isConsent = /^(sim|s|yes|1|aceito|aceitar|concordo|autorizo|ok)[\s.!]*$/i.test(text.trim())
    if (!isConsent) {
      await storeInbound()
      const consentMsg =
        `🔒 *${clinicName} — Privacidade de Dados*\n\n` +
        `Olá! Para iniciar seu atendimento, precisamos do seu consentimento conforme a *Lei Geral de Proteção de Dados (LGPD — Lei 13.709/2018)*.\n\n` +
        `📋 *Seus dados serão utilizados para:*\n` +
        `• Agendamento e controle de atendimentos\n` +
        `• Comunicação sobre seus agendamentos\n` +
        (isHealth ? `• Prontuário (dados sensíveis de saúde, Art. 11 LGPD)\n` : '') + `\n` +
        `Seus dados são protegidos e *não serão compartilhados* com terceiros sem sua autorização.\n\n` +
        `Responda *SIM* para aceitar e iniciar o atendimento.`
      await sendAndLog(db, waSession, consentMsg)
      return
    }
    await db.from('wa_sessions').update({ lgpd_consent_at: new Date().toISOString() }).eq('id', session.id)
    await db.from('audit_log').insert({
      actor_type: 'user', actor_id: session.id, action: 'lgpd_consent_given', record_type: 'wa_session', record_id: session.id,
    })
  }

  const windowStart = new Date(Date.now() - RATE_LIMIT_WINDOW_MS).toISOString()
  const { count } = await db
    .from('wa_messages')
    .select('id', { count: 'exact', head: true })
    .eq('session_id', session.id)
    .eq('direction', 'inbound')
    .gte('sent_at', windowStart)
  if ((count ?? 0) >= RATE_LIMIT_MAX) {
    console.warn('[whatsapp] rate limit excedido para sessão:', session.id)
    return
  }

  // Histórico carregado antes de gravar a mensagem atual (evita duplicata no contexto)
  const { data: historyMsgs } = await db
    .from('wa_messages')
    .select('direction, body')
    .eq('session_id', session.id)
    .order('sent_at', { ascending: false })
    .limit(20)

  await storeInbound()

  // SIM/NÃO à pergunta em aberto (proposta, lembrete, sugestão da recepção) — resolvido em código
  const pendingReply = await resolvePendingReply(db, session.id, text)
  if (pendingReply) {
    await sendAndLog(db, waSession, pendingReply)
    return
  }

  await maybeCreateApprovalIntercept({ text, sessionId: session.id })

  const history: { role: string; content: string }[] = []
  for (const m of (historyMsgs ?? []).reverse()) {
    const content = (m.body as string | null)?.trim()
    if (!content) continue
    const role = m.direction === 'inbound' ? 'user' : 'assistant'
    const last = history[history.length - 1]
    if (last?.role === role) last.content += '\n' + content
    else history.push({ role, content })
  }

  const { response } = await processMessage({ message: text, sessionId: session.id, history })
  const sent = await sendAndLog(db, waSession, response)
  if (sent.ok) {
    await db.from('audit_log').insert({
      actor_type: 'agent', actor_id: 'assistente-agendamento', action: 'whatsapp_send',
      record_type: 'wa_message', record_id: sent.id ?? 'unknown',
    })
  }
}
