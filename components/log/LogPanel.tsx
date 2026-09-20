'use client'

export type LogEntry = {
  id: string
  agent: string
  action: string
  status: 'processing' | 'done' | 'error'
  ts: Date
}

const AGENT_COLORS: Record<string, string> = {
  'coordenador-clinico':    '#F0A500',
  'triagem-whatsapp':       '#3B9EFF',
  'gerenciador-consultas':  '#14C38E',
  'cadastro-pacientes':     '#22D3EE',
  'prontuario-clinico':     '#A78BFA',
  'comunicacao-whatsapp':   '#14C38E',
  'faturamento-cobranca':   '#FB923C',
  'auditoria-conformidade': '#F472B6',
  'sistema':                '#6B7280',
  'paciente':               '#3B9EFF',
}

function fmtTs(d: Date) {
  return d.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit', second: '2-digit' })
}

export default function LogPanel({ entries, stats }: {
  entries: LogEntry[]
  stats: { total: number; tokens: number; latency: number; cost: number }
}) {
  return (
    <div className="flex flex-col" style={{
      width: '100%', height: '100%',
      background: 'var(--panel)',
    }}>
      {/* Header */}
      <div className="flex items-center justify-between px-3 h-[42px] border-b shrink-0"
        style={{ borderColor: 'var(--border)' }}>
        <span className="font-display text-[11px] font-semibold tracking-[.06em] uppercase" style={{ color: 'var(--muted)' }}>
          Log de Agentes
        </span>
        <span className="text-[10px] px-1.5 py-0.5 rounded-lg border" style={{
          background: 'var(--card)', borderColor: 'var(--border)', color: 'var(--muted)'
        }}>
          {entries.length}
        </span>
      </div>

      {/* Stats grid */}
      <div className="grid grid-cols-2 border-b shrink-0" style={{
        background: 'var(--border)', gap: 1, borderColor: 'var(--border)'
      }}>
        {[
          { val: String(stats.total),               l: 'consultas' },
          { val: String(stats.tokens),              l: 'tokens' },
          { val: `${stats.latency}ms`,              l: 'latência' },
          { val: `$${stats.cost.toFixed(4)}`,       l: 'custo USD' },
        ].map(({ val, l }) => (
          <div key={l} className="flex flex-col items-center py-1.5" style={{ background: 'var(--card)' }}>
            <span className="font-display font-bold text-sm leading-none" style={{ color: 'var(--foreground)' }}>
              {val}
            </span>
            <span className="text-[8px] uppercase tracking-[.07em] mt-0.5" style={{ color: 'var(--muted)' }}>{l}</span>
          </div>
        ))}
      </div>

      {/* Entries */}
      <div className="flex-1 overflow-y-auto p-1.5 flex flex-col gap-1"
        style={{ scrollbarWidth: 'thin', scrollbarColor: 'var(--border) transparent' }}>
        {entries.length === 0 && (
          <div className="flex-1 flex items-center justify-center text-center p-4 text-xs leading-relaxed"
            style={{ color: 'var(--muted)' }}>
            Nenhuma atividade ainda.<br />Envie uma mensagem para ver o pipeline em ação.
          </div>
        )}
        {[...entries].reverse().map(e => {
          const color = AGENT_COLORS[e.agent] ?? 'var(--muted)'
          return (
            <div key={e.id} className="px-2 py-1.5 rounded-md border-l-[3px]"
              style={{
                background: 'var(--card)',
                border: '1px solid var(--border)',
                borderLeftColor: color,
                animation: 'log-in .2s ease-out',
              }}>
              <div className="flex items-center justify-between gap-1 mb-0.5">
                <span className="text-[9px] font-semibold tracking-[.03em] uppercase truncate"
                  style={{ color }}>
                  {e.agent.replace(/-/g, ' ')}
                </span>
                <div className="flex items-center gap-1 shrink-0">
                  <span className="w-[5px] h-[5px] rounded-full"
                    style={{
                      background: e.status === 'done' ? 'var(--green)'
                        : e.status === 'processing' ? 'var(--gold)'
                        : 'var(--red)',
                      animation: e.status === 'processing' ? 'pulse-dot .8s ease-in-out infinite' : undefined,
                    }}
                  />
                  <span className="text-[9px]" style={{ color: 'var(--muted)' }}>{fmtTs(e.ts)}</span>
                </div>
              </div>
              <div className="text-[10px] leading-snug" style={{ color: 'var(--muted)' }}>{e.action}</div>
            </div>
          )
        })}
      </div>

      <style>{`
        @keyframes log-in { from { opacity:0; transform:translateX(8px) } to { opacity:1; transform:none } }
        @keyframes pulse-dot { 0%,100%{opacity:.6;transform:scale(.9)} 50%{opacity:1;transform:scale(1.1)} }
      `}</style>
    </div>
  )
}
