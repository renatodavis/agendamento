'use client'
import { useState, useRef, useEffect } from 'react'
import { createClient } from '@supabase/supabase-js'
import type { PipelineState } from '@/components/pipeline/PipelinePanel'
import type { LogEntry } from '@/components/log/LogPanel'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

type Session = {
  id: string
  phone: string
  name?: string | null
  last_inbound_at: string | null
  lastMsg?: { body: string; direction: string; sent_at: string }
}

type WaMsg = {
  id: string
  session_id: string
  direction: 'inbound' | 'outbound'
  body: string
  status: string
  sent_at: string
}

const PIPELINE_SEQ: Record<string, string[][]> = {
  agendamento: [['coordenador-clinico'], ['triagem-whatsapp'], ['gerenciador-consultas'], ['comunicacao-whatsapp'], ['auditoria-conformidade']],
  urgencia:    [['coordenador-clinico'], ['triagem-whatsapp'], ['comunicacao-whatsapp'], ['auditoria-conformidade']],
  cadastro:    [['coordenador-clinico'], ['cadastro-pacientes'], ['auditoria-conformidade']],
  prontuario:  [['coordenador-clinico'], ['prontuario-clinico'], ['auditoria-conformidade']],
  receita:     [['coordenador-clinico'], ['prontuario-clinico'], ['faturamento-cobranca'], ['auditoria-conformidade']],
}

const QUICK_MSGS = [
  { label: '📅 Agendar',  text: 'Quero agendar uma consulta' },
  { label: '🚨 Urgência', text: 'Tenho dor no peito há 2 horas' },
  { label: '👤 Cadastro', text: 'Sou novo paciente, quero me cadastrar' },
  { label: '💊 Receita',  text: 'Preciso renovar minha receita de losartana' },
]

function fmtPhone(phone: string) {
  const d = phone.replace(/\D/g, '')
  if (d.length >= 12) return `+${d.slice(0,2)} (${d.slice(2,4)}) ${d.slice(4,9)}-${d.slice(9)}`
  if (d.length === 11) return `(${d.slice(0,2)}) ${d.slice(2,7)}-${d.slice(7)}`
  return phone
}

function fmtTime(ts: string | null | undefined) {
  if (!ts) return ''
  const d = new Date(ts)
  const now = new Date()
  const isToday = d.toDateString() === now.toDateString()
  if (isToday) return d.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })
  return d.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' })
}

function avatarChar(s: Session) {
  const n = s.name ?? s.phone
  const letter = n.replace(/\D/g, '').charAt(0) || n.charAt(0)
  return letter.toUpperCase()
}

// Claude Sonnet 5: $3/MTok input, $15/MTok output
const COST_INPUT  = 3 / 1_000_000
const COST_OUTPUT = 15 / 1_000_000

type Props = {
  onPipelineChange: (s: PipelineState) => void
  onLog: (e: LogEntry) => void
  onStats: (delta: { tokens?: number; latency?: number; cost?: number }) => void
}

export default function WaPanel({ onPipelineChange, onLog, onStats }: Props) {
  const [sessions, setSessions]           = useState<Session[]>([])
  const [activeSession, setActiveSession] = useState<Session | null>(null)
  const [messages, setMessages]           = useState<WaMsg[]>([])
  const [view, setView]                   = useState<'list' | 'conv'>('list')
  const [input, setInput]                 = useState('')
  const [loading, setLoading]             = useState(false)
  const [simMode, setSimMode]             = useState(false)
  const [botEnabled, setBotEnabled]       = useState(true)
  const bottomRef                         = useRef<HTMLDivElement>(null)
  const activeSessionRef                  = useRef<Session | null>(null)
  const messagesRef                       = useRef<WaMsg[]>([])

  activeSessionRef.current = activeSession
  messagesRef.current = messages

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, loading])

  useEffect(() => {
    loadSessions()

    const ch = supabase
      .channel('wa-panel')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'wa_sessions' }, () => loadSessions())
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'wa_messages' }, (payload) => {
        loadSessions()
        const msg = payload.new as WaMsg
        if (activeSessionRef.current?.id === msg.session_id) {
          setMessages(prev => prev.find(m => m.id === msg.id) ? prev : [...prev, msg])
        }
      })
      .subscribe()

    const poll = setInterval(loadSessions, 8000)
    return () => { supabase.removeChannel(ch); clearInterval(poll) }
  }, [])

  async function loadSessions() {
    const { data: sess } = await supabase
      .from('wa_sessions').select('*').order('last_inbound_at', { ascending: false })
    if (!sess?.length) { setSessions([]); return }

    const { data: msgs } = await supabase
      .from('wa_messages')
      .select('session_id, body, direction, sent_at')
      .in('session_id', sess.map(s => s.id))
      .order('sent_at', { ascending: false })

    const lastMap = new Map<string, { body: string; direction: string; sent_at: string }>()
    msgs?.forEach(m => { if (!lastMap.has(m.session_id)) lastMap.set(m.session_id, m) })

    setSessions(sess.map(s => ({ ...s, lastMsg: lastMap.get(s.id) })))
  }

  async function openSession(session: Session) {
    setActiveSession(session)
    setView('conv')
    const { data } = await supabase
      .from('wa_messages').select('*')
      .eq('session_id', session.id)
      .order('sent_at', { ascending: true }).limit(50)
    setMessages(data ?? [])
  }

  function backToList() {
    setView('list')
    setActiveSession(null)
    setMessages([])
  }

  function animatePipeline(workflow: string) {
    const seq = PIPELINE_SEQ[workflow] ?? PIPELINE_SEQ.agendamento
    onPipelineChange({ active: [], done: [], workflow })
    let done: string[] = []
    seq.forEach((step, i) => {
      setTimeout(() => {
        onPipelineChange({ active: step, done: [...done], workflow })
        onLog({ id: crypto.randomUUID(), agent: step[0], action: `Processando fluxo: ${workflow}`, status: 'processing', ts: new Date() })
      }, i * 600)
      setTimeout(() => {
        done = [...done, ...step]
        onLog({ id: crypto.randomUUID(), agent: step[0], action: 'Concluído', status: 'done', ts: new Date() })
        if (i === seq.length - 1) {
          onPipelineChange({ active: [], done, workflow })
          setTimeout(() => onPipelineChange({ active: [], done: [], workflow: null }), 3000)
        } else {
          onPipelineChange({ active: seq[i + 1] ?? [], done, workflow })
        }
      }, i * 600 + 500)
    })
  }

  async function send(text: string) {
    const trimmed = text.trim()
    if (!trimmed || loading || !activeSession) return

    // Captura histórico ANTES de qualquer mutação de estado ou await
    // para evitar incluir a mensagem atual como user duplicado
    const history = messagesRef.current.slice(-20).map(m => ({
      role: m.direction === 'inbound' ? 'user' : 'assistant',
      content: m.body,
    }))

    setInput('')
    onLog({ id: crypto.randomUUID(), agent: 'paciente', action: trimmed.slice(0, 60), status: 'done', ts: new Date() })

    const { data: inMsg } = await supabase.from('wa_messages').insert({
      session_id: activeSession.id, direction: 'inbound', body: trimmed, status: 'delivered',
    }).select().single()
    if (inMsg) setMessages(prev => prev.find(m => m.id === inMsg.id) ? prev : [...prev, inMsg])
    await supabase.from('wa_sessions').update({ last_inbound_at: new Date().toISOString() }).eq('id', activeSession.id)

    if (!botEnabled) return
    setLoading(true)
    const t0 = Date.now()

    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: trimmed, sessionId: activeSession.id, simulate: simMode, history }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error ?? 'Erro')

      animatePipeline(data.workflow ?? 'agendamento')
      const inTok  = data.tokens?.input  ?? 0
      const outTok = data.tokens?.output ?? 0
      onStats({
        tokens: inTok + outTok,
        latency: Date.now() - t0,
        cost: inTok * COST_INPUT + outTok * COST_OUTPUT,
      })

      const { data: outMsg } = await supabase.from('wa_messages').insert({
        session_id: activeSession.id, direction: 'outbound', body: data.response, status: 'sent',
      }).select().single()
      if (outMsg) setMessages(prev => prev.find(m => m.id === outMsg.id) ? prev : [...prev, outMsg])
    } catch {
      setMessages(prev => [...prev, {
        id: crypto.randomUUID(), session_id: activeSession.id,
        direction: 'outbound', body: 'Erro ao processar. Tente novamente.',
        status: 'failed', sent_at: new Date().toISOString(),
      }])
    } finally {
      setLoading(false)
    }
  }

  // ── Render ─────────────────────────────────────────────────────────────
  return (
    <div className="flex flex-col shrink-0 border-r"
      style={{ width: 270, minWidth: 200, borderColor: 'var(--border)', background: 'var(--panel)' }}>

      {/* ── Header ── */}
      {view === 'list' ? (
        <div className="flex items-center gap-2 px-3 py-2 shrink-0" style={{ background: 'var(--green)', minHeight: 50 }}>
          <span className="text-lg">💬</span>
          <div className="flex-1 min-w-0">
            <div className="text-sm font-semibold text-white leading-none">WhatsApp</div>
            <div className="text-[10px] mt-0.5" style={{ color: 'rgba(255,255,255,0.75)' }}>
              {sessions.length} conversa{sessions.length !== 1 ? 's' : ''}
            </div>
          </div>
          <a href="/testemensagem" target="_blank"
            className="text-[10px] font-semibold px-2 py-0.5 rounded-md"
            style={{ background: 'rgba(255,255,255,0.2)', color: '#fff' }}>
            + Sim
          </a>
        </div>
      ) : (
        <div className="flex items-center gap-2 px-2 py-2 shrink-0" style={{ background: 'var(--green)', minHeight: 50 }}>
          <button onClick={backToList}
            className="w-7 h-7 rounded-full flex items-center justify-center shrink-0"
            style={{ background: 'rgba(255,255,255,0.15)', color: '#fff', fontSize: 16 }}>‹</button>
          <div className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold shrink-0"
            style={{ background: 'rgba(255,255,255,0.25)', color: '#fff' }}>
            {activeSession ? avatarChar(activeSession) : '?'}
          </div>
          <div className="flex-1 min-w-0">
            <div className="text-xs font-semibold text-white leading-none truncate">
              {activeSession?.name ?? fmtPhone(activeSession?.phone ?? '')}
            </div>
            {activeSession?.name && (
              <div className="text-[9px] mt-0.5 truncate" style={{ color: 'rgba(255,255,255,0.7)' }}>
                {fmtPhone(activeSession.phone)}
              </div>
            )}
          </div>
          <div className="flex flex-col gap-0.5">
            <label className="flex items-center gap-1 cursor-pointer">
              <span className="text-[8px] font-semibold text-white opacity-80">{botEnabled ? 'BOT' : 'OFF'}</span>
              <div className="relative w-6 h-3">
                <input type="checkbox" className="sr-only" checked={botEnabled} onChange={e => setBotEnabled(e.target.checked)} />
                <div className="w-6 h-3 rounded-full" style={{ background: botEnabled ? 'rgba(255,255,255,0.4)' : 'rgba(0,0,0,0.3)' }} />
                <div className="absolute top-0.5 w-2 h-2 rounded-full bg-white transition-transform"
                  style={{ transform: botEnabled ? 'translateX(12px)' : 'translateX(1px)' }} />
              </div>
            </label>
            <label className="flex items-center gap-1 cursor-pointer">
              <span className="text-[8px] font-semibold text-white opacity-80">{simMode ? 'SIM' : 'API'}</span>
              <div className="relative w-6 h-3">
                <input type="checkbox" className="sr-only" checked={simMode} onChange={e => setSimMode(e.target.checked)} />
                <div className="w-6 h-3 rounded-full" style={{ background: simMode ? 'rgba(255,165,0,0.6)' : 'rgba(59,158,255,0.6)' }} />
                <div className="absolute top-0.5 w-2 h-2 rounded-full bg-white transition-transform"
                  style={{ transform: simMode ? 'translateX(1px)' : 'translateX(12px)' }} />
              </div>
            </label>
          </div>
        </div>
      )}

      {/* ── Lista de conversas ── */}
      {view === 'list' && (
        <div className="flex-1 overflow-y-auto"
          style={{ scrollbarWidth: 'thin', scrollbarColor: 'var(--border) transparent' }}>
          {sessions.length === 0 ? (
            <div className="flex flex-col items-center justify-center gap-3 px-4 py-10 text-center h-full">
              <div className="text-3xl opacity-20">💬</div>
              <p className="text-[11px] leading-relaxed" style={{ color: 'var(--muted)' }}>
                Nenhuma conversa ainda.<br />Use o simulador para testar.
              </p>
              <a href="/testemensagem" target="_blank"
                className="text-[11px] font-semibold px-3 py-1.5 rounded-full"
                style={{ background: 'var(--green)', color: '#fff' }}>
                Abrir Simulador →
              </a>
            </div>
          ) : sessions.map(session => (
            <button key={session.id} onClick={() => openSession(session)}
              className="w-full flex items-center gap-2.5 px-3 py-2.5 border-b text-left transition-colors"
              style={{ borderColor: 'var(--border)', background: 'var(--panel)' }}
              onMouseEnter={e => (e.currentTarget.style.background = 'var(--card)')}
              onMouseLeave={e => (e.currentTarget.style.background = 'var(--panel)')}>
              <div className="w-9 h-9 rounded-full flex items-center justify-center text-sm font-bold shrink-0"
                style={{ background: 'var(--green)', color: '#fff' }}>
                {avatarChar(session)}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-baseline justify-between gap-1">
                  <span className="text-[12px] font-semibold truncate" style={{ color: 'var(--foreground)' }}>
                    {session.name ?? fmtPhone(session.phone)}
                  </span>
                  <span className="text-[9px] shrink-0" style={{ color: 'var(--muted)' }}>
                    {fmtTime(session.lastMsg?.sent_at ?? session.last_inbound_at)}
                  </span>
                </div>
                <div className="text-[10px] truncate mt-0.5" style={{ color: 'var(--muted)' }}>
                  {session.lastMsg
                    ? `${session.lastMsg.direction === 'outbound' ? '✓ ' : ''}${session.lastMsg.body}`
                    : fmtPhone(session.phone)}
                </div>
              </div>
            </button>
          ))}
        </div>
      )}

      {/* ── Conversa individual ── */}
      {view === 'conv' && (
        <>
          {/* Mensagens */}
          <div className="flex-1 overflow-y-auto px-2 py-2 flex flex-col gap-1.5"
            style={{ background: '#ECF5F1', scrollbarWidth: 'thin', scrollbarColor: 'var(--border) transparent' }}>
            {messages.length === 0 && !loading && (
              <div className="flex-1 flex items-center justify-center">
                <p className="text-[11px]" style={{ color: 'var(--muted)' }}>Início da conversa</p>
              </div>
            )}
            {messages.map(m => (
              <div key={m.id} className={`flex ${m.direction === 'inbound' ? 'justify-end' : 'justify-start'}`}>
                <div className="max-w-[88%]">
                  <div className="px-2.5 py-1.5 text-[12px] leading-snug"
                    style={{
                      background: m.direction === 'inbound' ? '#D4EDD5' : '#FFFFFF',
                      border: m.direction === 'outbound' ? '1px solid var(--border)' : 'none',
                      borderRadius: m.direction === 'inbound' ? '12px 3px 12px 12px' : '3px 12px 12px 12px',
                      color: '#0D1B2A', whiteSpace: 'pre-wrap',
                    }}>
                    {m.body}
                  </div>
                  <div className={`text-[9px] mt-0.5 flex items-center gap-1 ${m.direction === 'inbound' ? 'justify-end' : 'justify-start'}`}
                    style={{ color: 'var(--muted)' }}>
                    {fmtTime(m.sent_at)}
                    {m.direction === 'outbound' && <span>✓✓</span>}
                  </div>
                </div>
              </div>
            ))}
            {loading && (
              <div className="flex justify-start">
                <div className="px-3 py-2 flex items-center gap-1 rounded-[3px_12px_12px_12px]"
                  style={{ background: '#FFFFFF', border: '1px solid var(--border)' }}>
                  {[0, 1, 2].map(i => (
                    <span key={i} className="w-1.5 h-1.5 rounded-full animate-bounce"
                      style={{ background: 'var(--muted)', animationDelay: `${i * 0.15}s` }} />
                  ))}
                </div>
              </div>
            )}
            <div ref={bottomRef} />
          </div>

          {/* Quick actions */}
          <div className="flex flex-wrap gap-1 px-2 py-1.5 border-t shrink-0"
            style={{ background: 'var(--panel)', borderColor: 'var(--border)' }}>
            {QUICK_MSGS.map(q => (
              <button key={q.text} onClick={() => send(q.text)} disabled={loading}
                className="px-2 py-0.5 rounded-full text-[10px] font-medium border transition-colors disabled:opacity-40"
                style={{ background: 'var(--card)', borderColor: 'var(--border)', color: 'var(--foreground)' }}>
                {q.label}
              </button>
            ))}
          </div>

          {/* Input */}
          <div className="flex items-center gap-1.5 px-2 py-2 border-t shrink-0"
            style={{ background: 'var(--panel)', borderColor: 'var(--border)' }}>
            <input
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send(input) } }}
              placeholder="Mensagem…"
              className="flex-1 px-2.5 py-1.5 rounded-full text-xs outline-none min-w-0"
              style={{ background: 'var(--card)', border: '1px solid var(--border)', color: 'var(--foreground)' }}
            />
            <button onClick={() => send(input)} disabled={!input.trim() || loading}
              className="w-7 h-7 rounded-full flex items-center justify-center text-sm shrink-0 transition-all disabled:opacity-30"
              style={{ background: 'var(--green)', color: '#fff' }}>
              ↑
            </button>
          </div>
        </>
      )}
    </div>
  )
}
