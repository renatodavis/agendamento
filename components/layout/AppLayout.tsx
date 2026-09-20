'use client'
import { useState, useCallback } from 'react'
import WaPanel from '@/components/wa/WaPanel'
import PipelinePanel, { type PipelineState } from '@/components/pipeline/PipelinePanel'
import LogPanel, { type LogEntry } from '@/components/log/LogPanel'
import AgendaBottomPanel from '@/components/agenda/AgendaBottomPanel'

const EMPTY_PIPELINE: PipelineState = { active: [], done: [], workflow: null }

type MobileTab = 'wa' | 'agenda' | 'metrics'

function StatChip({ value, label, dim }: { value: string | number; label: string; dim?: boolean }) {
  return (
    <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg border text-[11px]"
      style={{
        background: 'var(--card)',
        borderColor: 'var(--border)',
        color: dim ? 'var(--muted)' : 'var(--foreground)',
        boxShadow: 'var(--shadow-sm)',
      }}>
      <span className="font-bold tabular-nums" style={{ color: 'var(--foreground)' }}>{value}</span>
      <span style={{ color: 'var(--muted)' }}>{label}</span>
    </div>
  )
}

export default function AppLayout() {
  const [pipeline, setPipeline]   = useState<PipelineState>(EMPTY_PIPELINE)
  const [logEntries, setLogEntries] = useState<LogEntry[]>([])
  const [stats, setStats]         = useState({ total: 0, tokens: 0, latency: 0, cost: 0 })
  const [mobileTab, setMobileTab] = useState<MobileTab>('wa')
  const [logOpen, setLogOpen]     = useState(true)

  const handleLog = useCallback((e: LogEntry) => {
    setLogEntries(prev => [...prev, e])
    if (e.agent === 'paciente') setStats(s => ({ ...s, total: s.total + 1 }))
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
    <div style={{ display: 'flex', flexDirection: 'column', height: '100dvh', background: 'var(--background)', overflow: 'hidden' }}>

      {/* ── Header ── */}
      <header style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '0 16px', height: 52, flexShrink: 0,
        background: 'var(--panel)',
        borderBottom: '1px solid var(--border)',
        boxShadow: 'var(--shadow-sm)',
      }}>
        {/* Logo */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{
            width: 34, height: 34, borderRadius: 10,
            display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 16, flexShrink: 0,
            background: 'linear-gradient(135deg, var(--green) 0%, #0A7A5E 100%)',
            boxShadow: '0 2px 6px rgba(13,158,119,.35)',
          }}>🏥</div>
          <div>
            <div style={{ fontWeight: 700, fontSize: 14, lineHeight: 1, letterSpacing: '-.01em', color: 'var(--foreground)' }}>
              Clínica São Lucas
            </div>
            <div style={{ fontSize: 9, marginTop: 3, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '.06em' }}>
              Sistema de IA ·{' '}
              <span style={{ color: 'var(--green)', fontWeight: 600 }}>● Online</span>
            </div>
          </div>
        </div>

        {/* Desktop stats */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }} className="hidden-mobile">
          <StatChip value={stats.total} label="consultas" />
          <StatChip value={stats.tokens.toLocaleString('pt-BR')} label="tokens" />
          <StatChip value={`US$${stats.cost.toFixed(4)}`} label="custo" />
          <button
            onClick={() => setLogOpen(v => !v)}
            style={{
              padding: '4px 10px', borderRadius: 8, fontSize: 10, fontWeight: 600,
              border: '1px solid var(--border)', background: 'var(--card)',
              color: logOpen ? 'var(--blue)' : 'var(--muted)',
              cursor: 'pointer', letterSpacing: '.02em',
              boxShadow: 'var(--shadow-sm)',
            }}
            title={logOpen ? 'Recolher log' : 'Expandir log'}>
            {logOpen ? '⊟ Log' : '⊞ Log'}
          </button>
        </div>

        {/* Mobile: minimal stats */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }} className="visible-mobile">
          {stats.total > 0 && <StatChip value={stats.total} label="consultas" />}
          <div style={{
            display: 'flex', alignItems: 'center', gap: 5, padding: '4px 10px',
            borderRadius: 20, fontSize: 10, fontWeight: 600, border: '1px solid #14C38E40',
            background: '#14C38E10', color: 'var(--green)',
          }}>
            <span style={{ width: 5, height: 5, borderRadius: '50%', background: 'var(--green)', animation: 'pulse 2s ease infinite' }} />
            Online
          </div>
        </div>
      </header>

      {/* ── Body ── */}
      <div style={{ display: 'flex', flex: 1, minHeight: 0 }}>

        {/* WaPanel */}
        <div className={`wa-col ${mobileTab === 'wa' ? 'mobile-show' : 'mobile-hide'}`}
          style={{ borderRight: '1px solid var(--border)', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
          <WaPanel onPipelineChange={setPipeline} onLog={handleLog} onStats={handleStats} />
        </div>

        {/* Center: Agenda + Pipeline */}
        <div className={`center-col ${mobileTab === 'agenda' ? 'mobile-show' : 'mobile-hide'}`}
          style={{ display: 'flex', flexDirection: 'column', flex: 1, minHeight: 0, borderRight: '1px solid var(--border)', overflow: 'hidden' }}>
          <AgendaBottomPanel />
          <PipelinePanel state={pipeline} />
        </div>

        {/* LogPanel — desktop only when logOpen, always on mobile metrics tab */}
        <div className={[
          'log-col-wrap',
          mobileTab === 'metrics' ? 'mobile-show' : 'mobile-hide',
          logOpen ? 'log-open' : 'log-closed',
        ].join(' ')}>
          <LogPanel entries={logEntries} stats={stats} />
        </div>
      </div>

      {/* ── Mobile bottom nav ── */}
      <nav className="mobile-nav safe-bottom" style={{
        borderTop: '1px solid var(--border)',
        background: 'var(--panel)',
        boxShadow: '0 -2px 8px rgba(0,0,0,.06)',
      }}>
        {([
          { id: 'wa',      icon: '💬', label: 'WhatsApp' },
          { id: 'agenda',  icon: '📅', label: 'Agenda' },
          { id: 'metrics', icon: '📊', label: 'Métricas' },
        ] as { id: MobileTab; icon: string; label: string }[]).map(tab => (
          <button key={tab.id}
            onClick={() => setMobileTab(tab.id)}
            style={{
              flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center',
              gap: 2, padding: '8px 0 6px', border: 'none', background: 'none', cursor: 'pointer',
              color: mobileTab === tab.id ? 'var(--green)' : 'var(--muted)',
              fontSize: 10, fontWeight: mobileTab === tab.id ? 700 : 400,
              transition: 'color .15s',
            }}>
            <span style={{ fontSize: 20, lineHeight: 1 }}>{tab.icon}</span>
            {tab.label}
            {mobileTab === tab.id && (
              <span style={{ width: 4, height: 4, borderRadius: '50%', background: 'var(--green)', marginTop: 1 }} />
            )}
          </button>
        ))}
      </nav>

      <style>{`
        @keyframes pulse { 0%,100%{opacity:1;transform:scale(1)} 50%{opacity:.5;transform:scale(.85)} }

        /* Desktop (≥1024px): 3 cols */
        .wa-col       { width: 264px; flex-shrink: 0; display: flex; flex-direction: column; }
        .center-col   { flex: 1; display: flex; flex-direction: column; }
        .log-col-wrap { width: 218px; flex-shrink: 0; border-left: 1px solid var(--border); display: flex; flex-direction: column; }
        .log-col-wrap.log-closed { display: none; }
        .mobile-nav   { display: none; }
        .hidden-mobile { display: flex; }
        .visible-mobile{ display: none; }
        /* on desktop, mobile-hide has no effect */
        .mobile-hide.wa-col, .mobile-hide.center-col { display: flex !important; }

        /* Tablet (768-1023px): WA + Center only */
        @media (min-width: 768px) and (max-width: 1023px) {
          .wa-col      { width: 240px; }
          .log-col-wrap{ display: none; }
          .mobile-hide.wa-col, .mobile-hide.center-col { display: flex !important; }
        }

        /* Mobile (<768px): one panel at a time + bottom nav */
        @media (max-width: 767px) {
          .wa-col    { width: 100% !important; flex-shrink: 0; border-right: none !important; }
          .center-col{ width: 100% !important; flex-shrink: 0; border-right: none !important; }
          .wa-col.mobile-hide    { display: none !important; }
          .center-col.mobile-hide{ display: none !important; }
          .log-col-wrap          { display: none !important; }
          .log-col-wrap.mobile-show { display: flex !important; flex: 1; width: 100% !important; border-left: none !important; }
          .mobile-nav  { display: flex !important; }
          .hidden-mobile { display: none !important; }
          .visible-mobile{ display: flex !important; }
        }
      `}</style>
    </div>
  )
}
