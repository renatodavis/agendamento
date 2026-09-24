import { NextRequest, NextResponse } from 'next/server'
import { processMessage } from '@/lib/chat'
import { maybeCreateApprovalIntercept } from '@/lib/approval-intercept'
import { createServerClient } from '@/lib/supabase'

export async function POST(req: NextRequest) {
  try {
    const { message, sessionId, history } = await req.json()
    if (!message || typeof message !== 'string') {
      return NextResponse.json({ error: 'message required' }, { status: 400 })
    }

    // Pre-AI keyword intercept: garante approval_request antes do modelo responder
    await maybeCreateApprovalIntercept({ text: message, sessionId })

    // Auto-resolve alteracao_horario quando paciente responde SIM/NÃO
    if (sessionId) {
      const isConfirmation = /^(sim|s|yes|1|confirmo|ok|n[aã]o|n|no|2|cancelar)$/i.test(message.trim())
      if (isConfirmation) {
        const db = createServerClient()
        await db.from('approval_requests')
          .update({ status: 'resolved', reviewed_at: new Date().toISOString(), reviewed_by: 'patient' })
          .eq('session_id', sessionId)
          .eq('request_type', 'alteracao_horario')
          .eq('status', 'pending')
      }
    }

    const result = await processMessage({ message, sessionId, history })
    return NextResponse.json(result)
  } catch (err) {
    console.error('[chat/route] error:', err)
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 })
  }
}
