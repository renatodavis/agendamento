import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase'
import { requireAuth } from '@/lib/auth'
import { getClinicBasicConfig, capitalize, artigo } from '@/lib/clinic-config-server'
import { sendWhatsAppText, sendAndLog } from '@/lib/whatsapp'

function formatDate(iso: string) {
  return new Date(iso).toLocaleString('pt-BR', {
    day: '2-digit', month: '2-digit', year: 'numeric',
    hour: '2-digit', minute: '2-digit', timeZone: 'UTC',
  })
}

export async function POST(req: NextRequest) {
  const auth = await requireAuth()
  if (auth instanceof NextResponse) return auth

  try {
    const { appointmentId, type, reason, cancelledBy } = await req.json()

    if (!appointmentId || !type) {
      return NextResponse.json({ error: 'appointmentId e type são obrigatórios' }, { status: 400 })
    }
    if (type !== 'cancel') {
      return NextResponse.json({ error: `Tipo de notificação desconhecido: ${type}` }, { status: 400 })
    }

    const db = createServerClient()
    const { clinicName, vocabulary: voc } = await getClinicBasicConfig()

    const { data: appt, error } = await db
      .from('appointments')
      .select(`
        id, scheduled_at, type,
        patient:patients(id, name, phone),
        doctor:doctors(name, specialty)
      `)
      .eq('id', appointmentId)
      .single()

    if (error || !appt) {
      return NextResponse.json({ error: 'Agendamento não encontrado' }, { status: 404 })
    }

    type Patient = { id: string; name: string; phone: string | null }
    type Doctor  = { name: string; specialty: string }
    const patient = appt.patient as unknown as Patient | null
    const doctor  = appt.doctor  as unknown as Doctor  | null

    // Prefere o telefone da sessão do WhatsApp; senão, o do cadastro
    const { data: session } = patient?.id
      ? await db.from('wa_sessions').select('id, phone').eq('patient_id', patient.id).limit(1).maybeSingle()
      : { data: null }
    const phone = session?.phone ?? patient?.phone ?? null

    if (!phone) {
      return NextResponse.json({ ok: false, reason: `${capitalize(voc.client)} sem telefone cadastrado no WhatsApp` })
    }

    const a           = artigo(voc.appointment)
    const patientName = patient?.name ?? capitalize(voc.client)
    const doctorName  = doctor?.name ?? capitalize(voc.professional)
    const specialty   = doctor?.specialty ?? ''
    const dateStr     = formatDate(appt.scheduled_at)
    const reasonStr   = reason ? `\n*Motivo:* ${reason}` : ''
    const byBusiness  = !cancelledBy || cancelledBy === 'clinic'

    const message = byBusiness
      ? `Olá, *${patientName}*! 😔\n\n` +
        `Informamos que ${a === 'a' ? 'sua' : 'seu'} ${voc.appointment} com *${doctorName}* (${specialty}) ` +
        `agendad${a} para *${dateStr}* precisou ser cancelad${a}.${reasonStr}\n\n` +
        `Pedimos desculpas pelo transtorno. ${voc.emoji}\n\n` +
        `Deseja *remarcar* para um novo horário? É só responder aqui.`
      : `Olá, *${patientName}*!\n\n` +
        `Confirmamos o cancelamento d${a} ${voc.appointment} com *${doctorName}* (${specialty}) ` +
        `agendad${a} para *${dateStr}*.${reasonStr}\n\n` +
        `Deseja *remarcar* para outro horário? É só responder aqui. — ${clinicName} ${voc.emoji}`

    if (session?.id) {
      // Pergunta aberta: descarta proposta antiga para que a resposta vá ao assistente
      await db.from('wa_sessions').update({ pending_action: null }).eq('id', session.id)
      await sendAndLog(db, { id: session.id, phone }, message)
    } else {
      await sendWhatsAppText(phone, message)
    }

    await db.from('audit_log').insert({
      actor_type: 'agent',
      actor_id:   'sistema-notificacoes',
      action:     `whatsapp_notify_${type}`,
      record_type: 'appointment',
      record_id:   appointmentId,
    })

    return NextResponse.json({ ok: true })
  } catch (err) {
    console.error('[appointments/notify] error:', err)
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 })
  }
}
