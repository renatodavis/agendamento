'use client'

export type PipelineState = {
  active: string[]
  done: string[]
  workflow: string | null
}

const AGENT_META: Record<string, { short: string; icon: string; color: string }> = {
  'coordenador-clinico':    { short: 'Coordenador',  icon: '⚡', color: '#F0A500' },
  'triagem-whatsapp':       { short: 'Triagem',      icon: '💬', color: '#3B9EFF' },
  'gerenciador-consultas':  { short: 'Consultas',    icon: '📅', color: '#14C38E' },
  'cadastro-pacientes':     { short: 'Cadastro',     icon: '👤', color: '#22D3EE' },
  'prontuario-clinico':     { short: 'Prontuário',   icon: '📋', color: '#A78BFA' },
  'comunicacao-whatsapp':   { short: 'Comunicação',  icon: '📱', color: '#14C38E' },
  'faturamento-cobranca':   { short: 'Faturamento',  icon: '💰', color: '#FB923C' },
  'auditoria-conformidade': { short: 'Auditoria',    icon: '🔒', color: '#F472B6' },
}

const WORKFLOW_STEPS: Record<string, string[]> = {
  agendamento: ['coordenador-clinico','triagem-whatsapp','gerenciador-consultas','comunicacao-whatsapp','auditoria-conformidade'],
  urgencia:    ['coordenador-clinico','triagem-whatsapp','comunicacao-whatsapp','auditoria-conformidade'],
  cadastro:    ['coordenador-clinico','cadastro-pacientes','auditoria-conformidade'],
  prontuario:  ['coordenador-clinico','prontuario-clinico','auditoria-conformidade'],
  receita:     ['coordenador-clinico','prontuario-clinico','faturamento-cobranca','auditoria-conformidade'],
}

const WORKFLOW_LABELS: Record<string, string> = {
  agendamento: 'Agendamento',
  urgencia:    'Urgência',
  cadastro:    'Cadastro',
  prontuario:  'Prontuário',
  receita:     'Receita',
}

const ALL_AGENTS = Object.keys(AGENT_META)

export default function PipelinePanel({ state }: { state: PipelineState }) {
  const { active, done, workflow } = state
  const isIdle = active.length === 0 && done.length === 0

  const steps = workflow ? (WORKFLOW_STEPS[workflow] ?? ALL_AGENTS.slice(0, 5)) : ALL_AGENTS.slice(0, 5)

  return (
    <div className="flex flex-col shrink-0 border-t" style={{ borderColor: 'var(--border)', background: 'var(--panel)' }}>
      {/* Header */}
      <div className="flex items-center justify-between px-4 h-[38px] border-b shrink-0"
        style={{ borderColor: 'var(--border)' }}>
        <div className="flex items-center gap-2">
          <span className="w-[5px] h-[5px] rounded-full"
            style={{ background: active.length > 0 ? 'var(--gold)' : done.length > 0 ? 'var(--green)' : 'var(--border)',
                     animation: active.length > 0 ? 'ppulse 1.2s ease-in-out infinite' : 'none' }} />
          <span className="font-display text-[10px] font-semibold tracking-[.06em] uppercase" style={{ color: 'var(--muted)' }}>
            Pipeline de Agentes
          </span>
          {workflow && (
            <span className="text-[9px] font-semibold px-2 py-0.5 rounded-full"
              style={{
                color: workflow === 'urgencia' ? '#EF4444' : '#14C38E',
                background: workflow === 'urgencia' ? '#EF444415' : '#14C38E15',
                border: `1px solid ${workflow === 'urgencia' ? '#EF444440' : '#14C38E40'}`,
              }}>
              {WORKFLOW_LABELS[workflow] ?? workflow}
            </span>
          )}
        </div>
        <span className="text-[9px] italic" style={{ color: 'var(--muted)' }}>
          {active.length > 0 ? 'processando…' : done.length > 0 ? 'concluído' : 'aguardando'}
        </span>
      </div>

      {/* Linear steps */}
      <div className="flex items-center px-4 py-3 gap-0 overflow-x-auto"
        style={{ scrollbarWidth: 'none' }}>
        {steps.map((id, i) => {
          const meta = AGENT_META[id] ?? { short: id, icon: '🤖', color: '#888' }
          const isActive = active.includes(id)
          const isDone = done.includes(id)
          const isNext = !isDone && !isActive && done.length > 0 && i === done.length

          return (
            <div key={id} className="flex items-center shrink-0">
              {/* Step node */}
              <div className="flex flex-col items-center gap-1" style={{ minWidth: 56 }}>
                {/* Circle */}
                <div className="relative flex items-center justify-center rounded-full text-base"
                  style={{
                    width: 36, height: 36,
                    background: isDone
                      ? meta.color
                      : isActive
                        ? `${meta.color}22`
                        : 'var(--card)',
                    border: `2px solid ${isDone || isActive ? meta.color : 'var(--border)'}`,
                    boxShadow: isActive ? `0 0 10px ${meta.color}55` : 'none',
                    transition: 'all 0.4s',
                    animation: isActive ? 'node-pulse 1.4s ease-in-out infinite' : 'none',
                    fontSize: 16,
                  }}>
                  {isDone ? (
                    <span style={{ fontSize: 14, color: '#fff' }}>✓</span>
                  ) : (
                    <span style={{ filter: isDone || isActive ? 'none' : 'grayscale(0.6) opacity(0.5)' }}>
                      {meta.icon}
                    </span>
                  )}
                </div>
                {/* Label */}
                <span className="text-[9px] font-medium text-center leading-tight"
                  style={{ color: isDone ? meta.color : isActive ? meta.color : 'var(--muted)', maxWidth: 52 }}>
                  {meta.short}
                </span>
              </div>

              {/* Connector line (not after last) */}
              {i < steps.length - 1 && (
                <div className="shrink-0 mx-1" style={{ width: 28, height: 2, position: 'relative', marginBottom: 14 }}>
                  {/* Track */}
                  <div style={{ position: 'absolute', inset: 0, background: 'var(--border)', borderRadius: 1 }} />
                  {/* Fill */}
                  <div style={{
                    position: 'absolute', top: 0, left: 0, height: '100%', borderRadius: 1,
                    background: isDone && done.includes(steps[i + 1]) ? meta.color
                      : isDone ? `linear-gradient(to right, ${meta.color}, var(--border))`
                      : 'transparent',
                    width: isDone && done.includes(steps[i + 1]) ? '100%'
                      : isDone ? '50%' : '0%',
                    transition: 'width 0.5s ease, background 0.4s',
                  }} />
                </div>
              )}
            </div>
          )
        })}

        {/* Idle placeholder when nothing is running */}
        {isIdle && (
          <div className="ml-4 text-[10px] italic" style={{ color: 'var(--muted)' }}>
            Envie uma mensagem para ver o pipeline em ação.
          </div>
        )}
      </div>

      <style>{`
        @keyframes ppulse { 0%,100%{opacity:1} 50%{opacity:.3} }
        @keyframes node-pulse {
          0%,100% { box-shadow: 0 0 8px var(--glow,#F0A500)55; }
          50%      { box-shadow: 0 0 18px var(--glow,#F0A500)99; }
        }
      `}</style>
    </div>
  )
}
