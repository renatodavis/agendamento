'use client'
import { useState, useCallback } from 'react'
import WaPanel from '@/components/wa/WaPanel'
import PipelinePanel, { type PipelineState } from '@/components/pipeline/PipelinePanel'
import LogPanel, { type LogEntry } from '@/components/log/LogPanel'
import AgendaBottomPanel from '@/components/agenda/AgendaBottomPanel'

const EMPTY_PIPELINE: PipelineState = { active: [], done: [], workflow: null }

export default function AppLayout() {
  const [pipeline, setPipeline] = useState<PipelineState>(EMPTY_PIPELINE)
  const [logEntries, setLogEntries] = useState<LogEntry[]>([])
  const [stats, setStats] = useState({ total: 0, tokens: 0, latency: 0, cost: 0 })

  const handleLog = useCallback((e: LogEntry) => {
    setLogEntries(prev => [...prev, e])
    if (e.agent === 'paciente') {
      setStats(s => ({ ...s, total: s.total + 1 }))
    }
  }, [])

  const handleStats = useCallback((delta: { tokens?: number; latency?: number; cost?: number }) => {
    setStats(s => ({
      ...s,
      tokens: s.tokens + (delta.tokens ?? 0),
      latency: delta.latency ?? s.latency,
      cost: s.cost + (delta.cost ?? 0),
    }))
  }, [])

  return (
    <div className="flex flex-col h-screen overflow-hidden" style={{ background: 'var(--background)' }}>

      {/* ── Header ── */}
      <header className="flex items-center justify-between px-4 shrink-0 border-b"
        style={{ height: 50, background: 'var(--panel)', borderColor: 'var(--border)' }}>
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg flex items-center justify-center text-base shrink-0"
            style={{ background: 'var(--green)' }}>🏥</div>
          <div>
            <div className="font-display font-bold text-sm leading-none">Clínica São Lucas</div>
            <div className="text-[10px] tracking-[.05em] uppercase mt-0.5" style={{ color: 'var(--muted)' }}>
              Sistema de IA · Supabase ✓
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-2 px-2.5 py-1 rounded-full text-[10px] font-medium border"
            style={{ background: 'var(--card)', borderColor: 'var(--border)', color: 'var(--muted)' }}>
            <span className="font-semibold" style={{ color: 'var(--foreground)' }}>{stats.total}</span> consultas
          </div>
          <div className="flex items-center gap-2 px-2.5 py-1 rounded-full text-[10px] font-medium border"
            style={{ background: 'var(--card)', borderColor: 'var(--border)', color: 'var(--muted)' }}>
            <span className="font-semibold" style={{ color: 'var(--foreground)' }}>{stats.tokens}</span> tokens
          </div>
          <div className="flex items-center gap-2 px-2.5 py-1 rounded-full text-[10px] font-medium border"
            style={{ background: 'var(--card)', borderColor: 'var(--border)', color: 'var(--muted)' }}>
            <span className="font-semibold" style={{ color: 'var(--foreground)' }}>
              US${stats.cost.toFixed(4)}
            </span> custo
          </div>
          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-semibold border"
            style={{ background: '#14C38E18', borderColor: '#14C38E40', color: 'var(--green)' }}>
            <span className="w-1.5 h-1.5 rounded-full animate-pulse" style={{ background: 'var(--green)' }} />
            Online
          </div>
        </div>
      </header>

      {/* ── 3-column body ── */}
      <div className="flex flex-1 min-h-0">
        {/* Left: WhatsApp — full height */}
        <WaPanel
          onPipelineChange={setPipeline}
          onLog={handleLog}
          onStats={handleStats}
        />

        {/* Center: Agenda (top) + Pipeline (bottom) */}
        <div className="flex flex-col flex-1 min-h-0 border-r" style={{ borderColor: 'var(--border)' }}>
          <AgendaBottomPanel />
          <PipelinePanel state={pipeline} />
        </div>

        {/* Right: Log — full height */}
        <LogPanel entries={logEntries} stats={stats} />
      </div>
    </div>
  )
}
