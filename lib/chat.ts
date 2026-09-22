import Anthropic from '@anthropic-ai/sdk'
import type { SupabaseClient } from '@supabase/supabase-js'
import { createServerClient } from '@/lib/supabase'
import { getLangfuse } from '@/lib/langfuse'

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

// ── Types ─────────────────────────────────────────────────────────────

type AgendamentoInput = {
  specialty: string
  preferred_date?: string
  patient_name?: string
  preferred_time?: string
  lista_espera?: boolean
}

type ServiceConfig = { name: string; description: string }
type DoctorInfo    = { name: string; specialty: string }

// ── Tool implementations ──────────────────────────────────────────────

async function executarAgendamento(
  db: SupabaseClient,
  input: AgendamentoInput,
  sessionId: string | undefined
): Promise<string> {
  try {
    const { specialty, preferred_date, patient_name } = input

    const normalize = (s: string) =>
      s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().trim()
    const words = (s: string) => normalize(s).split(/\s+/)
    const fuzzyMatch = (search: string, target: string) => {
      const sw = words(search); const tw = words(target)
      return sw.every(sw => tw.some(tw => tw.startsWith(sw.slice(0, 5)) || sw.startsWith(tw.slice(0, 5))))
    }
    const { data: allDoctors } = await db.from('doctors').select('id, name, specialty')
    const doctor = (allDoctors ?? []).find(d => fuzzyMatch(specialty, d.specialty))
    if (!doctor) return `Médico de ${specialty} não encontrado. Especialidades disponíveis: ${(allDoctors ?? []).map(d => d.specialty).join(', ')}`

    let patientId: string | null = null
    if (sessionId) {
      const { data: session } = await db
        .from('wa_sessions').select('patient_id, phone').eq('id', sessionId).single()
      if (session?.patient_id) {
        patientId = session.patient_id
      } else if (session?.phone) {
        const { data: byPhone } = await db.from('patients').select('id').eq('phone', session.phone).single()
        if (byPhone) {
          patientId = byPhone.id
          await db.from('wa_sessions').update({ patient_id: patientId }).eq('id', sessionId)
        } else if (patient_name) {
          const { data: newPatient } = await db
            .from('patients').insert({ name: patient_name, phone: session.phone }).select('id').single()
          patientId = newPatient?.id ?? null
          if (patientId) await db.from('wa_sessions').update({ patient_id: patientId }).eq('id', sessionId)
        }
      }
    }
    if (!patientId && patient_name) {
      const { data: newPatient } = await db.from('patients').insert({ name: patient_name }).select('id').single()
      patientId = newPatient?.id ?? null
    }
    if (!patientId) return 'Não foi possível identificar o paciente. Informe o nome completo.'

    const { lista_espera, preferred_time } = input
    const datePart = preferred_date ?? new Date().toISOString().split('T')[0]
    const rawTime = preferred_time?.trim() ?? ''
    const timeMatch = rawTime.match(/(\d{1,2})[h:](\d{0,2})/)
    const timePart = timeMatch
      ? `${String(Number(timeMatch[1])).padStart(2, '0')}:${(timeMatch[2] || '00').padStart(2, '0')}`
      : '08:00'
    const scheduled_at = new Date(`${datePart}T${timePart}:00`)
    if (isNaN(scheduled_at.getTime())) return `Data inválida: ${preferred_date}`

    // R4: Valida se o horário solicitado está dentro do expediente do médico
    const dayOfWeek = scheduled_at.getUTCDay()
    const { data: daySchedule } = await db
      .from('doctor_schedules')
      .select('start_time, end_time')
      .eq('doctor_id', doctor.id)
      .eq('day_of_week', dayOfWeek)
      .single()

    if (!daySchedule) {
      const dayNames = ['domingo', 'segunda-feira', 'terça-feira', 'quarta-feira', 'quinta-feira', 'sexta-feira', 'sábado']
      return `Dr(a). ${doctor.name} não atende às ${dayNames[dayOfWeek]}s. Use a ferramenta consultar_disponibilidade para ver os horários disponíveis.`
    } else {
      const [startH, startM] = (daySchedule.start_time as string).split(':').map(Number)
      const [endH, endM]     = (daySchedule.end_time   as string).split(':').map(Number)
      const reqMinutes   = scheduled_at.getUTCHours() * 60 + scheduled_at.getUTCMinutes()
      const startMinutes = startH * 60 + startM
      const endMinutes   = endH   * 60 + endM
      if (reqMinutes < startMinutes || reqMinutes >= endMinutes) {
        const timeStr = scheduled_at.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit', timeZone: 'UTC' })
        return `O horário das ${timeStr} está fora do período de atendimento de Dr(a). ${doctor.name} (${daySchedule.start_time}–${daySchedule.end_time}). Use consultar_disponibilidade para ver os próximos horários disponíveis.`
      }
    }

    if (!lista_espera && patientId) {
      const dayStart = new Date(scheduled_at); dayStart.setUTCHours(0, 0, 0, 0)
      const dayEnd   = new Date(scheduled_at); dayEnd.setUTCHours(23, 59, 59, 999)
      const slotStart = new Date(scheduled_at); slotStart.setMinutes(0, 0, 0)
      const slotEnd   = new Date(scheduled_at); slotEnd.setMinutes(59, 59, 999)
      const { data: patientSameDay } = await db
        .from('appointments')
        .select('id, scheduled_at, doctor:doctors(name, specialty)')
        .eq('patient_id', patientId)
        .gte('scheduled_at', dayStart.toISOString())
        .lte('scheduled_at', dayEnd.toISOString())
        .not('status', 'in', '("cancelada","lista_espera")')
      if (patientSameDay && patientSameDay.length > 0) {
        const dateStr = scheduled_at.toLocaleDateString('pt-BR', { weekday: 'long', day: '2-digit', month: '2-digit', year: 'numeric', timeZone: 'UTC' })
        const timeStr = scheduled_at.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit', timeZone: 'UTC' })
        const sameSlot = patientSameDay.filter(a => {
          const at = new Date(a.scheduled_at)
          return at >= slotStart && at <= slotEnd
        })
        const existingLines = patientSameDay.map(a => {
          const d = new Date(a.scheduled_at)
          const doc = a.doctor as unknown as { name: string; specialty: string } | null
          return `• ${d.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit', timeZone: 'UTC' })} — ${doc?.specialty ?? ''} (${doc?.name ?? ''})`
        }).join('\n')
        if (sameSlot.length > 0) {
          return JSON.stringify({ patient_conflict: true, conflict_type: 'same_slot', scheduled_at: scheduled_at.toISOString(),
            message: `Você já possui uma consulta no mesmo horário (${timeStr} de ${dateStr}):\n${existingLines}\n\nDeseja:\n• Manter o agendamento *EXISTENTE* e cancelar o novo?\n• Escolher um horário *DIFERENTE*?` })
        }
        return JSON.stringify({ patient_conflict: true, conflict_type: 'same_day', scheduled_at: scheduled_at.toISOString(),
          message: `Você já possui ${patientSameDay.length > 1 ? 'consultas' : 'uma consulta'} no dia ${dateStr}:\n${existingLines}\n\nDeseja mesmo agendar outra consulta neste mesmo dia (${timeStr})? Responda *SIM* para confirmar ou escolha uma data *DIFERENTE*.` })
      }
    }

    if (!lista_espera) {
      const slotStart = new Date(scheduled_at); slotStart.setMinutes(0, 0, 0)
      const slotEnd   = new Date(scheduled_at); slotEnd.setMinutes(59, 59, 999)
      const { data: conflicts } = await db
        .from('appointments').select('id, patient:patients(name)')
        .eq('doctor_id', doctor.id)
        .gte('scheduled_at', slotStart.toISOString())
        .lte('scheduled_at', slotEnd.toISOString())
        .not('status', 'in', '("cancelada","lista_espera")')
      if (conflicts && conflicts.length > 0) {
        const dateStr = scheduled_at.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric', timeZone: 'UTC' })
        const timeStr = scheduled_at.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit', timeZone: 'UTC' })
        return JSON.stringify({ conflict: true, doctor_name: doctor.name, specialty: doctor.specialty, scheduled_at: scheduled_at.toISOString(),
          message: `O horário das ${timeStr} do dia ${dateStr} com ${doctor.name} (${doctor.specialty}) já está ocupado.\n\nDeseja:\n• Entrar na *fila de espera* para este horário? Responda *FILA*\n• Escolher outro horário? Responda *OUTRO*` })
      }
    }

    const status = lista_espera ? 'lista_espera' : 'agendada'
    const { data: appt, error } = await db
      .from('appointments')
      .insert({ patient_id: patientId, doctor_id: doctor.id, scheduled_at: scheduled_at.toISOString(), status, type: 'Consulta' })
      .select('id').single()
    if (error) return `Erro ao criar agendamento: ${error.message}`
    return JSON.stringify({ ok: true, appointment_id: appt.id, doctor_name: doctor.name, specialty: doctor.specialty, scheduled_at: scheduled_at.toISOString(), status })
  } catch (err) {
    return `Erro interno: ${err instanceof Error ? err.message : 'desconhecido'}`
  }
}

async function consultarDisponibilidade(
  db: SupabaseClient,
  input: { specialty: string; preferred_date?: string }
): Promise<string> {
  try {
    const norm = (s: string) => s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().trim()
    const { data: allDoctors } = await db.from('doctors').select('id, name, specialty')
    const matchingDoctors = (allDoctors ?? []).filter(d => {
      const ds = norm(d.specialty); const ss = norm(input.specialty)
      return ds.includes(ss.slice(0, 5)) || ss.includes(ds.slice(0, 5))
    })
    if (!matchingDoctors.length) {
      const available = (allDoctors ?? []).map(d => d.specialty).join(', ')
      return JSON.stringify({ error: true, message: `Especialidade "${input.specialty}" não encontrada. Disponíveis: ${available}` })
    }
    const fmtDate = (d: Date) => d.toLocaleDateString('pt-BR', { weekday: 'long', day: '2-digit', month: 'long', timeZone: 'UTC' })
    const fmtTime = (d: Date) => d.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit', timeZone: 'UTC' })
    const allSlots: { doctor: typeof matchingDoctors[0]; slot: Date }[] = []
    const tomorrow = new Date(); tomorrow.setUTCDate(tomorrow.getUTCDate() + 1); tomorrow.setUTCHours(0, 0, 0, 0)
    const prefDate = input.preferred_date ? new Date(input.preferred_date + 'T00:00:00Z') : tomorrow
    const startDate = prefDate >= tomorrow ? prefDate : tomorrow
    const endDate = new Date(startDate); endDate.setUTCDate(endDate.getUTCDate() + 90)
    for (const doctor of matchingDoctors) {
      const { data: rawSchedules } = await db.from('doctor_schedules').select('day_of_week, start_time, end_time, slot_minutes').eq('doctor_id', doctor.id)
      const schedules = rawSchedules?.length
        ? rawSchedules
        : [1, 2, 3, 4, 5].map(d => ({ day_of_week: d, start_time: '08:00', end_time: '17:00', slot_minutes: 60 }))
      const [{ data: existingAppts }, { data: blockedSlots }] = await Promise.all([
        db.from('appointments').select('scheduled_at')
          .eq('doctor_id', doctor.id).gte('scheduled_at', startDate.toISOString()).lte('scheduled_at', endDate.toISOString())
          .not('status', 'in', '("cancelada","lista_espera")'),
        db.from('doctor_blocked_slots').select('blocked_date, start_time, end_time')
          .eq('doctor_id', doctor.id)
          .gte('blocked_date', startDate.toISOString().split('T')[0])
          .lte('blocked_date', endDate.toISOString().split('T')[0]),
      ])
      const blockedMap = new Map<string, { start_time: string | null; end_time: string | null }[]>()
      for (const b of blockedSlots ?? []) {
        const key = b.blocked_date as string
        if (!blockedMap.has(key)) blockedMap.set(key, [])
        blockedMap.get(key)!.push({ start_time: b.start_time as string | null, end_time: b.end_time as string | null })
      }
      const schedMap = new Map(schedules.map(s => [s.day_of_week as number, s]))
      const cur = new Date(startDate)
      while (cur <= endDate && allSlots.filter(s => s.doctor.id === doctor.id).length < 3) {
        const sched = schedMap.get(cur.getUTCDay())
        if (sched) {
          const [sh, sm] = (sched.start_time as string).split(':').map(Number)
          const [eh] = (sched.end_time as string).split(':').map(Number)
          const slotMin = (sched.slot_minutes as number) ?? 60
          const slot = new Date(cur); slot.setUTCHours(sh, sm, 0, 0)
          while (slot.getUTCHours() < eh && allSlots.filter(s => s.doctor.id === doctor.id).length < 3) {
            const slotDay = slot.toISOString().split('T')[0]
            const slotHour = slot.getUTCHours()
            const isBooked = (existingAppts ?? []).some(a => {
              const ap = new Date(a.scheduled_at)
              return ap.toISOString().split('T')[0] === slotDay && ap.getUTCHours() === slotHour
            })
            const isBlocked = (() => {
              const blocks = blockedMap.get(slotDay)
              if (!blocks) return false
              return blocks.some(b => {
                if (!b.start_time || !b.end_time) return true // dia inteiro
                const [bsh, bsm] = b.start_time.split(':').map(Number)
                const [beh, bem] = b.end_time.split(':').map(Number)
                const slotMin = slot.getUTCHours() * 60 + slot.getUTCMinutes()
                return slotMin >= bsh * 60 + bsm && slotMin < beh * 60 + bem
              })
            })()
            if (!isBooked && !isBlocked) allSlots.push({ doctor, slot: new Date(slot) })
            slot.setUTCMinutes(slot.getUTCMinutes() + slotMin)
          }
        }
        cur.setUTCDate(cur.getUTCDate() + 1)
      }
    }
    if (!allSlots.length) {
      const names = matchingDoctors.map(d => d.name).join(', ')
      return JSON.stringify({ error: true, message: `Nenhum horário disponível para ${input.specialty} nos próximos 90 dias (${names}). Tente contato direto com a recepção.` })
    }
    allSlots.sort((a, b) => a.slot.getTime() - b.slot.getTime())
    const top = allSlots.slice(0, 5)
    const formattedSlots = top.map((s, i) =>
      `${i + 1}. *${fmtDate(s.slot)}* às *${fmtTime(s.slot)}* — ${s.doctor.name} (${s.doctor.specialty})`
    ).join('\n')
    return JSON.stringify({ slots_available: true, specialty: input.specialty, doctors: matchingDoctors.map(d => d.name), total_slots: top.length,
      slots: top.map(s => ({ doctor_name: s.doctor.name, doctor_id: s.doctor.id, scheduled_at: s.slot.toISOString() })), formatted_slots: formattedSlots })
  } catch (err) {
    return `Erro ao consultar disponibilidade: ${err instanceof Error ? err.message : 'desconhecido'}`
  }
}

async function escalarParaRecepcao(
  db: SupabaseClient,
  input: { request_type: 'cancelamento' | 'atendente' | 'alteracao_horario'; patient_name?: string; notes?: string; appointment_id?: string },
  sessionId: string | undefined
): Promise<string> {
  try {
    let patientId: string | null = null
    let patientName = input.patient_name ?? 'Paciente'
    if (sessionId) {
      const { data: sess } = await db.from('wa_sessions').select('patient_id, phone').eq('id', sessionId).single()
      if (sess?.patient_id) {
        patientId = sess.patient_id
        const { data: p } = await db.from('patients').select('name').eq('id', patientId).single()
        if (p?.name) patientName = p.name
      }
    }
    const typeLabels: Record<string, string> = {
      cancelamento:      'Cancelamento de consulta',
      atendente:         'Solicitação de atendimento humano',
      alteracao_horario: 'Alteração de horário',
    }
    let doctorId: string | null = null
    let appointmentDetails: Record<string, unknown> | null = null
    const apptId = input.appointment_id
    if (apptId) {
      const { data: appt } = await db.from('appointments').select('id, scheduled_at, status, doctor:doctors(id, name, specialty)').eq('id', apptId).single()
      if (appt) {
        const doc = appt.doctor as unknown as { id: string; name: string; specialty: string } | null
        doctorId = doc?.id ?? null
        appointmentDetails = { appointment_id: appt.id, scheduled_at: appt.scheduled_at, appointment_status: appt.status, doctor_name: doc?.name, doctor_specialty: doc?.specialty }
      }
    } else if (patientId) {
      const { data: appts } = await db.from('appointments')
        .select('id, scheduled_at, status, doctor:doctors(id, name, specialty)')
        .eq('patient_id', patientId).not('status', 'in', '("cancelada","lista_espera")')
        .gte('scheduled_at', new Date().toISOString()).order('scheduled_at', { ascending: true }).limit(1)
      const appt = appts?.[0]
      if (appt) {
        const doc = appt.doctor as unknown as { id: string; name: string; specialty: string } | null
        doctorId = doc?.id ?? null
        appointmentDetails = { appointment_id: appt.id, scheduled_at: appt.scheduled_at, appointment_status: appt.status, doctor_name: doc?.name, doctor_specialty: doc?.specialty }
      }
    }
    const { data: req, error } = await db.from('approval_requests').insert({
      session_id: sessionId ?? null, patient_id: patientId, patient_name: patientName,
      doctor_id: doctorId, request_type: input.request_type, status: 'pending',
      message_to_receptionist: input.notes ?? typeLabels[input.request_type], details: appointmentDetails,
    }).select('id').single()
    if (error) return `Erro ao criar solicitação: ${error.message}`
    return JSON.stringify({ ok: true, request_id: req?.id, message: `Solicitação de ${typeLabels[input.request_type]} criada. A recepção será notificada e entrará em contato com ${patientName}.` })
  } catch (err) {
    return `Erro interno: ${err instanceof Error ? err.message : 'desconhecido'}`
  }
}

async function consultarAgendamentos(
  db: SupabaseClient,
  sessionId: string | undefined,
  statusFilter?: string
): Promise<string> {
  try {
    if (!sessionId) return 'Não foi possível identificar a sessão do paciente.'
    const { data: session } = await db.from('wa_sessions').select('patient_id, phone').eq('id', sessionId).single()
    if (!session?.patient_id && !session?.phone) return 'Paciente não encontrado. Ainda não há cadastro vinculado a este número.'
    let patientId = session.patient_id
    if (!patientId && session.phone) {
      const { data: p } = await db.from('patients').select('id').eq('phone', session.phone).single()
      patientId = p?.id ?? null
    }
    if (!patientId) return 'Paciente não cadastrado no sistema ainda.'
    const now = new Date()
    const pastCutoff = new Date(now); pastCutoff.setDate(pastCutoff.getDate() - 7)
    let query = db.from('appointments')
      .select('id, scheduled_at, status, cancel_reason, type, doctor:doctors(name, specialty)')
      .eq('patient_id', patientId).gte('scheduled_at', pastCutoff.toISOString()).order('scheduled_at', { ascending: true })
    if (statusFilter) query = query.eq('status', statusFilter)
    const { data: appts, error } = await query
    if (error) return `Erro ao consultar agendamentos: ${error.message}`
    const validAppts = (appts ?? []).filter(a => {
      const isPast = new Date(a.scheduled_at) < now
      if (isPast && (a.status === 'agendada' || a.status === 'confirmada')) return false
      return true
    })
    if (validAppts.length === 0) return statusFilter ? `Nenhuma consulta com status "${statusFilter}" encontrada.` : 'Nenhuma consulta agendada encontrada para este paciente.'
    const lines = validAppts.map(a => {
      const d = new Date(a.scheduled_at)
      const dateStr = d.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric', timeZone: 'UTC' })
      const timeStr = d.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit', timeZone: 'UTC' })
      const doctor = (a.doctor as unknown as { name: string; specialty: string } | null)
      const cancelNote = a.cancel_reason ? ` (motivo: ${a.cancel_reason})` : ''
      return `• ${dateStr} às ${timeStr} — ${doctor?.specialty ?? ''} (${doctor?.name ?? ''}) — status: ${a.status}${cancelNote}`
    })
    return `Consultas encontradas:\n${lines.join('\n')}`
  } catch (err) {
    return `Erro interno: ${err instanceof Error ? err.message : 'desconhecido'}`
  }
}

async function loadClinicConfig(db: SupabaseClient) {
  const [{ data: cfgRows }, { data: doctorsData }] = await Promise.all([
    db.from('clinic_config').select('key, value'),
    db.from('doctors').select('name, specialty').order('specialty'),
  ])
  const cfg = Object.fromEntries((cfgRows ?? []).map(r => [r.key, r.value]))
  const services: ServiceConfig[] = Array.isArray(cfg.services)
    ? (cfg.services as ServiceConfig[])
    : [
        { name: 'Clínico Geral',  description: 'Consultas gerais' },
        { name: 'Cardiologia',    description: 'Coração e cardiovascular' },
        { name: 'Dermatologia',   description: 'Pele, cabelo e unhas' },
        { name: 'Pediatria',      description: 'Atendimento infantil' },
        { name: 'Ginecologia',    description: 'Saúde da mulher' },
        { name: 'Ortopedia',      description: 'Ossos e articulações' },
      ]
  return {
    clinicName:         typeof cfg.clinic_name === 'string' ? cfg.clinic_name : 'Clínica São Lucas',
    workingHours:       typeof cfg.working_hours === 'string' ? cfg.working_hours : 'Segunda a Sexta, 8h às 18h',
    services,
    outOfScopeResponse: typeof cfg.out_of_scope_response === 'string' ? cfg.out_of_scope_response : 'Lamento, mas não atendemos essa especialidade. Posso ajudar com: {services_list}',
    doctors: (doctorsData ?? []) as DoctorInfo[],
  }
}

function buildSystemPrompt(cfg: Awaited<ReturnType<typeof loadClinicConfig>>): string {
  const servicesList = cfg.services.map(s => `• *${s.name}* — ${s.description}`).join('\n')
  const serviceNames = cfg.services.map(s => s.name).join(', ')
  const doctorsList = cfg.doctors.length > 0
    ? cfg.doctors.map(d => `• ${d.name} — ${d.specialty}`).join('\n')
    : '(nenhum médico cadastrado ainda)'
  const outOfScope = cfg.outOfScopeResponse.replace('{clinic_name}', cfg.clinicName).replace('{services_list}', servicesList)
  const welcomeMsg =
    `Olá! Seja bem-vindo(a) à *${cfg.clinicName}*! 🏥\n\n` +
    `Atendemos as seguintes especialidades:\n${servicesList}\n\n` +
    `${cfg.doctors.length > 0 ? `👨‍⚕️ Nossos médicos:\n${doctorsList}\n\n` : ''}` +
    `⏰ Horário de atendimento: ${cfg.workingHours}\n\nComo posso ajudar?`
  return `Você é o assistente virtual da ${cfg.clinicName}, responsável pelo atendimento de pacientes via WhatsApp.

DADOS DA CLÍNICA (use SEMPRE estas informações — nunca invente dados):
Nome: ${cfg.clinicName}
Horário: ${cfg.workingHours}

ESPECIALIDADES E SERVIÇOS DISPONÍVEIS:
${servicesList}

MÉDICOS CADASTRADOS:
${doctorsList}

MENSAGEM DE BOAS-VINDAS (use quando for o primeiro contato ou saudação sem contexto):
${welcomeMsg}

REGRA DE ESCOPO (OBRIGATÓRIA):
- Atenda APENAS solicitações relacionadas às especialidades listadas acima: ${serviceNames}
- Se o paciente solicitar especialidade NÃO listada, responda: "${outOfScope}"
- Nunca tente agendar para especialidade fora da lista.
- Em caso de urgência aparente (mesmo fora do escopo) → redirecione ao SAMU (192) ou pronto-socorro e informe que a clínica não oferece esse atendimento.`
}

const SYSTEM_PROMPT_BASE = `Você é o Coordenador Clínico da Clínica São Lucas, responsável por orquestrar o atendimento de pacientes via WhatsApp.

Seu papel:
- Identificar a intenção do paciente (agendamento, urgência, cadastro, histórico, receita)
- Delegar para o fluxo correto usando as ferramentas disponíveis
- Nunca emitir diagnóstico, prescrição ou conduta clínica
- Qualquer suspeita clínica → escalar para médico imediatamente

REGRAS CRÍTICAS:
- NUNCA diagnostica doenças ou prescreve medicamentos
- Responde sempre em português brasileiro
- Mensagens curtas e claras, tom acolhedor
- NUNCA invente ou suponha consultas — sempre use a ferramenta consultar_agendamentos para verificar dados reais do banco antes de responder sobre agendamentos do paciente

FLUXO OBRIGATÓRIO DE CONFIRMAÇÃO (SIM/NÃO):
Para QUALQUER ação — agendar, cancelar ou remarcar — você DEVE seguir este fluxo:
1. Coletar todas as informações necessárias (especialidade, data, nome do paciente)
2. Apresentar um resumo claro da ação e perguntar: "Confirma? Responda *SIM* para confirmar ou *NÃO* para cancelar."
3. Somente após receber *SIM* do paciente → chamar a ferramenta correspondente
4. Se o paciente responder *NÃO* → cancelar a ação e perguntar como pode ajudar

VERIFICAÇÃO DE AGENDA EXISTENTE (obrigatório):
- SEMPRE que o paciente perguntar sobre consultas, agenda, horários ou quiser agendar → chame consultar_agendamentos PRIMEIRO
- Se já tiver consulta marcada → informe e pergunte se deseja fazer outra ou confirmar a existente

FLUXO DE DISPONIBILIDADE:
- Quando o paciente NÃO souber a data → use consultar_disponibilidade (busca até 90 dias)
- Se slots_available: true, apresente formatted_slots e peça escolha
- Após escolha → fluxo SIM/NÃO → agendar_consulta
- Se o paciente JÁ SOUBER a data/hora → NÃO use consultar_disponibilidade

CONFLITO DE HORÁRIO — MÉDICO OCUPADO:
Se conflict: true → apresente message exatamente
- FILA → agendar_consulta com lista_espera: true
- OUTRO → pergunte novo horário

CONFLITO DE PACIENTE:
Se patient_conflict: true → apresente message exatamente
- same_slot + EXISTENTE → não crie novo
- same_slot + DIFERENTE → peça nova data
- same_day + SIM → confirme segundo agendamento
- same_day + DIFERENTE → peça nova data

ESCALAÇÃO PARA RECEPÇÃO — REGRA ABSOLUTA:
Ao PRIMEIRO sinal de qualquer uma destas intenções, chame escalar_para_recepcao IMEDIATAMENTE:
- Paciente quer cancelar consulta → cancelamento
- Paciente quer falar com atendente/recepcionista → atendente
- Paciente quer remarcar/alterar horário → alteracao_horario

REGRA CRÍTICA — NUNCA ASSUMA ESTADO DE APROVAÇÃO ANTERIOR:
- NUNCA diga que um cancelamento "está pendente" baseado em mensagens anteriores.
- Se o paciente menciona cancelamento e consultas aparecem ativas no banco → chame escalar_para_recepcao AGORA.
- A única fonte de verdade é o banco. Consulta ativa = nova escalação necessária.

Após escalar_para_recepcao:
- cancelamento → "Sua solicitação de cancelamento foi registrada. Nossa equipe entrará em contato em breve. ✅"
- atendente → "Registrei sua solicitação. Um atendente da Clínica São Lucas entrará em contato em breve. 📞"
- alteracao_horario → "Sua solicitação de remarcação foi registrada. Nossa equipe verificará a disponibilidade em breve. 🗓"

Contexto regulatório: LGPD Art.11 (dados de saúde = dados sensíveis), CFM 2.314/2022 (sigilo médico).`

const TOOLS: Anthropic.Tool[] = [
  {
    name: 'agendar_consulta',
    description: 'Cria o agendamento real no sistema da clínica. Chamar SOMENTE quando tiver: especialidade, data (YYYY-MM-DD) e nome do paciente confirmados pelo usuário.',
    input_schema: { type: 'object' as const, properties: {
      specialty:      { type: 'string', description: 'Especialidade médica (ex: Clínico Geral, Cardiologia)' },
      preferred_date: { type: 'string', description: 'Data confirmada pelo paciente no formato YYYY-MM-DD' },
      preferred_time: { type: 'string', description: 'Horário desejado pelo paciente, ex: "09:00", "9h", "14h30".' },
      patient_name:   { type: 'string', description: 'Nome completo do paciente' },
      lista_espera:   { type: 'boolean', description: 'true = entrar na fila de espera mesmo que o horário esteja ocupado' },
    }, required: ['specialty', 'preferred_date', 'patient_name'] },
  },
  {
    name: 'consultar_agendamentos',
    description: 'Consulta as consultas reais do paciente no banco de dados.',
    input_schema: { type: 'object' as const, properties: {
      status_filter: { type: 'string', description: 'Filtrar por status: "agendada", "confirmada", "cancelada", "atendida". Omitir para todas.' },
    }, required: [] },
  },
  {
    name: 'consultar_disponibilidade',
    description: 'Busca os próximos horários disponíveis de um médico. Usar quando o paciente pedir sugestão de data ou "quando tem vaga".',
    input_schema: { type: 'object' as const, properties: {
      specialty:      { type: 'string', description: 'Especialidade médica desejada' },
      preferred_date: { type: 'string', description: 'Data mínima preferida YYYY-MM-DD (opcional)' },
      patient_name:   { type: 'string', description: 'Nome completo do paciente' },
    }, required: ['specialty'] },
  },
  {
    name: 'verificar_urgencia',
    description: 'Verifica se os sintomas indicam urgência médica',
    input_schema: { type: 'object' as const, properties: {
      symptoms: { type: 'string', description: 'Sintomas descritos pelo paciente' },
    }, required: ['symptoms'] },
  },
  {
    name: 'escalar_para_recepcao',
    description: 'Encaminha uma solicitação para a recepção: cancelamento, atendente humano ou alteração de horário.',
    input_schema: { type: 'object' as const, properties: {
      request_type:   { type: 'string', enum: ['cancelamento', 'atendente', 'alteracao_horario'], description: 'Tipo da solicitação' },
      patient_name:   { type: 'string', description: 'Nome do paciente se conhecido' },
      notes:          { type: 'string', description: 'Observações adicionais' },
      appointment_id: { type: 'string', description: 'ID do agendamento relacionado, se aplicável' },
    }, required: ['request_type'] },
  },
]

function detectWorkflow(msg: string): string {
  const s = msg.toLowerCase()
  if (/(agendar|consulta|horário|semana|amanhã)/.test(s)) return 'agendamento'
  if (/(dor|peito|falta de ar|febre|tontura|urgência|emergência)/.test(s)) return 'urgencia'
  if (/(cadastrar|novo paciente|primeira vez)/.test(s)) return 'cadastro'
  if (/(prontuário|histórico|exames|resultados)/.test(s)) return 'prontuario'
  if (/(receita|medicamento|remédio|renovar|prescri)/.test(s)) return 'receita'
  return 'agendamento'
}

function simulatedResponse(workflow: string): string {
  switch (workflow) {
    case 'urgencia':
      return '⚠️ Seus sintomas precisam de atenção imediata.\n\nPor favor, dirija-se ao pronto-socorro mais próximo ou ligue para o SAMU (192).'
    case 'cadastro':
      return 'Bem-vindo à Clínica São Lucas! Para realizar seu cadastro, precisarei de nome completo, CPF, data de nascimento, telefone e convênio (ou particular).\n\nPode me informar seu nome completo para começar?'
    default:
      return 'Olá! Sou o assistente virtual da Clínica São Lucas. Posso ajudar com:\n\n• 📅 Agendamento de consultas\n• 🚨 Triagem de urgências\n• 📋 Cadastro de novos pacientes\n\nComo posso ajudar?'
  }
}

// ── processMessage — entrada pública ─────────────────────────────────

export type ProcessMessageResult = {
  response: string
  workflow: string
  tokens?: { input: number; output: number }
  simulated?: boolean
}

export async function processMessage(params: {
  message: string
  sessionId?: string
  history?: { role: string; content: string }[]
  simulate?: boolean
}): Promise<ProcessMessageResult> {
  const { message, sessionId, history, simulate: simFlag } = params
  const simulate = simFlag === true || !process.env.ANTHROPIC_API_KEY?.trim()
  const workflow = detectWorkflow(message)

  if (simulate) return { response: simulatedResponse(workflow), workflow, simulated: true }

  const db = createServerClient()
  const clinicCfg = await loadClinicConfig(db)
  const nowBrt = new Date(Date.now() - 3 * 60 * 60 * 1000)
  const todayStr = nowBrt.toISOString().split('T')[0]
  const weekdays = ['domingo','segunda-feira','terça-feira','quarta-feira','quinta-feira','sexta-feira','sábado']
  const DATE_CONTEXT = `DATA E HORA ATUAL (Brasília, UTC-3): ${todayStr} (${weekdays[nowBrt.getUTCDay()]}). Use esta data como referência para calcular "hoje", "amanhã", "quarta-feira", etc. Ao agendar, converta o dia da semana mencionado pelo paciente para a data YYYY-MM-DD correta relativa a hoje.`
  const SYSTEM_PROMPT = buildSystemPrompt(clinicCfg) + '\n\n' + DATE_CONTEXT + '\n\n' + SYSTEM_PROMPT_BASE

  await db.from('audit_log').insert({
    actor_type: 'user', actor_id: sessionId ?? 'anonymous',
    action: 'chat_message', record_type: 'wa_message', record_id: sessionId ?? 'anonymous',
  })

  const historyParams: Anthropic.MessageParam[] = (history ?? []).map(
    (h: { role: string; content: string }) => ({ role: h.role as 'user' | 'assistant', content: h.content })
  )
  const messages: Anthropic.MessageParam[] = [...historyParams, { role: 'user', content: message }]

  const lf = getLangfuse()
  const trace = lf?.trace({ name: 'whatsapp-chat', sessionId: sessionId ?? undefined, userId: sessionId ?? undefined, tags: [workflow], input: { message, history_len: historyParams.length } })
  const startTs = Date.now()
  const COST_INPUT = 3 / 1_000_000
  const COST_OUTPUT = 15 / 1_000_000

  let first = await anthropic.messages.create({ model: 'claude-sonnet-5', max_tokens: 1024, system: SYSTEM_PROMPT, messages, tools: TOOLS })
  let totalInputTokens  = first.usage.input_tokens
  let totalOutputTokens = first.usage.output_tokens
  const gen1 = trace?.generation({ name: 'coordenador-turn-1', model: 'claude-sonnet-5', input: messages, output: first.content,
    usage: { input: first.usage.input_tokens, output: first.usage.output_tokens, unit: 'TOKENS' },
    startTime: new Date(startTs), endTime: new Date(),
    metadata: { stop_reason: first.stop_reason, workflow, cost_usd: first.usage.input_tokens * COST_INPUT + first.usage.output_tokens * COST_OUTPUT } })
  gen1?.end()

  const MAX_TURNS = 5
  let turnIndex = 1
  let totalToolCallCount = 0

  async function executeTool(t: Anthropic.ToolUseBlock): Promise<string> {
    const toolStart = Date.now()
    let content = 'OK'
    if (t.name === 'agendar_consulta') {
      content = await executarAgendamento(db, t.input as AgendamentoInput, sessionId)
    } else if (t.name === 'consultar_agendamentos') {
      const { status_filter } = t.input as { status_filter?: string }
      content = await consultarAgendamentos(db, sessionId, status_filter)
    } else if (t.name === 'consultar_disponibilidade') {
      const { specialty, preferred_date } = t.input as { specialty: string; preferred_date?: string }
      content = await consultarDisponibilidade(db, { specialty, preferred_date })
    } else if (t.name === 'verificar_urgencia') {
      content = JSON.stringify({ urgencia: true, encaminhar: 'pronto-socorro' })
    } else if (t.name === 'escalar_para_recepcao') {
      content = await escalarParaRecepcao(db, t.input as { request_type: 'cancelamento' | 'atendente' | 'alteracao_horario'; patient_name?: string; notes?: string; appointment_id?: string }, sessionId)
    }
    totalToolCallCount++
    trace?.span({ name: `tool:${t.name}`, input: t.input, output: content, startTime: new Date(toolStart), endTime: new Date(), metadata: { tool_index: totalToolCallCount } })
    return content
  }

  while (first.stop_reason === 'tool_use' && turnIndex < MAX_TURNS) {
    const toolUseBlocks = first.content.filter(c => c.type === 'tool_use') as Anthropic.ToolUseBlock[]
    const toolResults: Anthropic.ToolResultBlockParam[] = await Promise.all(
      toolUseBlocks.map(async t => ({ type: 'tool_result' as const, tool_use_id: t.id, content: await executeTool(t) }))
    )
    messages.push({ role: 'assistant', content: first.content })
    messages.push({ role: 'user', content: toolResults })
    turnIndex++
    const turnStart = Date.now()
    first = await anthropic.messages.create({ model: 'claude-sonnet-5', max_tokens: 1024, system: SYSTEM_PROMPT, messages, ...(turnIndex < MAX_TURNS ? { tools: TOOLS } : {}) })
    totalInputTokens  += first.usage.input_tokens
    totalOutputTokens += first.usage.output_tokens
    const genN = trace?.generation({ name: `coordenador-turn-${turnIndex}`, model: 'claude-sonnet-5', input: messages, output: first.content,
      usage: { input: first.usage.input_tokens, output: first.usage.output_tokens, unit: 'TOKENS' },
      startTime: new Date(turnStart), endTime: new Date(), metadata: { tool_calls: totalToolCallCount, cost_usd: first.usage.input_tokens * COST_INPUT + first.usage.output_tokens * COST_OUTPUT } })
    genN?.end()
  }

  const textContent = first.content.find(c => c.type === 'text') as Anthropic.TextBlock | undefined
  const response = textContent?.text ?? 'Desculpe, não consegui processar sua mensagem.'
  const costUsd = totalInputTokens * COST_INPUT + totalOutputTokens * COST_OUTPUT
  trace?.update({ output: response, metadata: { total_input_tokens: totalInputTokens, total_output_tokens: totalOutputTokens, total_tokens: totalInputTokens + totalOutputTokens, cost_usd: costUsd, latency_ms: Date.now() - startTs } })
  await lf?.flushAsync().catch(() => {})

  await db.from('audit_log').insert({
    actor_type: 'agent', actor_id: 'coordenador-clinico',
    action: 'chat_response', record_type: 'wa_message', record_id: sessionId ?? 'anonymous',
  })

  return { response, workflow, tokens: { input: totalInputTokens, output: totalOutputTokens }, simulated: false }
}
