'use client'
import { useState, useRef, useEffect, useId } from 'react'

const WORKFLOW_LABEL: Record<string, { label: string; color: string }> = {
  agendamento: { label: '📅 Agendamento', color: '#3B9EFF' },
  urgencia:    { label: '🚨 Urgência',    color: '#EF4444' },
  cadastro:    { label: '📋 Cadastro',    color: '#A78BFA' },
  prontuario:  { label: '📂 Prontuário',  color: '#F0A500' },
  receita:     { label: '💊 Receita',     color: '#14C38E' },
}

const QUICK_MSGS = [
  'Quero agendar uma consulta',
  'Tenho dor no peito há 2 horas',
  'Sou novo paciente e quero me cadastrar',
  'Preciso renovar minha receita de losartana',
]

type Msg = {
  id: string
  role: 'user' | 'bot'
  text: string
  workflow?: string
  simulated?: boolean
  ts: Date
}

export default function ChatPanel() {
  const [msgs, setMsgs]         = useState<Msg[]>([])
  const [input, setInput]       = useState('')
  const [loading, setLoading]   = useState(false)
  const [simMode, setSimMode]   = useState(true)
  const [botEnabled, setBotEnabled] = useState(true)
  const [sessionId]             = useState(() => crypto.randomUUID())
  const bottomRef               = useRef<HTMLDivElement>(null)
  const inputRef                = useRef<HTMLTextAreaElement>(null)
  const uid                     = useId()

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [msgs, loading])

  async function send(text: string) {
    const trimmed = text.trim()
    if (!trimmed || loading) return

    const userMsg: Msg = { id: crypto.randomUUID(), role: 'user', text: trimmed, ts: new Date() }
    setMsgs(prev => [...prev, userMsg])
    setInput('')

    // Bot disabled: just show the user message, no response
    if (!botEnabled) return

    setLoading(true)

    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: trimmed, sessionId, simulate: simMode }),
      })
      const data = await res.json()

      if (!res.ok) throw new Error(data.error ?? 'Erro')

      const botMsg: Msg = {
        id: crypto.randomUUID(),
        role: 'bot',
        text: data.response,
        workflow: data.workflow,
        simulated: data.simulated,
        ts: new Date(),
      }
      setMsgs(prev => [...prev, botMsg])
    } catch (err) {
      const errMsg: Msg = {
        id: crypto.randomUUID(),
        role: 'bot',
        text: `Erro ao processar mensagem. Tente novamente.`,
        ts: new Date(),
      }
      setMsgs(prev => [...prev, errMsg])
    } finally {
      setLoading(false)
      requestAnimationFrame(() => inputRef.current?.focus())
    }
  }

  function handleKey(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send(input) }
  }

  const fmtTime = (d: Date) =>
    d.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })

  return (
    <div className="flex flex-col h-full" style={{ background: 'var(--background)' }}>

      {/* Chat toolbar */}
      <div className="flex items-center justify-between px-4 py-2.5 border-b shrink-0"
        style={{ background: 'var(--panel)', borderColor: 'var(--border)' }}>
        <div className="flex items-center gap-2">
          <span className="text-base">🤖</span>
          <div>
            <div className="text-xs font-semibold">Coordenador Clínico</div>
            <div className="text-[10px]" style={{ color: 'var(--muted)' }}>IA · claude-sonnet</div>
          </div>
        </div>
        <div className="flex items-center gap-3">
          {/* Bot on/off */}
          <label className="flex items-center gap-1.5 cursor-pointer select-none" htmlFor={`${uid}-bot`}>
            <span className="text-[10px]" style={{ color: botEnabled ? 'var(--green)' : 'var(--muted)' }}>
              {botEnabled ? 'Bot ON' : 'Bot OFF'}
            </span>
            <div className="relative w-8 h-4">
              <input id={`${uid}-bot`} type="checkbox" className="sr-only"
                checked={botEnabled} onChange={e => setBotEnabled(e.target.checked)} />
              <div className="w-8 h-4 rounded-full transition-colors"
                style={{ background: botEnabled ? '#14C38E' : '#6B7280' }} />
              <div className="absolute top-0.5 left-0.5 w-3 h-3 rounded-full bg-white transition-transform"
                style={{ transform: botEnabled ? 'translateX(16px)' : 'translateX(0)' }} />
            </div>
          </label>
          {/* Sim mode */}
          <label className="flex items-center gap-1.5 cursor-pointer select-none" htmlFor={`${uid}-sim`}>
            <span className="text-[10px]" style={{ color: 'var(--muted)' }}>
              {simMode ? 'Sim' : 'API'}
            </span>
            <div className="relative w-8 h-4">
              <input id={`${uid}-sim`} type="checkbox" className="sr-only"
                checked={simMode} onChange={e => setSimMode(e.target.checked)} />
              <div className="w-8 h-4 rounded-full transition-colors"
                style={{ background: simMode ? '#F0A500' : '#3B9EFF' }} />
              <div className="absolute top-0.5 left-0.5 w-3 h-3 rounded-full bg-white transition-transform"
                style={{ transform: simMode ? 'translateX(0)' : 'translateX(16px)' }} />
            </div>
          </label>
        </div>
      </div>

      {/* Status banners */}
      {!botEnabled && (
        <div className="flex items-center gap-2 px-4 py-1.5 text-[10px] shrink-0"
          style={{ background: '#6B728012', borderBottom: '1px solid #6B728030', color: 'var(--muted)' }}>
          <span>⏸</span>
          Bot desligado — mensagens aparecem mas o assistente não responde
        </div>
      )}
      {botEnabled && simMode && (
        <div className="flex items-center gap-2 px-4 py-1.5 text-[10px] shrink-0"
          style={{ background: '#F0A50012', borderBottom: '1px solid #F0A50030', color: '#F0A500' }}>
          <span>⚡</span>
          Modo simulação — respostas são scripts locais, sem chamada à API
        </div>
      )}
      {botEnabled && !simMode && (
        <div className="flex items-center gap-2 px-4 py-1.5 text-[10px] shrink-0"
          style={{ background: '#3B9EFF12', borderBottom: '1px solid #3B9EFF30', color: 'var(--blue)' }}>
          <span>🔵</span>
          API real ativa — requer ANTHROPIC_API_KEY no .env.local
        </div>
      )}

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-4 py-3 flex flex-col gap-3">
        {msgs.length === 0 && !loading && (
          <div className="flex flex-col items-center justify-center h-full gap-4 pb-4">
            <div className="text-3xl opacity-40">💬</div>
            <p className="text-xs text-center leading-relaxed" style={{ color: 'var(--muted)' }}>
              Simule uma conversa de paciente<br />via WhatsApp com o assistente IA
            </p>
            <div className="flex flex-col gap-1.5 w-full max-w-xs">
              {QUICK_MSGS.map(q => (
                <button key={q} onClick={() => send(q)}
                  className="w-full text-left px-3 py-2 rounded-xl border text-[11px] transition-colors"
                  style={{ borderColor: 'var(--border)', background: 'var(--card)', color: 'var(--muted)' }}>
                  {q}
                </button>
              ))}
            </div>
          </div>
        )}

        {msgs.map(m => (
          <div key={m.id} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'} gap-2`}>
            {m.role === 'bot' && (
              <div className="w-6 h-6 rounded-full shrink-0 flex items-center justify-center text-xs mt-1"
                style={{ background: '#3B9EFF20', color: 'var(--blue)' }}>🤖</div>
            )}
            <div className="max-w-[78%] flex flex-col gap-1">
              {m.role === 'bot' && m.workflow && WORKFLOW_LABEL[m.workflow] && (
                <span className="self-start text-[9px] font-bold px-2 py-0.5 rounded-full border"
                  style={{
                    color: WORKFLOW_LABEL[m.workflow].color,
                    borderColor: WORKFLOW_LABEL[m.workflow].color,
                    background: `${WORKFLOW_LABEL[m.workflow].color}15`,
                  }}>
                  {WORKFLOW_LABEL[m.workflow].label}
                  {m.simulated && <span className="opacity-60 font-normal"> · sim</span>}
                </span>
              )}
              <div className="px-3 py-2 rounded-2xl text-xs leading-relaxed whitespace-pre-wrap"
                style={{
                  background: m.role === 'user' ? 'var(--blue)' : 'var(--card)',
                  color: m.role === 'user' ? '#fff' : 'var(--foreground)',
                  borderRadius: m.role === 'user'
                    ? '16px 4px 16px 16px'
                    : '4px 16px 16px 16px',
                }}>
                {m.text}
              </div>
              <span className="text-[9px] self-end" style={{ color: 'var(--muted)' }}>
                {fmtTime(m.ts)}
              </span>
            </div>
          </div>
        ))}

        {loading && (
          <div className="flex justify-start gap-2">
            <div className="w-6 h-6 rounded-full shrink-0 flex items-center justify-center text-xs"
              style={{ background: '#3B9EFF20', color: 'var(--blue)' }}>🤖</div>
            <div className="px-4 py-2.5 rounded-2xl flex items-center gap-1.5"
              style={{ background: 'var(--card)', borderRadius: '4px 16px 16px 16px' }}>
              {[0, 1, 2].map(i => (
                <span key={i} className="w-1.5 h-1.5 rounded-full animate-bounce"
                  style={{ background: 'var(--muted)', animationDelay: `${i * 0.15}s` }} />
              ))}
            </div>
          </div>
        )}

        <div ref={bottomRef} />
      </div>

      {/* Input */}
      <div className="px-3 py-2 border-t shrink-0"
        style={{ background: 'var(--panel)', borderColor: 'var(--border)' }}>
        <div className="flex items-end gap-2 px-3 py-2 rounded-2xl border"
          style={{ background: 'var(--card)', borderColor: 'var(--border)' }}>
          <textarea ref={inputRef} rows={1} value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={handleKey}
            placeholder="Digite a mensagem do paciente…"
            className="flex-1 resize-none bg-transparent text-xs outline-none leading-relaxed"
            style={{ color: 'var(--foreground)', maxHeight: 96, overflowY: 'auto' }}
          />
          <button onClick={() => send(input)} disabled={!input.trim() || loading}
            className="w-8 h-8 rounded-full shrink-0 flex items-center justify-center text-sm transition-all disabled:opacity-30"
            style={{ background: 'var(--blue)', color: '#fff' }}>
            ↑
          </button>
        </div>
        <div className="text-[9px] mt-1.5 text-center" style={{ color: 'var(--muted)' }}>
          Enter para enviar · Shift+Enter para nova linha
        </div>
      </div>
    </div>
  )
}
