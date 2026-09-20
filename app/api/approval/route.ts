import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase'

const WA_TOKEN    = process.env.WHATSAPP_API_TOKEN
const WA_PHONE_ID = process.env.WHATSAPP_PHONE_NUMBER_ID

async function sendWhatsApp(phone: string, text: string) {
  if (!WA_TOKEN || !WA_PHONE_ID) return
  await fetch(`https://graph.facebook.com/v19.0/${WA_PHONE_ID}/messages`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${WA_TOKEN}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ messaging_product: 'whatsapp', to: phone, type: 'text', text: { body: text } }),
  })
}

export async function POST(req: NextRequest) {
  try {
    const { id, action, rejectionReason } = await req.json()
    if (!id || !action) return NextResponse.json({ error: 'id e action são obrigatórios' }, { status: 400 })

    const db = createServerClient()

    const { data: approval, error } = await db
      .from('approval_requests')
      .select('*, doctor:doctors(name, specialty)')
      .eq('id', id)
      .single()

    if (error || !approval) return NextResponse.json({ error: 'Aprovação não encontrada' }, { status: 404 })

    if (action === 'approve') {
      await db.from('approval_requests').update({
        status: 'approved',
        reviewed_at: new Date().toISOString(),
        reviewed_by: 'receptionist',
      }).eq('id', id)

      // Send WhatsApp to patient with the suggested time asking SIM/NÃO
      if (approval.session_id) {
        const { data: session } = await db
          .from('wa_sessions')
          .select('phone, id')
          .eq('id', approval.session_id)
          .single()

        if (session?.phone) {
          await sendWhatsApp(session.phone, approval.message_to_patient)
          await db.from('wa_messages').insert({
            session_id: session.id,
            direction: 'outbound',
            body: approval.message_to_patient,
            status: 'sent',
          })
        }
      }

      await db.from('audit_log').insert({
        actor_type: 'receptionist',
        actor_id: 'receptionist',
        action: 'approval_approved',
        record_type: 'approval_request',
        record_id: id,
      })

      return NextResponse.json({ ok: true, action: 'approved' })
    }

    if (action === 'reject') {
      await db.from('approval_requests').update({
        status: 'rejected',
        rejection_reason: rejectionReason ?? 'Sem disponibilidade',
        reviewed_at: new Date().toISOString(),
        reviewed_by: 'receptionist',
      }).eq('id', id)

      // Notify patient that we'll look for another time
      if (approval.session_id) {
        const { data: session } = await db
          .from('wa_sessions')
          .select('phone, id')
          .eq('id', approval.session_id)
          .single()

        if (session?.phone) {
          const msg =
            `Olá, *${approval.patient_name ?? 'Paciente'}*!\n\n` +
            `Infelizmente o horário sugerido não está mais disponível. 😔\n\n` +
            `Nossa equipe está buscando outras opções e entrará em contato em breve.\n\n` +
            `Ou se preferir, pode nos dizer qual especialidade e período prefere para agilizarmos! — Clínica São Lucas 🏥`
          await sendWhatsApp(session.phone, msg)
          await db.from('wa_messages').insert({ session_id: session.id, direction: 'outbound', body: msg, status: 'sent' })
        }
      }

      return NextResponse.json({ ok: true, action: 'rejected' })
    }

    return NextResponse.json({ error: 'Ação inválida. Use "approve" ou "reject".' }, { status: 400 })
  } catch (err) {
    console.error('[approval/route] error:', err)
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 })
  }
}
