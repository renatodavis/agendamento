import { NextResponse } from 'next/server'

export const revalidate = 0

const LANGFUSE_BASE_URL = process.env.LANGFUSE_BASE_URL ?? process.env.LANGFUSE_HOST ?? 'https://cloud.langfuse.com'
const PUBLIC_KEY = process.env.LANGFUSE_PUBLIC_KEY
const SECRET_KEY = process.env.LANGFUSE_SECRET_KEY

type LangfuseTrace = {
  id: string
  timestamp: string
  input?: { message?: string } | null
  tags?: string[] | null
  metadata?: { cost_usd?: number; total_tokens?: number; latency_ms?: number } | null
}

// Busca as últimas interações reais do bot no Langfuse para popular o Log de Agentes
export async function GET() {
  if (!PUBLIC_KEY || !SECRET_KEY) {
    return NextResponse.json({ entries: [] })
  }

  try {
    const auth = Buffer.from(`${PUBLIC_KEY}:${SECRET_KEY}`).toString('base64')
    const url = `${LANGFUSE_BASE_URL}/api/public/traces?limit=30&orderBy=timestamp.desc&name=whatsapp-chat`
    const res = await fetch(url, {
      headers: { Authorization: `Basic ${auth}` },
      cache: 'no-store',
    })
    if (!res.ok) {
      console.error('[agent-log] Langfuse retornou', res.status)
      return NextResponse.json({ entries: [] })
    }

    const data = await res.json()
    const traces = (data?.data ?? []) as LangfuseTrace[]

    const entries = traces.map(t => {
      const workflow = t.tags?.[0] ?? 'agendamento'
      const message  = t.input?.message ?? ''
      return {
        id: t.id,
        agent: 'coordenador-clinico',
        action: `[${workflow}] ${message.slice(0, 70)}`,
        status: 'done' as const,
        ts: t.timestamp,
      }
    })

    return NextResponse.json({ entries })
  } catch (err) {
    console.error('[agent-log] erro ao buscar Langfuse:', err)
    return NextResponse.json({ entries: [] })
  }
}
