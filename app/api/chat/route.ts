import { NextRequest, NextResponse } from 'next/server'
import { processMessage } from '@/lib/chat'

export async function POST(req: NextRequest) {
  try {
    const { message, sessionId, history, simulate } = await req.json()
    if (!message || typeof message !== 'string') {
      return NextResponse.json({ error: 'message required' }, { status: 400 })
    }
    const result = await processMessage({ message, sessionId, history, simulate })
    return NextResponse.json(result)
  } catch (err) {
    console.error('[chat/route] error:', err)
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 })
  }
}
