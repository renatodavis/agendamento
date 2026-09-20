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

    // 3. Parse date — default to today if not provided, time to 14:00
    const { lista_espera } = input
    const datePart = preferred_date ?? new Date().toISOString().split('T')[0]
    const scheduled_at = new Date(`${datePart}T14:00:00`)
    if (isNaN(scheduled_at.getTime())) return `Data inválida: ${preferred_date}`

    // 4. Check for scheduling conflict (same doctor, same hour slot, active status)
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

    let query = db
      .from('appointments')
      .select('id, scheduled_at, status, cancel_reason, type, doctor:doctors(name, specialty)')
      .eq('patient_id', patientId)
      .order('scheduled_at', { ascending: true })

    if (statusFilter) {
      query = query.eq('status', statusFilter)
    }

    const { data: appts, error } = await query
    if (error) return `Erro ao consultar agendamentos: ${error.message}`
    if (!appts || appts.length === 0) {
      return statusFilter
        ? `Nenhuma consulta com status "${statusFilter}" encontrada.`
        : 'Nenhuma consulta encontrada para este paciente.'
    }

    const lines = appts.map(a => {
      const d = new Date(a.scheduled_at)
      const dateStr = d.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric', timeZone: 'UTC' })
      const timeStr = d.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit', timeZone: 'UTC' })
      const doctor = (a.doctor as { name: string; specialty: string } | null)
      const cancelNote = a.cancel_reason ? ` (motivo: ${a.cancel_reason})` : ''
      return `• ${dateStr} às ${timeStr} — ${doctor?.specialty ?? ''} (${doctor?.name ?? ''}) — status: ${a.status}${cancelNote}`
    })

    return `Consultas encontradas:\n${lines.join('\n')}`
  } catch (err) {
    return `Erro interno: ${err instanceof Error ? err.message : 'desconhecido'}`
  }
}

// Workflow definitions — maps to real Claude tool calls
const SYSTEM_PROMPT = `Você é o Coordenador Clínico da Clínica São Lucas, responsável por orquestrar o atendimento de pacientes via WhatsApp.

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
• Data: [data]

Confirma? Responda *SIM* para confirmar ou *NÃO* para cancelar."

Se o paciente disser SIM após esse resumo → chame agendar_consulta IMEDIATAMENTE.
Se o paciente responder SIM a uma mensagem anterior da clínica sobre remarcar → inicie o fluxo de agendamento perguntando a especialidade e data desejada.

CONFLITO DE HORÁRIO:
Se a ferramenta retornar um JSON com "conflict: true", apresente a mensagem do campo "message" ao paciente exatamente como está.
- Se o paciente responder *FILA* → chame agendar_consulta novamente com lista_espera: true para o mesmo horário
- Se o paciente responder *OUTRO* → pergunte qual outro horário ou data prefere e reinicie o fluxo

Depois de chamar a ferramenta com sucesso:
- Se status = "agendada" → confirme o agendamento com data, hora e médico
- Se status = "lista_espera" → confirme que entrou na fila de espera e que será avisado se o horário abrir

Contexto regulatório: LGPD Art.11 (dados de saúde = dados sensíveis), CFM 2.314/2022 (sigilo médico), WhatsApp Business API (somente templates HSM fora da janela de 24h).`

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
          } else if (t.name === 'verificar_urgencia') {
            content = JSON.stringify({ urgencia: true, encaminhar: 'pronto-socorro' })
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
