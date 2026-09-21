import { NextRequest, NextResponse } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'
import { createServerClient } from '@/lib/supabase'
import { getLangfuse } from '@/lib/langfuse'
import type { SupabaseClient } from '@supabase/supabase-js'

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

type AgendamentoInput = {
  specialty: string
  preferred_date?: string
  patient_name?: string
  preferred_time?: string
  lista_espera?: boolean   // true → entra na fila mesmo com conflito
}

async function executarAgendamento(
  db: SupabaseClient,
  input: AgendamentoInput,
  sessionId: string | undefined
): Promise<string> {
  try {
    const { specialty, preferred_date, patient_name } = input

    // 1. Find doctor by specialty — normalize + prefix matching (handles "Clínico"/"Clinica" etc.)
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

    // 2. Find or create patient
    let patientId: string | null = null

    // Try to find patient by session phone
    if (sessionId) {
      const { data: session } = await db
        .from('wa_sessions')
        .select('patient_id, phone')
        .eq('id', sessionId)
        .single()

      if (session?.patient_id) {
        patientId = session.patient_id
      } else if (session?.phone) {
        // Find by phone
        const { data: byPhone } = await db
          .from('patients')
          .select('id')
          .eq('phone', session.phone)
          .single()
        if (byPhone) {
          patientId = byPhone.id
          // Link patient to session
          await db.from('wa_sessions').update({ patient_id: patientId }).eq('id', sessionId)
        } else if (patient_name) {
          // Create patient
          const { data: newPatient } = await db
            .from('patients')
            .insert({ name: patient_name, phone: session.phone })
            .select('id')
            .single()
          patientId = newPatient?.id ?? null
          if (patientId) {
            await db.from('wa_sessions').update({ patient_id: patientId }).eq('id', sessionId)
          }
        }
      }
    }

    if (!patientId && patient_name) {
      const { data: newPatient } = await db
        .from('patients')
        .insert({ name: patient_name })
        .select('id')
        .single()
      patientId = newPatient?.id ?? null
    }

    if (!patientId) return 'Não foi possível identificar o paciente. Informe o nome completo.'

    // 3. Parse date and time — use preferred_time if provided, else 08:00
    const { lista_espera, preferred_time } = input
    const datePart = preferred_date ?? new Date().toISOString().split('T')[0]
    // Normalize time: accept "9h", "9:00", "09:00", "9h00" → "HH:MM"
    const rawTime = preferred_time?.trim() ?? ''
    const timeMatch = rawTime.match(/(\d{1,2})[h:](\d{0,2})/)
    const timePart = timeMatch
      ? `${String(Number(timeMatch[1])).padStart(2, '0')}:${(timeMatch[2] || '00').padStart(2, '0')}`
      : '08:00'
    const scheduled_at = new Date(`${datePart}T${timePart}:00`)
    if (isNaN(scheduled_at.getTime())) return `Data inválida: ${preferred_date}`

    // 4a. Check if the patient already has an appointment at the same day + same hour
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

        // Check if any existing is at the exact same hour slot
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
          return JSON.stringify({
            patient_conflict: true,
            conflict_type: 'same_slot',
            scheduled_at: scheduled_at.toISOString(),
            message: `Você já possui uma consulta no mesmo horário (${timeStr} de ${dateStr}):\n${existingLines}\n\nDeseja:\n• Manter o agendamento *EXISTENTE* e cancelar o novo?\n• Escolher um horário *DIFERENTE*?`,
          })
        }

        return JSON.stringify({
          patient_conflict: true,
          conflict_type: 'same_day',
          scheduled_at: scheduled_at.toISOString(),
          message: `Você já possui ${patientSameDay.length > 1 ? 'consultas' : 'uma consulta'} no dia ${dateStr}:\n${existingLines}\n\nDeseja mesmo agendar outra consulta neste mesmo dia (${timeStr})? Responda *SIM* para confirmar ou escolha uma data *DIFERENTE*.`,
        })
      }
    }

    // 4b. Check for scheduling conflict (same doctor, same hour slot, active status)
    if (!lista_espera) {
      const slotStart = new Date(scheduled_at); slotStart.setMinutes(0, 0, 0)
      const slotEnd   = new Date(scheduled_at); slotEnd.setMinutes(59, 59, 999)
      const { data: conflicts } = await db
        .from('appointments')
        .select('id, patient:patients(name)')
        .eq('doctor_id', doctor.id)
        .gte('scheduled_at', slotStart.toISOString())
        .lte('scheduled_at', slotEnd.toISOString())
        .not('status', 'in', '("cancelada","lista_espera")')

      if (conflicts && conflicts.length > 0) {
        const dateStr = scheduled_at.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric', timeZone: 'UTC' })
        const timeStr = scheduled_at.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit', timeZone: 'UTC' })
        return JSON.stringify({
          conflict: true,
          doctor_name: doctor.name,
          specialty: doctor.specialty,
          scheduled_at: scheduled_at.toISOString(),
          message: `O horário das ${timeStr} do dia ${dateStr} com ${doctor.name} (${doctor.specialty}) já está ocupado.\n\nDeseja:\n• Entrar na *fila de espera* para este horário? Responda *FILA*\n• Escolher outro horário? Responda *OUTRO*`,
        })
      }
    }

    // 5. Create appointment (normal or waitlist)
    const status = lista_espera ? 'lista_espera' : 'agendada'
    const { data: appt, error } = await db
      .from('appointments')
      .insert({
        patient_id: patientId,
        doctor_id: doctor.id,
        scheduled_at: scheduled_at.toISOString(),
        status,
        type: 'Consulta',
      })
      .select('id')
      .single()

    if (error) return `Erro ao criar agendamento: ${error.message}`

    return JSON.stringify({
      ok: true,
      appointment_id: appt.id,
      doctor_name: doctor.name,
      specialty: doctor.specialty,
      scheduled_at: scheduled_at.toISOString(),
      status,
    })
  } catch (err) {
    return `Erro interno: ${err instanceof Error ? err.message : 'desconhecido'}`
  }
}

async function consultarDisponibilidade(
  db: SupabaseClient,
  input: { specialty: string; preferred_date?: string },
): Promise<string> {
  try {
    const norm = (s: string) => s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().trim()

    // Find matching doctor(s) by specialty
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

    // Collect slots across all matching doctors
    const allSlots: { doctor: typeof matchingDoctors[0]; slot: Date }[] = []

    const tomorrow = new Date(); tomorrow.setUTCDate(tomorrow.getUTCDate() + 1); tomorrow.setUTCHours(0, 0, 0, 0)
    const prefDate = input.preferred_date ? new Date(input.preferred_date + 'T00:00:00Z') : tomorrow
    const startDate = prefDate >= tomorrow ? prefDate : tomorrow
    const endDate = new Date(startDate); endDate.setUTCDate(endDate.getUTCDate() + 90)

    for (const doctor of matchingDoctors) {
      const { data: rawSchedules } = await db
        .from('doctor_schedules')
        .select('day_of_week, start_time, end_time, slot_minutes')
        .eq('doctor_id', doctor.id)

      // Fallback: if no schedule registered, assume Mon–Fri 08:00–17:00
      const schedules = rawSchedules?.length
        ? rawSchedules
        : [1, 2, 3, 4, 5].map(d => ({ day_of_week: d, start_time: '08:00', end_time: '17:00', slot_minutes: 60 }))

      const { data: existingAppts } = await db
        .from('appointments')
        .select('scheduled_at')
        .eq('doctor_id', doctor.id)
        .gte('scheduled_at', startDate.toISOString())
        .lte('scheduled_at', endDate.toISOString())
        .not('status', 'in', '("cancelada","lista_espera")')

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
            if (!isBooked) allSlots.push({ doctor, slot: new Date(slot) })
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

    // Sort by slot date and build formatted list (up to 5)
    allSlots.sort((a, b) => a.slot.getTime() - b.slot.getTime())
    const top = allSlots.slice(0, 5)

    const formattedSlots = top.map((s, i) =>
      `${i + 1}. *${fmtDate(s.slot)}* às *${fmtTime(s.slot)}* — ${s.doctor.name} (${s.doctor.specialty})`
    ).join('\n')

    return JSON.stringify({
      slots_available: true,
      specialty: input.specialty,
      doctors: matchingDoctors.map(d => d.name),
      total_slots: top.length,
      slots: top.map(s => ({ doctor_name: s.doctor.name, doctor_id: s.doctor.id, scheduled_at: s.slot.toISOString() })),
      formatted_slots: formattedSlots,
    })
  } catch (err) {
    return `Erro ao consultar disponibilidade: ${err instanceof Error ? err.message : 'desconhecido'}`
  }
}

async function escalarParaRecepcao(
  db: SupabaseClient,
  input: {
    request_type: 'cancelamento' | 'atendente' | 'alteracao_horario'
    patient_name?: string
    notes?: string
    appointment_id?: string
  },
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

    // Auto-fetch the patient's next upcoming appointment for context
    let doctorId: string | null = null
    let appointmentDetails: Record<string, unknown> | null = null

    const apptId = input.appointment_id
    if (apptId) {
      const { data: appt } = await db
        .from('appointments')
        .select('id, scheduled_at, status, doctor:doctors(id, name, specialty)')
        .eq('id', apptId)
        .single()
      if (appt) {
        const doc = appt.doctor as unknown as { id: string; name: string; specialty: string } | null
        doctorId = doc?.id ?? null
        appointmentDetails = {
          appointment_id: appt.id,
          scheduled_at: appt.scheduled_at,
          appointment_status: appt.status,
          doctor_name: doc?.name,
          doctor_specialty: doc?.specialty,
        }
      }
    } else if (patientId) {
      // Look up next upcoming active appointment
      const { data: appts } = await db
        .from('appointments')
        .select('id, scheduled_at, status, doctor:doctors(id, name, specialty)')
        .eq('patient_id', patientId)
        .not('status', 'in', '("cancelada","lista_espera")')
        .gte('scheduled_at', new Date().toISOString())
        .order('scheduled_at', { ascending: true })
        .limit(1)
      const appt = appts?.[0]
      if (appt) {
        const doc = appt.doctor as unknown as { id: string; name: string; specialty: string } | null
        doctorId = doc?.id ?? null
        appointmentDetails = {
          appointment_id: appt.id,
          scheduled_at: appt.scheduled_at,
          appointment_status: appt.status,
          doctor_name: doc?.name,
          doctor_specialty: doc?.specialty,
        }
      }
    }

    const { data: req, error } = await db.from('approval_requests').insert({
      session_id:              sessionId ?? null,
      patient_id:              patientId,
      patient_name:            patientName,
      doctor_id:               doctorId,
      request_type:            input.request_type,
      status:                  'pending',
      message_to_receptionist: input.notes ?? typeLabels[input.request_type],
      details:                 appointmentDetails,
    }).select('id').single()

    if (error) return `Erro ao criar solicitação: ${error.message}`

    return JSON.stringify({
      ok: true,
      request_id: req?.id,
      message: `Solicitação de ${typeLabels[input.request_type]} criada. A recepção será notificada e entrará em contato com ${patientName}.`,
    })
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

    const { data: session } = await db
      .from('wa_sessions')
      .select('patient_id, phone')
      .eq('id', sessionId)
      .single()

    if (!session?.patient_id && !session?.phone) {
      return 'Paciente não encontrado. Ainda não há cadastro vinculado a este número.'
    }

    let patientId = session.patient_id
    if (!patientId && session.phone) {
      const { data: p } = await db.from('patients').select('id').eq('phone', session.phone).single()
      patientId = p?.id ?? null
    }
    if (!patientId) return 'Paciente não cadastrado no sistema ainda.'

    const now = new Date()
    // Show: upcoming appointments (future) + completed/cancelled in last 7 days
    const pastCutoff = new Date(now); pastCutoff.setDate(pastCutoff.getDate() - 7)

    let query = db
      .from('appointments')
      .select('id, scheduled_at, status, cancel_reason, type, doctor:doctors(name, specialty)')
      .eq('patient_id', patientId)
      .gte('scheduled_at', pastCutoff.toISOString())
      .order('scheduled_at', { ascending: true })

    if (statusFilter) {
      query = query.eq('status', statusFilter)
    }

    const { data: appts, error } = await query
    if (error) return `Erro ao consultar agendamentos: ${error.message}`

    // Filter out stale past appointments: "agendada" with date already passed → treat as no-show
    const validAppts = (appts ?? []).filter(a => {
      const isPast = new Date(a.scheduled_at) < now
      if (isPast && (a.status === 'agendada' || a.status === 'confirmada')) return false
      return true
    })

    if (validAppts.length === 0) {
      return statusFilter
        ? `Nenhuma consulta com status "${statusFilter}" encontrada.`
        : 'Nenhuma consulta agendada encontrada para este paciente.'
    }

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

type ServiceConfig = { name: string; description: string }
type DoctorInfo    = { name: string; specialty: string }

async function loadClinicConfig(db: SupabaseClient): Promise<{
  clinicName: string
  workingHours: string
  services: ServiceConfig[]
  outOfScopeResponse: string
  doctors: DoctorInfo[]
}> {
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
    clinicName:       typeof cfg.clinic_name === 'string' ? cfg.clinic_name : 'Clínica São Lucas',
    workingHours:     typeof cfg.working_hours === 'string' ? cfg.working_hours : 'Segunda a Sexta, 8h às 18h',
    services,
    outOfScopeResponse: typeof cfg.out_of_scope_response === 'string'
      ? cfg.out_of_scope_response
      : 'Lamento, mas não atendemos essa especialidade. Posso ajudar com: {services_list}',
    doctors: (doctorsData ?? []) as DoctorInfo[],
  }
}

function buildSystemPrompt(cfg: Awaited<ReturnType<typeof loadClinicConfig>>): string {
  const servicesList = cfg.services
    .map(s => `• *${s.name}* — ${s.description}`)
    .join('\n')
  const serviceNames = cfg.services.map(s => s.name).join(', ')

  const doctorsList = cfg.doctors.length > 0
    ? cfg.doctors.map(d => `• ${d.name} — ${d.specialty}`).join('\n')
    : '(nenhum médico cadastrado ainda)'

  const outOfScope = cfg.outOfScopeResponse
    .replace('{clinic_name}', cfg.clinicName)
    .replace('{services_list}', servicesList)

  const welcomeMsg =
    `Olá! Seja bem-vindo(a) à *${cfg.clinicName}*! 🏥\n\n` +
    `Atendemos as seguintes especialidades:\n${servicesList}\n\n` +
    `${cfg.doctors.length > 0 ? `👨‍⚕️ Nossos médicos:\n${doctorsList}\n\n` : ''}` +
    `⏰ Horário de atendimento: ${cfg.workingHours}\n\n` +
    `Como posso ajudar?`

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

// Workflow definitions — maps to real Claude tool calls
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

Exemplo de confirmação antes de agendar:
"Perfeito! Vou agendar:
• Paciente: [nome]
• Especialidade: [especialidade]
• Data: [data] às [horário]

Confirma? Responda *SIM* para confirmar ou *NÃO* para cancelar."

Se o paciente disser SIM após esse resumo → chame agendar_consulta IMEDIATAMENTE com preferred_time preenchido exatamente como o paciente disse ou como apareceu no formatted_slots.
Se o paciente responder SIM a uma mensagem anterior da clínica sobre remarcar → inicie o fluxo de agendamento perguntando a especialidade e data desejada.

VERIFICAÇÃO DE AGENDA EXISTENTE (obrigatório):
- SEMPRE que o paciente perguntar sobre consultas, agenda, horários ou quiser agendar → chame consultar_agendamentos PRIMEIRO
- Se já tiver consulta marcada → informe e pergunte se deseja fazer outra ou confirmar a existente

FLUXO DE DISPONIBILIDADE:
- Quando o paciente NÃO souber a data, pedir sugestão, ou perguntar "quando tem vaga" → use consultar_disponibilidade (busca até 90 dias a partir da data preferida)
- Se a ferramenta retornar slots_available: true, apresente o campo formatted_slots ao paciente assim:
  "Encontrei os seguintes horários disponíveis:\n[formatted_slots]\nQual prefere?"
- Após o paciente escolher um horário → inicie o fluxo de confirmação SIM/NÃO e depois chame agendar_consulta com a data e médico escolhidos
- Se slots_available for false ou error for true → apresente a mensagem do campo "message" e ofereça contato com a recepção
- Se o paciente JÁ SOUBER a data/hora exata → NÃO chame consultar_disponibilidade. Use diretamente o fluxo de confirmação SIM/NÃO e depois agendar_consulta. Isso funciona para QUALQUER data futura, independente de quantos dias a frente.

CONFLITO DE HORÁRIO — MÉDICO OCUPADO:
Se a ferramenta retornar um JSON com "conflict: true", apresente a mensagem do campo "message" ao paciente exatamente como está.
- Se o paciente responder *FILA* → chame agendar_consulta novamente com lista_espera: true para o mesmo horário
- Se o paciente responder *OUTRO* → pergunte qual outro horário ou data prefere e reinicie o fluxo

CONFLITO DE PACIENTE — MESMA HORA OU MESMO DIA:
Se a ferramenta retornar um JSON com "patient_conflict: true", apresente a mensagem do campo "message" ao paciente exatamente como está.
- Se conflict_type for "same_slot" (exatamente o mesmo horário):
  • Paciente responde *EXISTENTE* → não crie novo agendamento, informe que o agendamento atual será mantido
  • Paciente responde *DIFERENTE* → peça nova data/horário e reinicie o fluxo
- Se conflict_type for "same_day" (mesmo dia, horário diferente):
  • Paciente responde *SIM* → chame agendar_consulta normalmente para confirmar o segundo agendamento no mesmo dia
  • Paciente escolhe data *DIFERENTE* → peça nova data e reinicie o fluxo

Depois de chamar a ferramenta com sucesso:
- Se status = "agendada" → confirme o agendamento com data, hora e médico
- Se status = "lista_espera" → confirme que entrou na fila de espera e que será avisado se o horário abrir

ESCALAÇÃO PARA RECEPÇÃO — REGRA ABSOLUTA:
Ao PRIMEIRO sinal de qualquer uma destas intenções, chame escalar_para_recepcao IMEDIATAMENTE — sem pedir mais informações:
- Paciente quer cancelar consulta → request_type: "cancelamento"
- Paciente quer falar com atendente/recepcionista/pessoa humana → request_type: "atendente"
- Paciente quer remarcar/alterar horário de consulta existente → request_type: "alteracao_horario"

NÃO peça nome, data ou outros dados antes de chamar o tool. Use notes para capturar o que o paciente disse.
NUNCA diga "vou encaminhar" ou "vou registrar" sem ter chamado o tool primeiro.

Após escalar_para_recepcao retornar com sucesso:
- cancelamento → "Sua solicitação de cancelamento foi registrada. Nossa equipe entrará em contato em breve para confirmar. ✅"
- atendente → "Registrei sua solicitação. Um atendente da Clínica São Lucas entrará em contato com você em breve. 📞"
- alteracao_horario → "Sua solicitação de remarcação foi registrada. Nossa equipe verificará a disponibilidade e confirmará o novo horário em breve. 🗓"

Contexto regulatório: LGPD Art.11 (dados de saúde = dados sensíveis), CFM 2.314/2022 (sigilo médico), WhatsApp Business API (somente templates HSM fora da janela de 24h).`
// Note: SYSTEM_PROMPT_BASE is combined with dynamic clinic config at request time via buildSystemPrompt()

function simulatedResponse(workflow: string): string {
  switch (workflow) {
    case 'agendamento':
      return 'Claro! Posso ajudar com o agendamento. Temos disponibilidade em Cardiologia (Dr. Lima — seg/qua), Clínica Geral (Dr. Cardoso — todos os dias), Dermatologia (Dr. Fernandes — ter/qui) e Pediatria (Dra. Alves — seg a sex).\n\nQual especialidade você prefere e tem alguma data em mente?'
    case 'urgencia':
      return '⚠️ Seus sintomas precisam de atenção imediata.\n\nPor favor, dirija-se ao pronto-socorro mais próximo ou ligue para o SAMU (192). Se preferir, posso tentar contato com um dos nossos médicos de plantão agora.\n\nDeseja que eu tente o contato de emergência?'
    case 'cadastro':
      return 'Bem-vindo à Clínica São Lucas! Para realizar seu cadastro, precisarei de:\n\n• Nome completo\n• CPF\n• Data de nascimento\n• Telefone\n• Convênio (ou particular)\n\nPode me informar seu nome completo para começar?'
    case 'prontuario':
      return 'Para acessar seu histórico clínico, preciso verificar sua identidade por questões de segurança (LGPD).\n\nPode me informar seu CPF? Os dados são tratados com total sigilo conforme a legislação vigente.'
    case 'receita':
      return 'A renovação de receitas precisa de autorização do médico responsável.\n\nPode me informar:\n• Nome do medicamento\n• Nome do médico que prescreveu\n\nVou verificar a disponibilidade para renovação.'
    default:
      return 'Olá! Sou o assistente virtual da Clínica São Lucas. Posso ajudar com:\n\n• 📅 Agendamento de consultas\n• 🚨 Triagem de urgências\n• 📋 Cadastro de novos pacientes\n• 📂 Histórico e prontuários\n• 💊 Renovação de receitas\n\nComo posso ajudar?'
  }
}

export async function POST(req: NextRequest) {
  try {
    const { message, sessionId, simulate: simFlag, history } = await req.json()
    const simulate = simFlag === true || !process.env.ANTHROPIC_API_KEY?.trim()

    if (!message?.trim()) {
      return NextResponse.json({ error: 'Mensagem vazia' }, { status: 400 })
    }

    const workflow = detectWorkflow(message)

    // Simulation mode: no API key or explicit flag
    if (simulate) {
      return NextResponse.json({
        response: simulatedResponse(workflow),
        workflow,
        simulated: true,
      })
    }

    const db = createServerClient()

    // Load clinic config for dynamic system prompt
    const clinicCfg = await loadClinicConfig(db)
    const nowBrt = new Date(Date.now() - 3 * 60 * 60 * 1000) // UTC-3 (Brasília)
    const todayStr = nowBrt.toISOString().split('T')[0]
    const weekdays = ['domingo','segunda-feira','terça-feira','quarta-feira','quinta-feira','sexta-feira','sábado']
    const todayWeekday = weekdays[nowBrt.getUTCDay()]
    const DATE_CONTEXT = `DATA E HORA ATUAL (Brasília, UTC-3): ${todayStr} (${todayWeekday}). Use esta data como referência para calcular "hoje", "amanhã", "quarta-feira", etc. Ao agendar, converta o dia da semana mencionado pelo paciente para a data YYYY-MM-DD correta relativa a hoje.`
    const SYSTEM_PROMPT = buildSystemPrompt(clinicCfg) + '\n\n' + DATE_CONTEXT + '\n\n' + SYSTEM_PROMPT_BASE

    // Log inbound message
    await db.from('audit_log').insert({
      actor_type: 'user',
      actor_id: sessionId ?? 'anonymous',
      action: 'chat_message',
      record_type: 'wa_message',
      record_id: sessionId ?? 'anonymous',
    })

    // Call Claude with streaming
    const TOOLS: Anthropic.Tool[] = [
      {
        name: 'agendar_consulta',
        description: 'Cria o agendamento real no sistema da clínica. Chamar SOMENTE quando tiver: especialidade, data (YYYY-MM-DD) e nome do paciente confirmados pelo usuário.',
        input_schema: {
          type: 'object' as const,
          properties: {
            specialty: { type: 'string', description: 'Especialidade médica (ex: Clínico Geral, Cardiologia)' },
            preferred_date: { type: 'string', description: 'Data confirmada pelo paciente no formato YYYY-MM-DD' },
            preferred_time: { type: 'string', description: 'Horário desejado pelo paciente, ex: "09:00", "9h", "14h30". Obrigatório quando o paciente especificar um horário.' },
            patient_name: { type: 'string', description: 'Nome completo do paciente' },
            lista_espera: { type: 'boolean', description: 'true = entrar na fila de espera mesmo que o horário esteja ocupado' },
          },
          required: ['specialty', 'preferred_date', 'patient_name'],
        },
      },
      {
        name: 'consultar_agendamentos',
        description: 'Consulta as consultas reais do paciente no banco de dados. Chamar SEMPRE que o paciente perguntar sobre suas consultas marcadas, canceladas ou histórico. Retorna status real (agendada, confirmada, cancelada, atendida).',
        input_schema: {
          type: 'object' as const,
          properties: {
            status_filter: {
              type: 'string',
              description: 'Filtrar por status específico: "agendada", "confirmada", "cancelada", "atendida". Omitir para retornar todas.',
            },
          },
          required: [],
        },
      },
      {
        name: 'consultar_disponibilidade',
        description: 'Busca o próximo horário disponível de um médico consultando a agenda real e cria uma solicitação de aprovação para a recepção confirmar ANTES de enviar a data ao paciente. Usar quando o paciente pedir sugestão de data, não souber quando quer, ou pedir "quando tem vaga".',
        input_schema: {
          type: 'object' as const,
          properties: {
            specialty:      { type: 'string', description: 'Especialidade médica desejada' },
            preferred_date: { type: 'string', description: 'Data mínima preferida YYYY-MM-DD (opcional — se omitido, busca a partir de amanhã)' },
            patient_name:   { type: 'string', description: 'Nome completo do paciente' },
          },
          required: ['specialty'],
        },
      },
      {
        name: 'verificar_urgencia',
        description: 'Verifica se os sintomas indicam urgência médica',
        input_schema: {
          type: 'object' as const,
          properties: {
            symptoms: { type: 'string', description: 'Sintomas descritos pelo paciente' },
          },
          required: ['symptoms'],
        },
      },
      {
        name: 'escalar_para_recepcao',
        description: 'Encaminha uma solicitação para a recepção quando o paciente pede: cancelamento de consulta, falar com atendente humano, ou alteração de horário. Cria um registro no painel de Aprovações para a equipe tratar.',
        input_schema: {
          type: 'object' as const,
          properties: {
            request_type: {
              type: 'string',
              enum: ['cancelamento', 'atendente', 'alteracao_horario'],
              description: 'Tipo da solicitação: cancelamento = cancelar consulta; atendente = falar com pessoa; alteracao_horario = remarcar',
            },
            patient_name: { type: 'string', description: 'Nome do paciente se conhecido' },
            notes:         { type: 'string', description: 'Observações adicionais do paciente sobre a solicitação' },
            appointment_id: { type: 'string', description: 'ID do agendamento relacionado, se aplicável' },
          },
          required: ['request_type'],
        },
      },
    ]

    const historyParams: Anthropic.MessageParam[] = (history ?? []).map(
      (h: { role: string; content: string }) => ({
        role: h.role as 'user' | 'assistant',
        content: h.content,
      })
    )
    const messages: Anthropic.MessageParam[] = [...historyParams, { role: 'user', content: message }]

    const lf = getLangfuse()
    const trace = lf?.trace({
      name: 'whatsapp-chat',
      sessionId: sessionId ?? undefined,
      userId: sessionId ?? undefined,
      tags: [workflow],
      input: { message, history_len: historyParams.length },
    })

    const startTs = Date.now()

    // Claude Sonnet 5 pricing: $3/MTok input, $15/MTok output
    const COST_INPUT  = 3 / 1_000_000
    const COST_OUTPUT = 15 / 1_000_000

    let first = await anthropic.messages.create({
      model: 'claude-sonnet-5',
      max_tokens: 1024,
      system: SYSTEM_PROMPT,
      messages,
      tools: TOOLS,
    })

    let totalInputTokens  = first.usage.input_tokens
    let totalOutputTokens = first.usage.output_tokens

    const gen1 = trace?.generation({
      name: 'coordenador-turn-1',
      model: 'claude-sonnet-5',
      input: messages,
      output: first.content,
      usage: {
        input: first.usage.input_tokens,
        output: first.usage.output_tokens,
        unit: 'TOKENS',
      },
      startTime: new Date(startTs),
      endTime: new Date(),
      metadata: {
        stop_reason: first.stop_reason,
        workflow,
        cost_usd: first.usage.input_tokens * COST_INPUT + first.usage.output_tokens * COST_OUTPUT,
      },
    })
    gen1?.end()

    // Execute tool calls and feed results back
    if (first.stop_reason === 'tool_use') {
      const toolUseBlocks = first.content.filter(c => c.type === 'tool_use') as Anthropic.ToolUseBlock[]
      let toolCallCount = 0

      const toolResults: Anthropic.ToolResultBlockParam[] = await Promise.all(
        toolUseBlocks.map(async t => {
          let content = 'OK'
          const toolStart = Date.now()
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
            content = await escalarParaRecepcao(
              db,
              t.input as { request_type: 'cancelamento' | 'atendente' | 'alteracao_horario'; patient_name?: string; notes?: string; appointment_id?: string },
              sessionId
            )
          }
          toolCallCount++
          trace?.span({
            name: `tool:${t.name}`,
            input: t.input,
            output: content,
            startTime: new Date(toolStart),
            endTime: new Date(),
            metadata: { tool_index: toolCallCount },
          })
          return { type: 'tool_result' as const, tool_use_id: t.id, content }
        })
      )

      messages.push({ role: 'assistant', content: first.content })
      messages.push({ role: 'user', content: toolResults })

      const turn2Start = Date.now()
      first = await anthropic.messages.create({
        model: 'claude-sonnet-5',
        max_tokens: 1024,
        system: SYSTEM_PROMPT,
        messages,
      })

      totalInputTokens  += first.usage.input_tokens
      totalOutputTokens += first.usage.output_tokens

      const gen2 = trace?.generation({
        name: 'coordenador-turn-2',
        model: 'claude-sonnet-5',
        input: messages,
        output: first.content,
        usage: {
          input: first.usage.input_tokens,
          output: first.usage.output_tokens,
          unit: 'TOKENS',
        },
        startTime: new Date(turn2Start),
        endTime: new Date(),
        metadata: {
          tool_calls: toolCallCount,
          cost_usd: first.usage.input_tokens * COST_INPUT + first.usage.output_tokens * COST_OUTPUT,
        },
      })
      gen2?.end()
    }

    const textContent = first.content.find(c => c.type === 'text') as Anthropic.TextBlock | undefined
    const response = textContent?.text ?? 'Desculpe, não consegui processar sua mensagem.'

    const costUsd = totalInputTokens * COST_INPUT + totalOutputTokens * COST_OUTPUT
    trace?.update({
      output: response,
      metadata: {
        total_input_tokens: totalInputTokens,
        total_output_tokens: totalOutputTokens,
        total_tokens: totalInputTokens + totalOutputTokens,
        cost_usd: costUsd,
        latency_ms: Date.now() - startTs,
      },
    })
    await lf?.flushAsync().catch(() => {})

    // Log outbound
    await db.from('audit_log').insert({
      actor_type: 'agent',
      actor_id: 'coordenador-clinico',
      action: 'chat_response',
      record_type: 'wa_message',
      record_id: sessionId ?? 'anonymous',
    })

    return NextResponse.json({
      response,
      workflow,
      tokens: { input: totalInputTokens, output: totalOutputTokens },
      simulated: false,
    })
  } catch (err) {
    console.error('[chat/route] error:', err)
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 })
  }
}

function detectWorkflow(msg: string): string {
  const s = msg.toLowerCase()
  if (/(agendar|consulta|horário|semana|amanhã)/.test(s)) return 'agendamento'
  if (/(dor|peito|falta de ar|febre|tontura|urgência|emergência)/.test(s)) return 'urgencia'
  if (/(cadastrar|novo paciente|primeira vez)/.test(s)) return 'cadastro'
  if (/(prontuário|histórico|exames|resultados)/.test(s)) return 'prontuario'
  if (/(receita|medicamento|remédio|renovar|prescri)/.test(s)) return 'receita'
  return 'agendamento'
}
