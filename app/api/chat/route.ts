import { NextRequest, NextResponse } from 'next/server'
import { processMessage } from '@/lib/chat'
import { maybeCreateApprovalIntercept } from '@/lib/approval-intercept'

export async function POST(req: NextRequest) {
  try {
    const { message, sessionId, history, simulate } = await req.json()
    if (!message || typeof message !== 'string') {
      return NextResponse.json({ error: 'message required' }, { status: 400 })
    }

    // Pre-AI keyword intercept: garante approval_request antes do modelo responder
    await maybeCreateApprovalIntercept({ text: message, sessionId })

    const result = await processMessage({ message, sessionId, history, simulate })
    return NextResponse.json(result)
  } catch (err) {
    console.error('[chat/route] error:', err)
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 })
  }
}
