'use client'
import React, { useState, useCallback, useEffect } from 'react'
import { createBrowserClient } from '@supabase/ssr'
import { useRouter } from 'next/navigation'
import WaPanel from '@/components/wa/WaPanel'
import LogPanel, { type LogEntry } from '@/components/log/LogPanel'
import AgendaBottomPanel, { type AgendaSection } from '@/components/agenda/AgendaBottomPanel'
import NovoAgendamentoModal from '@/components/agenda/NovoAgendamentoModal'
import { useApprovalCount } from '@/components/agenda/ApprovalPanel'
import ProfilesPanel from '@/components/profiles/ProfilesPanel'
import { useActiveProfile } from '@/lib/useActiveProfile'
import {
  CalendarDays, MessageCircle, Users, Briefcase,
  BarChart2, Settings, LogOut, Bot, Plus, TrendingUp,
  SlidersHorizontal, Sun, Moon, Menu,
} from 'lucide-react'

type SidebarSection = 'agenda' | 'conversas' | 'clientes' | 'profissionais' | 'metricas' | 'ajustes'

function todayLabel() {
  return new Date().toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'long' }).toUpperCase()
}

export default function AppLayout() {
  const [logEntries, setLogEntries] = useState<LogEntry[]>([])
  const [stats, setStats]           = useState({ total: 0, tokens: 0, latency: 0, cost: 0 })
  const [apptStats, setApptStats]   = useState({ confirmedToday: 0, assistantToday: 0, attendedWeek: 0, missedWeek: 0 })
  const [section, setSection]       = useState<SidebarSection>('agenda')
  const [mobileLive, setMobileLive] = useState(false)
  const [moreOpen, setMoreOpen]     = useState(false)
  const [profilesOpen, setProfilesOpen] = useState(false)
  const [novoAgendamentoOpen, setNovoAgendamentoOpen] = useState(false)
  const [aiAlert, setAiAlert]       = useState(false)
  const approvalCount               = useApprovalCount()
  const activeProfile               = useActiveProfile()
  const router                      = useRouter()
  const [theme, setTheme]           = useState<'system' | 'light' | 'dark'>('system')

  useEffect(() => {
    try { const t = localStorage.getItem('aa-theme') as typeof theme | null; if (t) setTheme(t) } catch { /* */ }
  }, [])

  function toggleTheme() {
    const next = theme === 'dark' ? 'light' : 'dark'
    setTheme(next)
    try { localStorage.setItem('aa-theme', next) } catch { /* */ }
    const root = document.documentElement
    if (next === 'dark')  { root.setAttribute('data-theme', 'dark')  }
    else                  { root.setAttribute('data-theme', 'light') }
  }

  useEffect(() => {
    if (theme === 'system') { document.documentElement.removeAttribute('data-theme') }
    else { document.documentElement.setAttribute('data-theme', theme) }
  }, [theme])

  const sb = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  )

  useEffect(() => {
    async function checkAi() {
      try {
        const r = await fetch('/api/ai-status')
        if (r.ok) { const d = await r.json(); setAiAlert(d.ok === false) }
      } catch { /* silent */ }
    }
    checkAi()
    const t = setInterval(checkAi, 60_000)
    return () => clearInterval(t)
  }, [])

  const loadStats = useCallback(async () => {
    try {
      const r = await fetch('/api/stats')
      if (!r.ok) return
      const d = await r.json()
      setStats(s => ({
        ...s,
        total:  d.messages ?? s.total,
        tokens: (d.input_tokens ?? 0) + (d.output_tokens ?? 0),
        cost:   d.cost_usd ?? s.cost,
      }))
      setApptStats({
        confirmedToday: d.confirmed_today           ?? 0,
        assistantToday: d.assistant_confirmed_today ?? 0,
        attendedWeek:   d.attended_week             ?? 0,
        missedWeek:     d.missed_week               ?? 0,
      })
    } catch { /* silent */ }
  }, [])

  useEffect(() => {
    loadStats()
    const t = setInterval(loadStats, 30_000)
    return () => clearInterval(t)
  }, [loadStats])

  const handleLog = useCallback((e: LogEntry) => {
    setLogEntries(prev => [...prev, e])
    if (e.agent === 'paciente') setStats(s => ({ ...s, total: s.total + 1 }))
    // a resposta do assistente pode ter confirmado um agendamento (paciente respondeu SIM)
    else if (e.status === 'done') loadStats()
  }, [loadStats])

  const handleStats = useCallback((delta: { tokens?: number; latency?: number; cost?: number }) => {
    setStats(s => ({
      ...s,
      tokens:  s.tokens + (delta.tokens ?? 0),
      latency: delta.latency ?? s.latency,
      cost:    s.cost + (delta.cost ?? 0),
    }))
  }, [])

  async function fetchAgentLog() {
    try {
      const r = await fetch('/api/agent-log')
      if (!r.ok) return
      const d = await r.json()
      if (Array.isArray(d.entries))
        setLogEntries(d.entries.map((e: LogEntry & { ts: string }) => ({ ...e, ts: new Date(e.ts) })))
    } catch { /* silent */ }
  }

  async function handleLogout() {
    await sb.auth.signOut()
    router.push('/')
    router.refresh()
  }

  // Map sidebar section → AgendaBottomPanel view
  const agendaView: Record<SidebarSection, AgendaSection> = {
    agenda:        'agenda',
    conversas:     'approvals',
    clientes:      'contacts',
    profissionais: 'schedules',
    metricas:      'agenda',
    ajustes:       'config',
  }

  const navItems: { id: SidebarSection; Icon: React.ElementType; label: string; badge?: number }[] = [
    { id: 'agenda',        Icon: CalendarDays,  label: 'Agenda' },
    { id: 'conversas',     Icon: MessageCircle, label: 'Conversas',    badge: approvalCount },
    { id: 'clientes',      Icon: Users,         label: 'Clientes' },
    { id: 'profissionais', Icon: Briefcase,     label: 'Profissionais' },
    { id: 'metricas',      Icon: BarChart2,     label: 'Métricas' },
    { id: 'ajustes',       Icon: Settings,      label: 'Ajustes' },
  ]

  const mobileTabs = ['agenda', 'conversas', 'metricas'] as const
  const activeMobileTab = mobileLive ? 'aovivo'
    : (mobileTabs as readonly string[]).includes(section) ? section : 'mais'

  function goToSection(id: SidebarSection) {
    setSection(id)
    setMobileLive(false)
    setMoreOpen(false)
  }

  const closedWeek = apptStats.attendedWeek + apptStats.missedWeek
  const attendanceRate = closedWeek > 0
    ? Math.round((apptStats.attendedWeek / closedWeek) * 100)
    : null

  return (
    <div className={`aa-layout ${mobileLive ? 'mobile-live' : ''}`}>

      {/* ── Alerta de crédito IA ── */}
      {aiAlert && (
        <div className="aa-ai-alert">
          ⚠️ Saldo Anthropic insuficiente — o bot está offline.{' '}
          <a href="https://console.anthropic.com/settings/billing" target="_blank" rel="noopener noreferrer">
            Adicionar créditos →
          </a>
        </div>
      )}

      <div className="aa-body">

        {/* ══ SIDEBAR ══ */}
        <aside className="aa-sidebar">

          {/* Logo */}
          <div className="aa-logo-wrap">
            <div className="aa-logo-icon">
              <Plus size={16} strokeWidth={3} color="#fff" />
            </div>
            <span className="aa-logo-text">
              Agenda<span style={{ color: 'var(--accent)' }}>Agentic</span>
            </span>
          </div>

          {/* Navigation */}
          <nav className="aa-nav">
            {navItems.map(({ id, Icon, label, badge }) => (
              <button
                key={id}
                className={`aa-nav-item ${section === id ? 'active' : ''}`}
                onClick={() => setSection(id)}
              >
                <span className="aa-nav-icon-wrap">
                  <Icon size={17} strokeWidth={section === id ? 2.25 : 1.75} />
                  {!!badge && badge > 0 && (
                    <span className="aa-nav-badge">{badge}</span>
                  )}
                </span>
                <span className="aa-nav-label">{label}</span>
              </button>
            ))}
          </nav>

          {/* Spacer */}
          <div style={{ flex: 1 }} />

          {/* AI status card */}
          <div className={`aa-ai-card ${aiAlert ? 'paused' : 'active'}`}>
            <div className="aa-ai-dot" />
            <div>
              <div className="aa-ai-title">{aiAlert ? 'IA pausada' : 'Assistente ativo'}</div>
              <div className="aa-ai-sub">
                {aiAlert ? 'Sem crédito' : `${stats.total} conversas hoje`}
              </div>
            </div>
            <Bot size={16} style={{ marginLeft: 'auto', flexShrink: 0, opacity: .5 }} />
          </div>

          {/* Perfis + Logout */}
          <div className="aa-sidebar-actions">
            <button className="aa-sidebar-btn" onClick={() => setProfilesOpen(true)} title="Perfis">
              <SlidersHorizontal size={15} />
            </button>
            <button className="aa-sidebar-btn" onClick={toggleTheme} title={theme === 'dark' ? 'Modo claro' : 'Modo escuro'}>
              {theme === 'dark' ? <Sun size={15} /> : <Moon size={15} />}
            </button>
            <button className="aa-sidebar-btn" onClick={handleLogout} title="Sair">
              <LogOut size={15} />
            </button>
          </div>
        </aside>

        {/* ══ MAIN CONTENT ══ */}
        <main className="aa-main">

          {/* Stats header — only on agenda view */}
          {section === 'agenda' && (
            <div className="aa-stats-header">
              <div className="aa-stats-top">
                <div>
                  <div className="aa-date-label">{todayLabel()}</div>
                  <h1 className="aa-hero-stat">
                    <strong>{apptStats.confirmedToday}</strong> agendamento{apptStats.confirmedToday === 1 ? '' : 's'} para hoje
                  </h1>
                </div>
                <div className="aa-stats-actions">
                  <button className="aa-btn-ghost">Semana</button>
                  <button className="aa-btn-primary" onClick={() => setNovoAgendamentoOpen(true)}>
                    <Plus size={14} strokeWidth={2.5} /> Novo agendamento
                  </button>
                </div>
              </div>

              <div className="aa-kpis">
                <div className="aa-kpi">
                  <div className="aa-kpi-label">Agendados pelo assistente hoje</div>
                  <div className="aa-kpi-value">{apptStats.assistantToday}</div>
                  {apptStats.assistantToday > 0 && (
                    <div className="aa-kpi-trend up">
                      <TrendingUp size={12} /> confirmados pelo WhatsApp
                    </div>
                  )}
                </div>
                <div className="aa-kpi">
                  <div className="aa-kpi-label">Comparecimento (7 dias)</div>
                  <div className="aa-kpi-value">
                    {attendanceRate !== null ? `${attendanceRate}%` : '—'}
                  </div>
                </div>
                <div className="aa-kpi">
                  <div className="aa-kpi-label">Faltas (7 dias)</div>
                  <div className="aa-kpi-value">{apptStats.missedWeek}</div>
                </div>
              </div>
            </div>
          )}

          {/* Section content */}
          <div className="aa-section-content">
            {section === 'metricas' ? (
              <LogPanel entries={logEntries} stats={stats} onFetch={fetchAgentLog} />
            ) : (
              <AgendaBottomPanel view={agendaView[section]} />
            )}
          </div>
        </main>

        {/* ══ RIGHT: CONVERSA AO VIVO ══ */}
        <aside className="aa-wa-panel">
          <div className="aa-wa-header">
            <Bot size={14} style={{ color: 'var(--accent)' }} />
            <span>CONVERSA AO VIVO</span>
            <div className={`aa-wa-dot ${aiAlert ? 'paused' : 'live'}`} />
          </div>
          <div className="aa-wa-body">
            <WaPanel onLog={handleLog} onStats={handleStats} />
          </div>
        </aside>

      </div>

      {/* ── Perfis Modal ── */}
      {profilesOpen && <ProfilesPanel onClose={() => setProfilesOpen(false)} />}

      {/* ── Novo Agendamento Modal ── */}
      {novoAgendamentoOpen && (
        <NovoAgendamentoModal
          onClose={() => setNovoAgendamentoOpen(false)}
          onCreated={loadStats}
        />
      )}

      {/* ══ MOBILE BOTTOM NAV ══ */}
      <nav className="aa-mobile-nav safe-bottom">
        {([
          { id: 'agenda',    Icon: CalendarDays,  label: 'Agenda',    onClick: () => goToSection('agenda') },
          { id: 'aovivo',    Icon: Bot,           label: 'Ao vivo',   onClick: () => { setMobileLive(true); setMoreOpen(false) } },
          { id: 'conversas', Icon: MessageCircle, label: 'Conversas', onClick: () => goToSection('conversas'), badge: approvalCount },
          { id: 'metricas',  Icon: BarChart2,     label: 'Métricas',  onClick: () => goToSection('metricas') },
          { id: 'mais',      Icon: Menu,          label: 'Mais',      onClick: () => setMoreOpen(true) },
        ]).map(tab => (
          <button key={tab.id}
            className={`aa-mobile-tab ${activeMobileTab === tab.id ? 'active' : ''}`}
            onClick={tab.onClick}
          >
            <span className="aa-nav-icon-wrap">
              <tab.Icon size={21} strokeWidth={activeMobileTab === tab.id ? 2.25 : 1.75} />
              {!!tab.badge && tab.badge > 0 && <span className="aa-nav-badge">{tab.badge}</span>}
            </span>
            <span>{tab.label}</span>
            {activeMobileTab === tab.id && <span className="aa-mobile-dot" />}
          </button>
        ))}
      </nav>

      {/* ══ MOBILE "MAIS" SHEET ══ */}
      {moreOpen && (
        <div className="aa-sheet-backdrop" onClick={() => setMoreOpen(false)}>
          <div className="aa-sheet safe-bottom" onClick={e => e.stopPropagation()}>
            <div className="aa-sheet-handle" />
            {([
              { id: 'clientes',      Icon: Users,     label: 'Clientes' },
              { id: 'profissionais', Icon: Briefcase, label: 'Profissionais' },
              { id: 'ajustes',       Icon: Settings,  label: 'Ajustes' },
            ] as const).map(item => (
              <button key={item.id}
                className={`aa-sheet-item ${!mobileLive && section === item.id ? 'active' : ''}`}
                onClick={() => goToSection(item.id)}
              >
                <item.Icon size={18} /> {item.label}
              </button>
            ))}
            <div className="aa-sheet-sep" />
            <button className="aa-sheet-item" onClick={() => { setMoreOpen(false); setProfilesOpen(true) }}>
              <SlidersHorizontal size={18} /> Perfis
            </button>
            <button className="aa-sheet-item" onClick={toggleTheme}>
              {theme === 'dark' ? <Sun size={18} /> : <Moon size={18} />}
              {theme === 'dark' ? 'Modo claro' : 'Modo escuro'}
            </button>
            <button className="aa-sheet-item danger" onClick={handleLogout}>
              <LogOut size={18} /> Sair
            </button>
          </div>
        </div>
      )}

      <style>{`
        /* ── Layout shell ── */
        .aa-layout {
          display: flex; flex-direction: column;
          height: 100dvh; background: var(--background); overflow: hidden;
        }
        .aa-ai-alert {
          display: flex; align-items: center; justify-content: center; gap: 8px;
          padding: 6px 16px; flex-shrink: 0; font-size: 12px; font-weight: 600;
          background: #F97316; color: #fff;
        }
        .aa-ai-alert a { color: #fff; text-decoration: underline; font-weight: 700; }
        .aa-body {
          display: flex; flex: 1; min-height: 0;
        }

        /* ── Sidebar ── */
        .aa-sidebar {
          width: 200px; flex-shrink: 0;
          display: flex; flex-direction: column;
          background: var(--panel); border-right: 1px solid var(--border);
          padding: 16px 0 12px; gap: 4px;
        }
        .aa-logo-wrap {
          display: flex; align-items: center; gap: 9px;
          padding: 0 16px 16px; border-bottom: 1px solid var(--border); margin-bottom: 8px;
        }
        .aa-logo-icon {
          width: 28px; height: 28px; border-radius: 8px; flex-shrink: 0;
          background: linear-gradient(135deg, var(--accent) 0%, #1aae53 100%);
          display: flex; align-items: center; justify-content: center;
          box-shadow: 0 2px 8px rgba(37,211,102,.3);
        }
        .aa-logo-text {
          font-weight: 800; font-size: 14px; letter-spacing: -.02em;
          color: var(--foreground);
        }

        /* Nav */
        .aa-nav { display: flex; flex-direction: column; gap: 2px; padding: 0 8px; }
        .aa-nav-item {
          display: flex; align-items: center; gap: 10px;
          padding: 9px 10px; border-radius: 10px; border: none;
          background: none; cursor: pointer; text-align: left; width: 100%;
          color: var(--muted); font-size: 13px; font-weight: 500;
          transition: background .15s, color .15s;
        }
        .aa-nav-item:hover { background: var(--card); color: var(--foreground); }
        .aa-nav-item.active {
          background: rgba(37,211,102,.12);
          color: var(--accent); font-weight: 700;
        }
        .aa-nav-icon-wrap { position: relative; display: inline-flex; line-height: 0; flex-shrink: 0; }
        .aa-nav-badge {
          position: absolute; top: -4px; right: -6px;
          min-width: 14px; height: 14px; border-radius: 7px;
          background: #F0A500; color: #fff;
          font-size: 8px; font-weight: 800;
          display: flex; align-items: center; justify-content: center; padding: 0 2px;
        }
        .aa-nav-label { white-space: nowrap; }

        /* AI card */
        .aa-ai-card {
          display: flex; align-items: center; gap: 10px;
          margin: 8px 10px 4px; padding: 10px 12px;
          border-radius: 12px; border: 1px solid var(--border);
          background: var(--card); font-size: 12px;
        }
        .aa-ai-dot {
          width: 8px; height: 8px; border-radius: 50%; flex-shrink: 0;
          animation: pulse 2s ease-in-out infinite;
        }
        .aa-ai-card.active .aa-ai-dot { background: var(--accent); }
        .aa-ai-card.paused .aa-ai-dot { background: #F97316; animation: none; }
        .aa-ai-title { font-weight: 700; color: var(--foreground); }
        .aa-ai-sub   { font-size: 10px; color: var(--muted); margin-top: 1px; }

        /* Sidebar actions */
        .aa-sidebar-actions {
          display: flex; gap: 4px; padding: 4px 10px 0;
        }
        .aa-sidebar-btn {
          flex: 1; display: flex; align-items: center; justify-content: center;
          height: 32px; border-radius: 8px; border: 1px solid var(--border);
          background: none; cursor: pointer; color: var(--muted);
          transition: background .15s, color .15s;
        }
        .aa-sidebar-btn:hover { background: var(--card); color: var(--foreground); }

        /* ── Main content ── */
        .aa-main {
          flex: 1; min-width: 0; display: flex; flex-direction: column;
          overflow: hidden;
        }

        /* Stats header */
        .aa-stats-header {
          padding: 16px 20px 0; flex-shrink: 0; border-bottom: 1px solid var(--border);
          background: var(--panel);
        }
        .aa-stats-top {
          display: flex; align-items: flex-start; justify-content: space-between;
          gap: 16px; flex-wrap: wrap; margin-bottom: 14px;
        }
        .aa-date-label {
          font-size: 10px; font-weight: 700; letter-spacing: .08em;
          color: var(--muted); margin-bottom: 4px;
        }
        .aa-hero-stat {
          font-size: 22px; font-weight: 400; color: var(--foreground);
          margin: 0; line-height: 1.2;
        }
        .aa-hero-stat strong { font-weight: 800; }
        .aa-stats-actions { display: flex; align-items: center; gap: 8px; flex-shrink: 0; }
        .aa-btn-ghost {
          height: 34px; padding: 0 14px; border-radius: 8px;
          border: 1px solid var(--border); background: none;
          color: var(--muted); font-size: 12px; font-weight: 600; cursor: pointer;
          transition: background .15s, color .15s;
        }
        .aa-btn-ghost:hover { background: var(--card); color: var(--foreground); }
        .aa-btn-primary {
          height: 34px; padding: 0 14px; border-radius: 8px; border: none;
          background: var(--accent); color: #fff;
          font-size: 12px; font-weight: 700; cursor: pointer;
          display: flex; align-items: center; gap: 6px;
          transition: opacity .15s, transform .1s;
        }
        .aa-btn-primary:hover { opacity: .9; transform: translateY(-1px); }

        /* KPIs */
        .aa-kpis {
          display: flex; gap: 0;
        }
        .aa-kpi {
          flex: 1; padding: 10px 16px; border-right: 1px solid var(--border);
        }
        .aa-kpi:last-child { border-right: none; }
        .aa-kpi-label {
          font-size: 10px; font-weight: 600; text-transform: uppercase;
          letter-spacing: .06em; color: var(--muted); margin-bottom: 3px;
        }
        .aa-kpi-value {
          font-size: 20px; font-weight: 800; color: var(--foreground);
          letter-spacing: -.02em; font-variant-numeric: tabular-nums;
        }
        .aa-kpi-trend {
          font-size: 10px; font-weight: 600; display: flex; align-items: center; gap: 3px;
          margin-top: 2px;
        }
        .aa-kpi-trend.up { color: var(--accent); }
        .aa-kpi-trend.down { color: var(--red); }

        /* Section content */
        .aa-section-content {
          flex: 1; min-height: 0; overflow: hidden; display: flex; flex-direction: column;
        }

        /* ── Right: WaPanel ── */
        .aa-wa-panel {
          width: 300px; flex-shrink: 0;
          display: flex; flex-direction: column;
          border-left: 1px solid var(--border);
          background: var(--panel); overflow: hidden;
        }
        .aa-wa-header {
          display: flex; align-items: center; gap: 7px;
          padding: 10px 14px; border-bottom: 1px solid var(--border); flex-shrink: 0;
          font-size: 10px; font-weight: 700; letter-spacing: .08em; color: var(--muted);
          text-transform: uppercase;
        }
        .aa-wa-dot {
          width: 7px; height: 7px; border-radius: 50%; margin-left: auto;
        }
        .aa-wa-dot.live   { background: var(--accent); animation: pulse 2s ease-in-out infinite; }
        .aa-wa-dot.paused { background: #F97316; }
        .aa-wa-body { flex: 1; min-height: 0; overflow: hidden; display: flex; flex-direction: column; }

        /* ── Mobile nav ── */
        .aa-mobile-nav {
          display: none; border-top: 1px solid var(--border);
          background: var(--panel); box-shadow: 0 -2px 8px rgba(0,0,0,.06);
        }
        .aa-mobile-tab {
          flex: 1; display: flex; flex-direction: column; align-items: center;
          gap: 3px; padding: 8px 0 6px; border: none; background: none; cursor: pointer;
          color: var(--muted); font-size: 11px; font-weight: 500;
          transition: color .15s;
        }
        .aa-mobile-tab.active { color: var(--accent); font-weight: 700; }
        .aa-mobile-dot {
          width: 4px; height: 4px; border-radius: 50%; background: var(--accent);
        }

        /* ── Mobile "Mais" sheet ── */
        .aa-sheet-backdrop {
          position: fixed; inset: 0; z-index: 40;
          background: rgba(0,0,0,.45);
          display: flex; align-items: flex-end;
        }
        .aa-sheet {
          width: 100%; background: var(--panel);
          border-top-left-radius: 16px; border-top-right-radius: 16px;
          border-top: 1px solid var(--border);
          padding: 8px 12px 12px; display: flex; flex-direction: column; gap: 2px;
          box-shadow: var(--shadow-pop);
          animation: sheet-in .18s ease-out;
        }
        .aa-sheet-handle {
          width: 36px; height: 4px; border-radius: 2px; background: var(--border);
          margin: 2px auto 10px;
        }
        .aa-sheet-item {
          display: flex; align-items: center; gap: 12px;
          padding: 12px; border-radius: 10px; border: none; background: none;
          color: var(--foreground); font-size: 15px; font-weight: 500; text-align: left; cursor: pointer;
        }
        .aa-sheet-item:active, .aa-sheet-item.active { background: var(--card); }
        .aa-sheet-item.active { color: var(--accent); font-weight: 700; }
        .aa-sheet-item.danger { color: var(--red); }
        .aa-sheet-sep { height: 1px; background: var(--border); margin: 6px 4px; }
        @keyframes sheet-in { from { transform: translateY(100%) } to { transform: none } }

        /* ── Animations ── */
        @keyframes pulse { 0%,100%{opacity:1;transform:scale(1)} 50%{opacity:.5;transform:scale(.85)} }

        /* ── Responsive ── */
        @media (max-width: 1200px) {
          .aa-wa-panel { width: 260px; }
        }
        @media (max-width: 1023px) {
          .aa-sidebar { width: 52px; }
          .aa-logo-text, .aa-nav-label, .aa-ai-title, .aa-ai-sub, .aa-ai-card > Bot { display: none; }
          .aa-logo-wrap { padding: 0 12px 14px; justify-content: center; }
          .aa-nav { padding: 0 4px; }
          .aa-nav-item { justify-content: center; padding: 10px 8px; }
          .aa-sidebar-actions { justify-content: center; padding: 4px 6px 0; }
          .aa-sidebar-btn { flex: none; width: 36px; }
          .aa-ai-card { padding: 8px; justify-content: center; }
          .aa-ai-dot { margin: 0; }
        }
        @media (max-width: 767px) {
          .aa-sidebar, .aa-wa-panel { display: none; }
          .aa-mobile-nav { display: flex; }
          .aa-layout.mobile-live .aa-main { display: none; }
          .aa-layout.mobile-live .aa-wa-panel { display: flex; width: 100%; border-left: none; }
          .aa-stats-header { padding: 12px 16px 0; }
          .aa-hero-stat { font-size: 18px; }
        }
      `}</style>
    </div>
  )
}
