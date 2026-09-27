'use client'
import React, { useState, useCallback, useEffect } from 'react'
import { createBrowserClient } from '@supabase/ssr'
import { useRouter } from 'next/navigation'
import WaPanel from '@/components/wa/WaPanel'
import LogPanel, { type LogEntry } from '@/components/log/LogPanel'
import AgendaBottomPanel, { type AgendaSection } from '@/components/agenda/AgendaBottomPanel'
import { useApprovalCount } from '@/components/agenda/ApprovalPanel'
import { useClinicName } from '@/lib/useClinicName'
import ProfilesPanel from '@/components/profiles/ProfilesPanel'
import { useActiveProfile } from '@/lib/useActiveProfile'
import { MessageCircle, CalendarDays, ChartColumn, Settings, SlidersHorizontal, PanelRight, LogOut, ChevronRight, Bot, CircleCheck, CalendarClock, Users } from 'lucide-react'

type MobileTab = 'wa' | 'agenda' | 'metrics' | 'config'

export default function AppLayout() {
  const [logEntries, setLogEntries] = useState<LogEntry[]>([])
  const [stats, setStats]         = useState({ total: 0, tokens: 0, latency: 0, cost: 0 })
  const [mobileTab, setMobileTab] = useState<MobileTab>('agenda')
  const [logOpen, setLogOpen]     = useState(true)
  const [agendaSection, setAgendaSection] = useState<AgendaSection>('agenda')
  const approvalCount             = useApprovalCount()
  const clinicName                = useClinicName()
  const router = useRouter()

  const [aiAlert, setAiAlert] = useState(false)
  const [profilesOpen, setProfilesOpen] = useState(false)
  const activeProfile = useActiveProfile()

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

  // Busca stats diários do DB (inclui mensagens via webhook WhatsApp)
  useEffect(() => {
    async function loadStats() {
      try {
        const res = await fetch('/api/stats')
        if (!res.ok) return
        const data = await res.json()
        setStats(s => ({
          ...s,
          total:   data.messages   ?? s.total,
          tokens:  (data.input_tokens ?? 0) + (data.output_tokens ?? 0),
          cost:    data.cost_usd  ?? s.cost,
        }))
      } catch { /* silencioso */ }
    }
    loadStats()
    const interval = setInterval(loadStats, 30_000)
    return () => clearInterval(interval)
  }, [])

  // Busca o Log de Agentes real do Langfuse (inclui interações via webhook WhatsApp)
  useEffect(() => {
    async function loadAgentLog() {
      try {
        const res = await fetch('/api/agent-log')
        if (!res.ok) return
        const data = await res.json()
        if (Array.isArray(data.entries)) {
          setLogEntries(data.entries.map((e: LogEntry & { ts: string }) => ({ ...e, ts: new Date(e.ts) })))
        }
      } catch { /* silencioso */ }
    }
    loadAgentLog()
    const interval = setInterval(loadAgentLog, 20_000)
    return () => clearInterval(interval)
  }, [])

  const sb = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )

  async function handleLogout() {
    await sb.auth.signOut()
    router.push('/')
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
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, minWidth: 0 }}>
          <div style={{
            width: 34, height: 34, borderRadius: 10,
            display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 16, flexShrink: 0,
            background: 'linear-gradient(135deg, var(--green) 0%, #0A7A5E 100%)',
            boxShadow: '0 2px 6px rgba(13,158,119,.35)',
          }}>{activeProfile?.vocabulary?.emoji ?? '🏥'}</div>
          <div style={{ minWidth: 0 }}>
            <div style={{ fontWeight: 700, fontSize: 14, lineHeight: 1.1, letterSpacing: '-.01em', color: 'var(--foreground)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
              {clinicName}
            </div>
            <div style={{ fontSize: 11, marginTop: 2, color: 'var(--muted)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
              {activeProfile ? activeProfile.name : 'Sistema de IA'}
            </div>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexShrink: 0 }}>
          {/* AI status — single source of "online" state */}
          <div title={aiAlert ? 'Sem crédito na Anthropic — respostas automáticas pausadas' : 'A IA está respondendo no WhatsApp'}
            style={{
              display: 'flex', alignItems: 'center', gap: 5, padding: '4px 10px',
              borderRadius: 20, fontSize: 11, fontWeight: 600, whiteSpace: 'nowrap',
              border: `1px solid ${aiAlert ? '#F9731660' : '#14C38E40'}`,
              background: aiAlert ? '#F9731612' : '#14C38E10',
              color: aiAlert ? '#F97316' : 'var(--green)',
            }}>
            <Bot size={13} />
            {aiAlert ? 'IA pausada' : 'IA ativa'}
          </div>

          {/* Desktop actions */}
          <div className="hidden-mobile" style={{ alignItems: 'center', gap: 4 }}>
            <button className="hdr-btn" onClick={() => setProfilesOpen(true)} title="Perfis de negócio">
              <SlidersHorizontal size={14} /> Perfis
            </button>
            <button className="hdr-btn" onClick={() => setLogOpen(v => !v)}
              title={logOpen ? 'Esconder monitor da IA' : 'Mostrar monitor da IA'}
              style={{ color: logOpen ? 'var(--foreground)' : undefined }}>
              <PanelRight size={14} /> Monitor
            </button>
            <button className="hdr-btn" onClick={handleLogout} title="Sair" aria-label="Sair">
              <LogOut size={14} />
            </button>
          </div>
        </div>
      </header>

      {/* ── Perfis Modal ── */}
      {profilesOpen && <ProfilesPanel onClose={() => setProfilesOpen(false)} />}

      {/* ── Body ── */}
      <div style={{ display: 'flex', flex: 1, minHeight: 0 }}>

        {/* WaPanel */}
        <div className={`wa-col ${mobileTab === 'wa' ? 'mobile-show' : 'mobile-hide'}`}
          style={{ borderRight: '1px solid var(--border)', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
          <WaPanel onLog={handleLog} onStats={handleStats} />
        </div>

        {/* Center: sub-nav + AgendaBottomPanel + Pipeline */}
        <div className={`center-col ${mobileTab === 'agenda' ? 'mobile-show' : 'mobile-hide'}`}
          style={{ display: 'flex', flexDirection: 'column', flex: 1, minHeight: 0, borderRight: '1px solid var(--border)', overflow: 'hidden' }}
        >
          {/* Sub-navigation */}
          <div style={{ display: 'flex', borderBottom: '1px solid var(--border)', background: 'var(--panel)', flexShrink: 0 }}>
            {([
              { id: 'agenda',    Icon: CalendarDays,  label: 'Agenda',    badge: 0 },
              { id: 'approvals', Icon: CircleCheck,   label: 'Aprovações',badge: approvalCount },
              { id: 'contacts',  Icon: Users,         label: 'Contatos',  badge: 0 },
              { id: 'schedules', Icon: CalendarClock, label: 'Horários',  badge: 0 },
              { id: 'config',    Icon: Settings,      label: 'Config',    badge: 0 },
            ] as { id: AgendaSection; Icon: React.ElementType; label: string; badge: number }[]).map(tab => (
              <button key={tab.id}
                onClick={() => setAgendaSection(tab.id)}
                style={{
                  flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2,
                  padding: '7px 4px 5px', border: 'none', background: 'none', cursor: 'pointer',
                  borderBottom: agendaSection === tab.id ? '2px solid var(--green)' : '2px solid transparent',
                  color: agendaSection === tab.id ? 'var(--green)' : 'var(--muted)',
                  fontSize: 10, fontWeight: agendaSection === tab.id ? 700 : 500,
                  transition: 'color .15s',
                }}>
                <span style={{ position: 'relative', display: 'inline-block', lineHeight: 0 }}>
                  <tab.Icon size={16} strokeWidth={agendaSection === tab.id ? 2.25 : 1.75} />
                  {tab.badge > 0 && (
                    <span style={{
                      position: 'absolute', top: -4, right: -6,
                      minWidth: 14, height: 14, borderRadius: 7,
                      background: '#F0A500', color: '#fff',
                      fontSize: 8, fontWeight: 800,
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      padding: '0 2px',
                    }}>{tab.badge}</span>
                  )}
                </span>
                {tab.label}
              </button>
            ))}
          </div>
          <AgendaBottomPanel view={agendaSection} />
        </div>

        {/* Right panel: Log — desktop only when logOpen, always on mobile metrics tab */}
        <div className={[
          'log-col-wrap',
          mobileTab === 'metrics' ? 'mobile-show' : 'mobile-hide',
          logOpen ? 'log-open' : 'log-closed',
        ].join(' ')}>
          <LogPanel entries={logEntries} stats={stats} />
        </div>

        {/* Config panel — mobile only */}
        {mobileTab === 'config' && (
          <div className="mobile-config-panel" style={{
            flex: 1, display: 'flex', flexDirection: 'column', padding: 20, gap: 12,
            overflowY: 'auto', background: 'var(--background)',
          }}>
            {/* Profile info card */}
            <div style={{
              borderRadius: 14, padding: 16, border: '1px solid var(--border)',
              background: 'var(--card)', boxShadow: 'var(--shadow-sm)',
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 12 }}>
                <div style={{
                  width: 44, height: 44, borderRadius: 12, fontSize: 22,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  background: 'linear-gradient(135deg, var(--green) 0%, #0A7A5E 100%)',
                }}>
                  {activeProfile?.vocabulary?.emoji ?? '🏥'}
                </div>
                <div>
                  <div style={{ fontWeight: 700, fontSize: 15 }}>{clinicName}</div>
                  <div style={{ fontSize: 11, color: 'var(--muted)', marginTop: 2 }}>
                    {activeProfile?.name ?? 'Sistema de IA'}
                  </div>
                </div>
              </div>
              <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', fontSize: 11, color: 'var(--muted)' }}>
                {[activeProfile?.vocabulary?.client, activeProfile?.vocabulary?.professional, activeProfile?.vocabulary?.appointment]
                  .filter(Boolean)
                  .map(w => (
                    <span key={w} style={{ padding: '2px 8px', borderRadius: 20, border: '1px solid var(--border)' }}>{w}</span>
                  ))}
              </div>
            </div>

            {/* Divider */}
            <div style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.06em', color: 'var(--muted)', paddingTop: 4 }}>
              Configurações
            </div>

            {/* Perfis button */}
            <button
              onClick={() => setProfilesOpen(true)}
              style={{
                display: 'flex', alignItems: 'center', gap: 14,
                padding: '14px 16px', borderRadius: 12,
                border: '1px solid var(--border)', background: 'var(--card)',
                cursor: 'pointer', textAlign: 'left', width: '100%',
                boxShadow: 'var(--shadow-sm)',
              }}>
              <SlidersHorizontal size={20} style={{ color: 'var(--green)', flexShrink: 0 }} />
              <div>
                <div style={{ fontWeight: 600, fontSize: 13, color: 'var(--foreground)' }}>Perfis de negócio</div>
                <div style={{ fontSize: 11, color: 'var(--muted)', marginTop: 2 }}>Trocar ramo, editar vocabulário, dados de teste</div>
              </div>
              <ChevronRight size={16} style={{ marginLeft: 'auto', color: 'var(--muted)', flexShrink: 0 }} />
            </button>

            {/* Stats */}
            <div style={{
              borderRadius: 12, padding: 16, border: '1px solid var(--border)',
              background: 'var(--card)', display: 'grid', gridTemplateColumns: '1fr 1fr',
              gap: 12, boxShadow: 'var(--shadow-sm)',
            }}>
              {[
                { label: 'Consultas hoje', value: stats.total },
                { label: 'Tokens usados',  value: stats.tokens.toLocaleString('pt-BR') },
                { label: 'Custo USD',       value: `$${stats.cost.toFixed(4)}` },
                { label: 'Latência',        value: stats.latency > 0 ? `${stats.latency}ms` : '—' },
              ].map(({ label, value }) => (
                <div key={label}>
                  <div style={{ fontSize: 10, color: 'var(--muted)', marginBottom: 2 }}>{label}</div>
                  <div style={{ fontWeight: 700, fontSize: 16, color: 'var(--foreground)', fontVariantNumeric: 'tabular-nums' }}>{value}</div>
                </div>
              ))}
            </div>

            {/* Sair */}
            <button
              onClick={handleLogout}
              style={{
                display: 'flex', alignItems: 'center', gap: 14,
                padding: '14px 16px', borderRadius: 12,
                border: '1px solid #EF444440', background: '#EF444408',
                cursor: 'pointer', textAlign: 'left', width: '100%',
                marginTop: 'auto',
              }}>
              <LogOut size={20} style={{ color: '#EF4444', flexShrink: 0 }} />
              <div style={{ fontWeight: 600, fontSize: 13, color: '#EF4444' }}>Sair</div>
            </button>
          </div>
        )}
      </div>

      {/* ── Mobile bottom nav ── */}
      <nav className="mobile-nav safe-bottom" style={{
        borderTop: '1px solid var(--border)',
        background: 'var(--panel)',
        boxShadow: '0 -2px 8px rgba(0,0,0,.06)',
      }}>
        {([
          { id: 'agenda',  Icon: CalendarDays,  label: 'Agenda' },
          { id: 'wa',      Icon: MessageCircle, label: 'Conversas' },
          { id: 'metrics', Icon: ChartColumn,   label: 'Monitor' },
          { id: 'config',  Icon: Settings,      label: 'Ajustes' },
        ] as const).map(tab => (
          <button key={tab.id}
            onClick={() => setMobileTab(tab.id)}
            aria-current={mobileTab === tab.id ? 'page' : undefined}
            style={{
              flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', position: 'relative',
              gap: 3, padding: '8px 0 6px', border: 'none', background: 'none', cursor: 'pointer',
              color: mobileTab === tab.id ? 'var(--green)' : 'var(--muted)',
              fontSize: 11, fontWeight: mobileTab === tab.id ? 700 : 500,
              transition: 'color .15s',
            }}>
            <span style={{ lineHeight: 0, position: 'relative', display: 'inline-block' }}>
              <tab.Icon size={21} strokeWidth={mobileTab === tab.id ? 2.25 : 1.75} />
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

      <style>{`
        @keyframes pulse { 0%,100%{opacity:1;transform:scale(1)} 50%{opacity:.5;transform:scale(.85)} }
        .hdr-btn { display: inline-flex; align-items: center; gap: 5px; height: 28px; padding: 0 10px; border-radius: 8px; font-size: 12px; font-weight: 600; border: 1px solid transparent; background: transparent; color: var(--muted); cursor: pointer; transition: background .15s, color .15s; }
        .hdr-btn:hover { background: var(--card); border-color: var(--border); color: var(--foreground); }

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
          .mobile-config-panel { display: flex !important; }
        }
        /* Hide config panel on desktop */
        @media (min-width: 768px) {
          .mobile-config-panel { display: none !important; }
        }
      `}</style>
    </div>
  )
}
