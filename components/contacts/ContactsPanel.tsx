'use client'
import { useState, useEffect, useCallback } from 'react'

type Contact = {
  id: string
  phone: string
  name: string
  patient_id: string | null
  patient_name: string | null
  opt_in: boolean
  opt_out_at: string | null
  lgpd_consent_at: string | null
  last_inbound_at: string | null
  appointment_count: number
}

function fmtRelative(iso: string | null) {
  if (!iso) return '—'
  const diff = Date.now() - new Date(iso).getTime()
  const m = Math.floor(diff / 60000)
  if (m < 2)   return 'agora'
  if (m < 60)  return `${m}min atrás`
  const h = Math.floor(m / 60)
  if (h < 24)  return `${h}h atrás`
  const d = Math.floor(h / 24)
  if (d < 7)   return `${d}d atrás`
  return new Date(iso).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' })
}

function fmtPhone(phone: string) {
  const d = phone.replace(/\D/g, '')
  if (d.length === 13) return `+${d.slice(0,2)} (${d.slice(2,4)}) ${d.slice(4,9)}-${d.slice(9)}`
  if (d.length === 12) return `+${d.slice(0,2)} (${d.slice(2,4)}) ${d.slice(4,8)}-${d.slice(8)}`
  return phone
}

function StatusBadge({ contact }: { contact: Contact }) {
  if (contact.opt_out_at)
    return <span style={{ fontSize: 9, padding: '1px 6px', borderRadius: 20, background: '#EF444415', border: '1px solid #EF444440', color: '#EF4444', fontWeight: 700 }}>Opt-out</span>
  if (!contact.lgpd_consent_at)
    return <span style={{ fontSize: 9, padding: '1px 6px', borderRadius: 20, background: '#F0A50015', border: '1px solid #F0A50040', color: '#F0A500', fontWeight: 700 }}>Sem LGPD</span>
  return <span style={{ fontSize: 9, padding: '1px 6px', borderRadius: 20, background: '#14C38E15', border: '1px solid #14C38E40', color: '#14C38E', fontWeight: 700 }}>Ativo</span>
}

function Avatar({ name }: { name: string }) {
  const initials = name.split(' ').slice(0, 2).map(w => w[0]?.toUpperCase() ?? '').join('')
  const hue = name.split('').reduce((acc, c) => acc + c.charCodeAt(0), 0) % 360
  return (
    <div style={{
      width: 34, height: 34, borderRadius: 10, flexShrink: 0,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      fontSize: 12, fontWeight: 700, color: '#fff',
      background: `hsl(${hue},50%,45%)`,
    }}>
      {initials || '?'}
    </div>
  )
}

export default function ContactsPanel() {
  const [contacts, setContacts] = useState<Contact[]>([])
  const [loading, setLoading]   = useState(true)
  const [search, setSearch]     = useState('')
  const [filter, setFilter]     = useState<'todos' | 'ativos' | 'sem_lgpd' | 'optout'>('todos')
  const [debouncedQ, setDebouncedQ] = useState('')

  // Debounce search
  useEffect(() => {
    const t = setTimeout(() => setDebouncedQ(search), 300)
    return () => clearTimeout(t)
  }, [search])

  const load = useCallback(async (q = '') => {
    setLoading(true)
    const url = q ? `/api/contacts?q=${encodeURIComponent(q)}` : '/api/contacts'
    const r = await fetch(url)
    if (r.ok) setContacts(await r.json())
    setLoading(false)
  }, [])

  useEffect(() => { load(debouncedQ) }, [debouncedQ, load])

  const filtered = contacts.filter(c => {
    if (filter === 'ativos')   return !!c.lgpd_consent_at && !c.opt_out_at
    if (filter === 'sem_lgpd') return !c.lgpd_consent_at
    if (filter === 'optout')   return !!c.opt_out_at
    return true
  })

  const counts = {
    todos:    contacts.length,
    ativos:   contacts.filter(c => !!c.lgpd_consent_at && !c.opt_out_at).length,
    sem_lgpd: contacts.filter(c => !c.lgpd_consent_at).length,
    optout:   contacts.filter(c => !!c.opt_out_at).length,
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', minHeight: 0 }}>

      {/* Barra de busca + filtros */}
      <div style={{ padding: '10px 12px', borderBottom: '1px solid var(--border)', flexShrink: 0 }}>
        <input
          type="search"
          placeholder="Buscar por nome ou telefone…"
          value={search}
          onChange={e => setSearch(e.target.value)}
          style={{
            width: '100%', boxSizing: 'border-box',
            padding: '6px 10px', borderRadius: 8, fontSize: 12,
            border: '1px solid var(--border)', background: 'var(--background)',
            color: 'var(--foreground)', outline: 'none',
            marginBottom: 8,
          }}
        />

        {/* Filtros */}
        <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
          {([
            { key: 'todos',    label: `Todos (${counts.todos})`,     color: 'var(--blue)' },
            { key: 'ativos',   label: `Ativos (${counts.ativos})`,   color: '#14C38E'     },
            { key: 'sem_lgpd', label: `Sem LGPD (${counts.sem_lgpd})`, color: '#F0A500'   },
            { key: 'optout',   label: `Opt-out (${counts.optout})`,  color: '#EF4444'     },
          ] as const).map(f => (
            <button key={f.key} onClick={() => setFilter(f.key)}
              style={{
                fontSize: 10, fontWeight: 600, padding: '3px 9px', borderRadius: 20, cursor: 'pointer',
                border: `1px solid ${filter === f.key ? f.color : 'var(--border)'}`,
                background: filter === f.key ? `${f.color}15` : 'var(--card)',
                color: filter === f.key ? f.color : 'var(--muted)',
              }}>
              {f.label}
            </button>
          ))}
        </div>
      </div>

      {/* Lista */}
      <div style={{ flex: 1, minHeight: 0, overflowY: 'auto' }}>
        {loading ? (
          <div style={{ padding: 20, textAlign: 'center', color: 'var(--muted)', fontSize: 12 }}>
            Carregando…
          </div>
        ) : filtered.length === 0 ? (
          <div style={{ padding: 20, textAlign: 'center', color: 'var(--muted)', fontSize: 12 }}>
            Nenhum contato encontrado.
          </div>
        ) : (
          filtered.map(c => (
            <div key={c.id} style={{
              display: 'flex', alignItems: 'center', gap: 10,
              padding: '8px 12px', borderBottom: '1px solid var(--border)',
              background: 'var(--panel)',
            }}>
              <Avatar name={c.name} />

              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
                  <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--foreground)' }}>
                    {c.name}
                  </span>
                  <StatusBadge contact={c} />
                  {c.patient_id && (
                    <span style={{ fontSize: 9, padding: '1px 5px', borderRadius: 20, background: 'var(--card)', border: '1px solid var(--border)', color: 'var(--muted)' }}>
                      👤 Paciente
                    </span>
                  )}
                </div>
                <div style={{ display: 'flex', gap: 8, marginTop: 2, flexWrap: 'wrap' }}>
                  <span style={{ fontSize: 10, color: 'var(--muted)', fontFamily: 'monospace' }}>
                    {fmtPhone(c.phone)}
                  </span>
                  {c.appointment_count > 0 && (
                    <span style={{ fontSize: 10, color: '#14C38E', fontWeight: 600 }}>
                      📅 {c.appointment_count} consulta{c.appointment_count !== 1 ? 's' : ''}
                    </span>
                  )}
                </div>
              </div>

              <div style={{ textAlign: 'right', flexShrink: 0 }}>
                <div style={{ fontSize: 10, color: 'var(--muted)' }}>
                  {fmtRelative(c.last_inbound_at)}
                </div>
                {c.lgpd_consent_at && (
                  <div style={{ fontSize: 9, color: 'var(--muted)', marginTop: 1 }}>
                    LGPD ✓
                  </div>
                )}
              </div>
            </div>
          ))
        )}
      </div>

      {/* Rodapé com totais */}
      <div style={{
        padding: '6px 12px', borderTop: '1px solid var(--border)',
        flexShrink: 0, display: 'flex', gap: 12, flexWrap: 'wrap',
      }}>
        <span style={{ fontSize: 10, color: 'var(--muted)' }}>{counts.todos} contatos no total</span>
        <span style={{ fontSize: 10, color: '#14C38E' }}>{counts.ativos} com LGPD</span>
        {counts.sem_lgpd > 0 && <span style={{ fontSize: 10, color: '#F0A500' }}>{counts.sem_lgpd} sem consentimento</span>}
        {counts.optout > 0 && <span style={{ fontSize: 10, color: '#EF4444' }}>{counts.optout} opt-out</span>}
      </div>
    </div>
  )
}
