'use client'
import { useState, useCallback, useEffect } from 'react'
import { createBrowserClient } from '@supabase/ssr'
import { useRouter } from 'next/navigation'
import WaPanel from '@/components/wa/WaPanel'
import PipelinePanel, { type PipelineState } from '@/components/pipeline/PipelinePanel'
import LogPanel, { type LogEntry } from '@/components/log/LogPanel'
import AgendaBottomPanel from '@/components/agenda/AgendaBottomPanel'
import { useApprovalCount } from '@/components/agenda/ApprovalPanel'
import { useClinicName } from '@/lib/useClinicName'

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
  const approvalCount             = useApprovalCount()
  const clinicName                = useClinicName()
  const router = useRouter()

  const [aiAlert, setAiAlert] = useState(false)

  useEffect(() => {
    async function checkAi() {
      try {
        const res = await fetch('/api/ai-status')
        if (res.ok) {
          const data = await res.json()
          setAiAlert(data.ok === false)
        }
      } catch { /* silencioso */ }
    }
    checkAi()
    const interval = setInterval(checkAi, 60_000)
    return () => clearInterval(interval)
  }, [])

  const sb = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )

  async function handleLogout() {
    await sb.auth.signOut()
    router.push('/login')
    router.refresh()
  }

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

      {/* ── Alerta de crédito IA ── */}
      {aiAlert && (
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
          padding: '6px 16px', flexShrink: 0, fontSize: 12, fontWeight: 600,
          background: '#F97316', color: '#fff',
        }}>
          <span>⚠️</span>
          <span>Saldo Anthropic insuficiente — o bot de IA está offline.</span>
          <a href="https://console.anthropic.com/settings/billing" target="_blank" rel="noopener noreferrer"
            style={{ color: '#fff', textDecoration: 'underline', fontWeight: 700 }}>
            Adicionar créditos →
          </a>
        </div>
      )}

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
              {clinicName}
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
          <button
            onClick={handleLogout}
            style={{
              padding: '4px 10px', borderRadius: 8, fontSize: 10, fontWeight: 600,
              border: '1px solid var(--border)', background: 'var(--card)',
              color: 'var(--muted)', cursor: 'pointer', letterSpacing: '.02em',
              boxShadow: 'var(--shadow-sm)',
            }}
            title="Sair">
            Sair
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
          <AgendaBottomPanel approvalCount={approvalCount} />
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
              flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', position: 'relative',
              gap: 2, padding: '8px 0 6px', border: 'none', background: 'none', cursor: 'pointer',
              color: mobileTab === tab.id ? 'var(--green)' : 'var(--muted)',
              fontSize: 10, fontWeight: mobileTab === tab.id ? 700 : 400,
              transition: 'color .15s',
            }}>
            <span style={{ fontSize: 20, lineHeight: 1, position: 'relative', display: 'inline-block' }}>
              {tab.icon}
              {/* Approval badge on Agenda icon */}
              {tab.id === 'agenda' && approvalCount > 0 && (
                <span style={{
                  position: 'absolute', top: -4, right: -6,
                  minWidth: 16, height: 16, borderRadius: 8,
                  background: '#F0A500', color: '#fff',
                  fontSize: 9, fontWeight: 800,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  padding: '0 3px', lineHeight: 1,
                  boxShadow: '0 1px 4px rgba(0,0,0,.3)',
                }}>
                  {approvalCount}
                </span>
              )}
            </span>
            {tab.label}
            {mobileTab === tab.id && (
              <span style={{ width: 4, height: 4, borderRadius: '50%', background: 'var(--green)', marginTop: 1 }} />
            )}
          </button>
        ))}
      </nav>

      {/* ── Floating WhatsApp button ── */}
      <a
        href="https://wa.me/554497734024"
        target="_blank"
        rel="noopener noreferrer"
        title="Falar pelo WhatsApp"
        className="wa-fab"
        style={{
          position: 'fixed',
          bottom: 24,
          right: 24,
          width: 56,
          height: 56,
          borderRadius: '50%',
          background: '#25D366',
          boxShadow: '0 4px 16px rgba(37,211,102,.45)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 9999,
          textDecoration: 'none',
          transition: 'transform .15s, box-shadow .15s',
        }}
        onMouseEnter={e => {
          e.currentTarget.style.transform = 'scale(1.1)'
          e.currentTarget.style.boxShadow = '0 6px 24px rgba(37,211,102,.6)'
        }}
        onMouseLeave={e => {
          e.currentTarget.style.transform = 'scale(1)'
          e.currentTarget.style.boxShadow = '0 4px 16px rgba(37,211,102,.45)'
        }}>
        {/* WhatsApp SVG */}
        <svg width="28" height="28" viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path d="M16 2C8.268 2 2 8.268 2 16c0 2.47.668 4.784 1.832 6.77L2 30l7.438-1.795A13.935 13.935 0 0016 30c7.732 0 14-6.268 14-14S23.732 2 16 2z" fill="#fff"/>
          <path d="M23.5 20.5c-.3.85-1.5 1.55-2.45 1.75-.65.13-1.5.24-4.35-1-3.65-1.57-6-5.3-6.18-5.55-.17-.25-1.42-1.9-1.42-3.62s.9-2.57 1.22-2.92c.3-.33.65-.42.87-.42.22 0 .43 0 .62.01.2.01.47-.08.73.55.27.65.9 2.22.98 2.38.08.17.13.37.03.6-.1.22-.15.36-.3.55-.15.2-.32.44-.45.58-.15.16-.3.34-.13.65.17.3.77 1.27 1.65 2.05 1.13 1 2.08 1.32 2.38 1.47.3.15.47.12.65-.07.17-.2.75-.87 1-.17.25.3.47.37.65.37s.37-.05.6-.15c.22-.1 1.42-.67 1.62-1.32.2-.65.2-1.2.14-1.32-.06-.1-.22-.15-.45-.27z" fill="#25D366"/>
        </svg>
      </a>

      <style>{`
        @keyframes pulse { 0%,100%{opacity:1;transform:scale(1)} 50%{opacity:.5;transform:scale(.85)} }
        @media (max-width: 767px) { .wa-fab { bottom: 80px !important; } }

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
