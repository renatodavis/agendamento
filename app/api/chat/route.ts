import { NextRequest, NextResponse } from 'next/server'
import { processMessage } from '@/lib/chat'
import { maybeCreateApprovalIntercept } from '@/lib/approval-intercept'
import { resolvePendingReply } from '@/lib/pending-action'
import { createServerClient } from '@/lib/supabase'
import { requireAuth } from '@/lib/auth'

// Simulador do painel: mesmo pipeline do webhook, sem envio pelo WhatsApp
export async function POST(req: NextRequest) {
  const auth = await requireAuth()
  if (auth instanceof NextResponse) return auth

  try {
    const { message, sessionId, history } = await req.json()
    if (!message || typeof message !== 'string' || !sessionId || typeof sessionId !== 'string') {
      return NextResponse.json({ error: 'message e sessionId são obrigatórios' }, { status: 400 })
    }

    const db = createServerClient()
    const { data: session } = await db.from('wa_sessions').select('id').eq('id', sessionId).maybeSingle()
    if (!session) return NextResponse.json({ error: 'Sessão não encontrada' }, { status: 404 })

    const pendingReply = await resolvePendingReply(db, sessionId, message)
    if (pendingReply) return NextResponse.json({ response: pendingReply, workflow: 'confirmacao' })

    await maybeCreateApprovalIntercept({ text: message, sessionId })

    const result = await processMessage({ message, sessionId, history })
    return NextResponse.json(result)
  } catch (err) {
    console.error('[chat/route] error:', err)
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 })
  }
}
