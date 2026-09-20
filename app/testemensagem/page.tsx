'use client'
import { useState, useRef, useEffect } from 'react'

type Msg = { id: string; role: 'user' | 'bot'; text: string; ts: Date }

const QUICK = [
  { label: '📅 Agendar',  text: 'Quero agendar uma consulta' },
  { label: '🚨 Urgência', text: 'Tenho dor no peito há 2 horas' },
  { label: '👤 Cadastro', text: 'Sou novo paciente, quero me cadastrar' },
  { label: '💊 Receita',  text: 'Preciso renovar minha receita de losartana' },
]

function makeWebhookPayload(phone: string, text: string) {
  return {
    object: 'whatsapp_business_account',
    entry: [{
      id: '0',
      changes: [{
        value: {
          messaging_product: 'whatsapp',
          metadata: { display_phone_number: '15550000000', phone_number_id: 'TEST_PHONE_ID' },
          contacts: [{ profile: { name: 'Paciente Teste' }, wa_id: phone }],
          messages: [{
            from: phone,
            id: `wamid.test_${Date.now()}`,
            timestamp: String(Math.floor(Date.now() / 1000)),
            text: { body: text },
            type: 'text',
          }],
        },
        field: 'messages',
      }],
    }],
  }
}

export default function TesteMensagem() {
  const [msgs, setMsgs]     = useState<Msg[]>([])
  const [input, setInput]   = useState('')
  const [phone, setPhone]   = useState('5511999990001')
  const [loading, setLoading] = useState(false)
  const [lastPayload, setLastPayload] = useState<string | null>(null)
  const [showPayload, setShowPayload] = useState(false)
  const bottomRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [msgs, loading])

  async function send(text: string) {
    const trimmed = text.trim()
    if (!trimmed || loading) return

    const userMsg: Msg = { id: crypto.randomUUID(), role: 'user', text: trimmed, ts: new Date() }
    setMsgs(prev => [...prev, userMsg])
    setInput('')
    setLoading(true)

    const payload = makeWebhookPayload(phone, trimmed)
    setLastPayload(JSON.stringify(payload, null, 2))

    try {
      const res = await fetch('/api/whatsapp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })
      const data = await res.json()

      const botText = data.response ?? (data.error ? `Erro: ${data.error}` : '(sem resposta)')
      const botMsg: Msg = { id: crypto.randomUUID(), role: 'bot', text: botText, ts: new Date() }
      setMsgs(prev => [...prev, botMsg])
    } catch (e) {
      setMsgs(prev => [...prev, {
        id: crypto.randomUUID(), role: 'bot',
        text: `Erro de conexão: ${e instanceof Error ? e.message : 'desconhecido'}`,
        ts: new Date(),
      }])
    } finally {
      setLoading(false)
    }
  }

  function fmtTime(d: Date) {
    return d.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-start py-8 px-4"
      style={{ background: 'var(--background, #F0F5FA)' }}>

      {/* Header */}
      <div className="w-full max-w-lg mb-4">
        <div className="flex items-center gap-3 mb-1">
          <div className="w-10 h-10 rounded-xl flex items-center justify-center text-xl"
            style={{ background: '#25D366' }}>📱</div>
          <div>
            <h1 className="font-bold text-lg leading-none">Simulador de Webhook WhatsApp</h1>
            <p className="text-xs mt-0.5" style={{ color: 'var(--muted, #6B7280)' }}>
              Envia mensagens no formato exato da Meta API → <code className="px-1 py-0.5 rounded text-[10px]"
                style={{ background: 'rgba(0,0,0,0.06)' }}>/api/whatsapp</code>
            </p>
          </div>
        </div>

        {/* Phone config */}
        <div className="flex items-center gap-2 mt-3 p-2 rounded-lg border"
          style={{ background: 'var(--card, #fff)', borderColor: 'var(--border, #E5E7EB)' }}>
          <span className="text-xs font-semibold whitespace-nowrap" style={{ color: 'var(--muted, #6B7280)' }}>
            📞 De:
          </span>
          <input
            value={phone}
            onChange={e => setPhone(e.target.value.replace(/\D/g, ''))}
            placeholder="5511999990001"
            className="flex-1 text-xs font-mono outline-none bg-transparent"
          />
          <span className="text-[10px] px-1.5 py-0.5 rounded-full font-semibold"
            style={{ background: '#25D36618', color: '#128C7E' }}>
            WhatsApp Teste
          </span>
        </div>
      </div>

      {/* Chat window */}
      <div className="w-full max-w-lg flex flex-col rounded-2xl overflow-hidden shadow-lg border"
        style={{ background: '#ECF5F1', borderColor: 'var(--border, #E5E7EB)', minHeight: 400 }}>

        {/* WA-style header */}
        <div className="flex items-center gap-3 px-4 py-2.5" style={{ background: '#128C7E' }}>
          <div className="w-9 h-9 rounded-full flex items-center justify-center text-lg"
            style={{ background: 'rgba(255,255,255,0.2)' }}>🏥</div>
          <div className="flex-1">
            <div className="text-sm font-semibold text-white">Clínica São Lucas</div>
            <div className="text-[10px]" style={{ color: 'rgba(255,255,255,0.8)' }}>
              via <code>/api/whatsapp</code> · payload Meta formato real
            </div>
          </div>
          <button
            onClick={() => setShowPayload(v => !v)}
            className="text-[10px] font-semibold px-2 py-1 rounded-lg transition-all"
            style={{ background: 'rgba(255,255,255,0.2)', color: '#fff' }}>
            {showPayload ? 'Ocultar JSON' : 'Ver JSON'}
          </button>
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto px-3 py-3 flex flex-col gap-2"
          style={{ minHeight: 300 }}>
          {msgs.length === 0 && !loading && (
            <div className="flex-1 flex items-center justify-center text-center text-xs py-12"
              style={{ color: 'rgba(0,0,0,0.4)' }}>
              Envie uma mensagem para testar o webhook<br />
              <span className="block mt-1 opacity-60">Mesmo formato que a Meta usa em produção</span>
            </div>
          )}
          {msgs.map(m => (
            <div key={m.id} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
              <div className="max-w-[85%]">
                <div className="px-3 py-2 text-sm leading-snug"
                  style={{
                    background: m.role === 'user' ? '#D4EDD5' : '#FFFFFF',
                    borderRadius: m.role === 'user' ? '12px 3px 12px 12px' : '3px 12px 12px 12px',
                    border: m.role === 'bot' ? '1px solid rgba(0,0,0,0.08)' : 'none',
                    color: '#111',
                    whiteSpace: 'pre-wrap',
                  }}>
                  {m.text}
                </div>
                <div className={`text-[9px] mt-0.5 ${m.role === 'user' ? 'text-right' : 'text-left'}`}
                  style={{ color: 'rgba(0,0,0,0.4)' }}>
                  {fmtTime(m.ts)} {m.role === 'bot' ? '✓✓' : ''}
                </div>
              </div>
            </div>
          ))}
          {loading && (
            <div className="flex justify-start">
              <div className="px-3 py-2 flex items-center gap-1 rounded-[3px_12px_12px_12px]"
                style={{ background: '#FFFFFF', border: '1px solid rgba(0,0,0,0.08)' }}>
                {[0, 1, 2].map(i => (
                  <span key={i} className="w-1.5 h-1.5 rounded-full animate-bounce"
                    style={{ background: '#999', animationDelay: `${i * 0.15}s` }} />
                ))}
              </div>
            </div>
          )}
          <div ref={bottomRef} />
        </div>

        {/* Quick chips */}
        <div className="flex flex-wrap gap-1.5 px-3 py-2 border-t"
          style={{ background: '#F7FAF8', borderColor: 'rgba(0,0,0,0.08)' }}>
          {QUICK.map(q => (
            <button key={q.text} onClick={() => send(q.text)} disabled={loading}
              className="px-2.5 py-1 rounded-full text-[11px] font-medium border transition-colors disabled:opacity-40"
              style={{ background: '#fff', borderColor: 'rgba(0,0,0,0.12)', color: '#444' }}>
              {q.label}
            </button>
          ))}
        </div>

        {/* Input bar */}
        <div className="flex items-center gap-2 px-3 py-2.5 border-t"
          style={{ background: '#F7FAF8', borderColor: 'rgba(0,0,0,0.08)' }}>
          <input
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send(input) } }}
            placeholder="Digite a mensagem do paciente…"
            className="flex-1 px-3 py-2 rounded-full text-sm outline-none border"
            style={{ background: '#fff', borderColor: 'rgba(0,0,0,0.12)', color: '#111' }}
          />
          <button onClick={() => send(input)} disabled={!input.trim() || loading}
            className="w-9 h-9 rounded-full flex items-center justify-center shrink-0 transition-all disabled:opacity-40"
            style={{ background: '#128C7E', color: '#fff', fontSize: 16 }}>
            ↑
          </button>
        </div>
      </div>

      {/* JSON Payload viewer */}
      {showPayload && lastPayload && (
        <div className="w-full max-w-lg mt-4 rounded-xl overflow-hidden border"
          style={{ borderColor: 'var(--border, #E5E7EB)' }}>
          <div className="px-3 py-2 flex items-center justify-between"
            style={{ background: '#1E293B' }}>
            <span className="text-xs font-semibold text-white">Payload enviado para /api/whatsapp</span>
            <button
              onClick={() => navigator.clipboard.writeText(lastPayload)}
              className="text-[10px] px-2 py-0.5 rounded font-medium"
              style={{ background: 'rgba(255,255,255,0.15)', color: '#94A3B8' }}>
              Copiar
            </button>
          </div>
          <pre className="text-[11px] leading-relaxed overflow-x-auto p-3"
            style={{ background: '#0F172A', color: '#7DD3FC', maxHeight: 320 }}>
            {lastPayload}
          </pre>
        </div>
      )}

      {/* Link back */}
      <a href="/" className="mt-6 text-xs underline" style={{ color: 'var(--muted, #6B7280)' }}>
        ← Voltar ao dashboard
      </a>
    </div>
  )
}
