'use client'
import { useState, useEffect, useCallback } from 'react'
import { invalidateActiveProfileCache } from '@/lib/useActiveProfile'

export type Profile = {
  id: string
  name: string
  domain_type: string
  business_context: string
  out_of_scope_message: string
  specialties: { name: string; description: string }[]
  professionals: { name: string; specialty: string }[]
  vocabulary: {
    business_name?: string
    client?: string
    professional?: string
    professionals?: string
    appointment?: string
    business_noun?: string
    emoji?: string
    urgency_redirect?: string
  }
  is_active: boolean
}

const DOMAIN_META: Record<string, { emoji: string; label: string }> = {
  clinica:       { emoji: '🏥', label: 'Clínica Médica' },
  odontologia:   { emoji: '🦷', label: 'Odontologia' },
  veterinaria:   { emoji: '🐾', label: 'Veterinária' },
  personal:      { emoji: '💪', label: 'Academia / Personal' },
  salao:         { emoji: '💇', label: 'Salão de Beleza' },
  barbearia:     { emoji: '✂️', label: 'Barbearia' },
}

const EMPTY_PROFILE: Omit<Profile, 'id' | 'is_active'> = {
  name: '',
  domain_type: 'clinica',
  business_context: '',
  out_of_scope_message: 'Lamento, mas não atendemos essa solicitação. Atendemos: {services_list}',
  specialties: [{ name: '', description: '' }],
  professionals: [{ name: '', specialty: '' }],
  vocabulary: {
    business_name: '',
    client: 'cliente',
    professional: 'profissional',
    professionals: 'profissionais',
    appointment: 'atendimento',
    business_noun: 'negócio',
    emoji: '🏢',
    urgency_redirect: '',
  },
}

const btn = (extra: object = {}) => ({
  padding: '5px 12px', borderRadius: 7, fontSize: 11, fontWeight: 600,
  border: '1px solid var(--border)', background: 'var(--card)',
  color: 'var(--foreground)', cursor: 'pointer', letterSpacing: '.02em',
  ...extra,
})

const input = {
  width: '100%', padding: '7px 10px', borderRadius: 7, fontSize: 12,
  border: '1px solid var(--border)', background: 'var(--input, var(--card))',
  color: 'var(--foreground)', outline: 'none', boxSizing: 'border-box' as const,
}

const label = {
  display: 'block' as const, fontSize: 11, fontWeight: 600,
  color: 'var(--muted)', marginBottom: 4, textTransform: 'uppercase' as const, letterSpacing: '.04em',
}

export default function ProfilesPanel({ onClose }: { onClose: () => void }) {
  const [profiles, setProfiles] = useState<Profile[]>([])
  const [loading, setLoading] = useState(true)
  const [editing, setEditing] = useState<Partial<Profile> | null>(null)
  const [isNew, setIsNew] = useState(false)
  const [saving, setSaving] = useState(false)
  const [activating, setActivating] = useState<string | null>(null)
  const [error, setError] = useState('')

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch('/api/profiles')
      const data = await res.json()
      setProfiles(Array.isArray(data) ? data : [])
    } catch {
      setError('Erro ao carregar perfis')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { load() }, [load])

  async function handleActivate(id: string) {
    setActivating(id)
    setError('')
    try {
      const res = await fetch(`/api/profiles/${id}/activate`, { method: 'POST' })
      if (!res.ok) throw new Error((await res.json()).error)
      invalidateActiveProfileCache()
      await load()
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Erro ao ativar perfil')
    } finally {
      setActivating(null)
    }
  }

  async function handleSave() {
    if (!editing) return
    setSaving(true)
    setError('')
    try {
      const url = isNew ? '/api/profiles' : `/api/profiles/${editing.id}`
      const method = isNew ? 'POST' : 'PUT'
      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(editing),
      })
      if (!res.ok) throw new Error((await res.json()).error)
      await load()
      setEditing(null)
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Erro ao salvar')
    } finally {
      setSaving(false)
    }
  }

  async function handleDelete(id: string) {
    if (!confirm('Excluir este perfil?')) return
    setError('')
    try {
      const res = await fetch(`/api/profiles/${id}`, { method: 'DELETE' })
      if (!res.ok) throw new Error((await res.json()).error)
      await load()
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Erro ao excluir')
    }
  }

  function openEdit(p: Profile) {
    setEditing({
      ...p,
      specialties: p.specialties?.length ? [...p.specialties] : [{ name: '', description: '' }],
      professionals: p.professionals?.length ? [...p.professionals] : [{ name: '', specialty: '' }],
    })
    setIsNew(false)
  }

  function openNew() {
    setEditing({ ...EMPTY_PROFILE, specialties: [{ name: '', description: '' }] })
    setIsNew(true)
  }

  // ── Edit / Create Form ──────────────────────────────────────────────────
  if (editing) {
    const e = editing
    const setE = (patch: Partial<Profile>) => setEditing(prev => ({ ...prev, ...patch }))
    const setVoc = (patch: object) => setE({ vocabulary: { ...e.vocabulary, ...patch } })

    function setSpecialty(idx: number, field: 'name' | 'description', val: string) {
      const sp = [...(e.specialties ?? [])]
      sp[idx] = { ...sp[idx], [field]: val }
      setE({ specialties: sp })
    }
    function addSpecialty() { setE({ specialties: [...(e.specialties ?? []), { name: '', description: '' }] }) }
    function removeSpecialty(idx: number) { setE({ specialties: (e.specialties ?? []).filter((_, i) => i !== idx) }) }

    return (
      <Overlay onClose={onClose}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
          <h2 style={{ fontSize: 15, fontWeight: 700, margin: 0 }}>
            {isNew ? '+ Novo Perfil' : `Editar: ${e.name}`}
          </h2>
          <button style={btn()} onClick={() => setEditing(null)}>← Voltar</button>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 14, overflowY: 'auto', flex: 1, paddingRight: 4 }}>
          {/* Nome e tipo */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <div>
              <span style={label}>Nome do Perfil</span>
              <input style={input} value={e.name ?? ''} onChange={ev => setE({ name: ev.target.value })} placeholder="Ex: Minha Clínica" />
            </div>
            <div>
              <span style={label}>Ramo de Atividade</span>
              <select style={input} value={e.domain_type ?? 'clinica'} onChange={ev => setE({ domain_type: ev.target.value })}>
                {Object.entries(DOMAIN_META).map(([k, v]) => (
                  <option key={k} value={k}>{v.emoji} {v.label}</option>
                ))}
                <option value="outro">🏢 Outro</option>
              </select>
            </div>
          </div>

          {/* Contexto do negócio */}
          <div>
            <span style={label}>Contexto do Negócio (instrução para a IA)</span>
            <textarea
              style={{ ...input, minHeight: 72, resize: 'vertical' }}
              value={e.business_context ?? ''}
              onChange={ev => setE({ business_context: ev.target.value })}
              placeholder="Descreva o negócio, diferenciais, regras de atendimento..."
            />
          </div>

          {/* Mensagem fora do escopo */}
          <div>
            <span style={label}>Mensagem Fora do Escopo</span>
            <textarea
              style={{ ...input, minHeight: 56, resize: 'vertical' }}
              value={e.out_of_scope_message ?? ''}
              onChange={ev => setE({ out_of_scope_message: ev.target.value })}
              placeholder="Use {services_list} para listar os serviços disponíveis"
            />
            <div style={{ fontSize: 10, color: 'var(--muted)', marginTop: 3 }}>Use <code>{'{services_list}'}</code> para inserir a lista de serviços</div>
          </div>

          {/* Vocabulário */}
          <div>
            <span style={label}>Vocabulário da IA</span>
            {/* business_name em destaque */}
            <div style={{ marginBottom: 8, padding: '8px 10px', borderRadius: 8, background: 'color-mix(in srgb, var(--green) 8%, var(--card))', border: '1px solid color-mix(in srgb, var(--green) 30%, transparent)' }}>
              <span style={{ ...label, fontSize: 10, color: 'var(--green)' }}>Nome do Negócio (sobrescreve o nome padrão para a IA)</span>
              <input style={input} placeholder="Ex: Clínica São Lucas, Barbearia do João... (deixe vazio para usar o nome padrão)"
                value={(e.vocabulary as Record<string, string>)?.business_name ?? ''}
                onChange={ev => setVoc({ business_name: ev.target.value })}
              />
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))', gap: 8 }}>
              {[
                { k: 'client',        lbl: 'Cliente/Paciente' },
                { k: 'professional',  lbl: 'Profissional (sing.)' },
                { k: 'professionals', lbl: 'Profissional (plur.)' },
                { k: 'appointment',   lbl: 'Agendamento' },
                { k: 'business_noun', lbl: 'Tipo de negócio' },
                { k: 'emoji',         lbl: 'Emoji' },
              ].map(({ k, lbl }) => (
                <div key={k}>
                  <span style={{ ...label, fontSize: 10 }}>{lbl}</span>
                  <input style={{ ...input, padding: '5px 8px' }}
                    value={(e.vocabulary as Record<string, string>)?.[k] ?? ''}
                    onChange={ev => setVoc({ [k]: ev.target.value })}
                  />
                </div>
              ))}
            </div>
          </div>

          {/* Profissionais */}
          <div>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
              <span style={label}>Profissionais / Especialistas</span>
              <button style={btn({ fontSize: 10 })} onClick={() => setE({ professionals: [...(e.professionals ?? []), { name: '', specialty: '' }] })}>+ Adicionar</button>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              {(e.professionals ?? []).map((p, idx) => (
                <div key={idx} style={{ display: 'grid', gridTemplateColumns: '1fr 2fr auto', gap: 6, alignItems: 'center' }}>
                  <input style={input} placeholder="Nome" value={p.name}
                    onChange={ev => { const ps = [...(e.professionals ?? [])]; ps[idx] = { ...ps[idx], name: ev.target.value }; setE({ professionals: ps }) }} />
                  <input style={input} placeholder="Especialidade" value={p.specialty}
                    onChange={ev => { const ps = [...(e.professionals ?? [])]; ps[idx] = { ...ps[idx], specialty: ev.target.value }; setE({ professionals: ps }) }} />
                  <button style={btn({ color: 'var(--red, #e53)', padding: '5px 8px' })}
                    onClick={() => setE({ professionals: (e.professionals ?? []).filter((_, i) => i !== idx) })}>✕</button>
                </div>
              ))}
            </div>
          </div>

          {/* Especialidades / Serviços */}
          <div>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
              <span style={label}>Especialidades / Serviços</span>
              <button style={btn({ fontSize: 10 })} onClick={addSpecialty}>+ Adicionar</button>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              {(e.specialties ?? []).map((sp, idx) => (
                <div key={idx} style={{ display: 'grid', gridTemplateColumns: '1fr 2fr auto', gap: 6, alignItems: 'center' }}>
                  <input style={input} placeholder="Nome" value={sp.name} onChange={ev => setSpecialty(idx, 'name', ev.target.value)} />
                  <input style={input} placeholder="Descrição" value={sp.description} onChange={ev => setSpecialty(idx, 'description', ev.target.value)} />
                  <button style={btn({ color: 'var(--red, #e53)', padding: '5px 8px' })} onClick={() => removeSpecialty(idx)}>✕</button>
                </div>
              ))}
            </div>
          </div>
        </div>

        {error && <div style={{ fontSize: 11, color: 'var(--red, #e53)', marginTop: 8 }}>{error}</div>}

        <div style={{ display: 'flex', gap: 8, marginTop: 16, justifyContent: 'flex-end' }}>
          <button style={btn()} onClick={() => setEditing(null)}>Cancelar</button>
          <button
            style={btn({ background: 'var(--green)', color: '#fff', border: 'none' })}
            onClick={handleSave}
            disabled={saving}>
            {saving ? 'Salvando...' : 'Salvar Perfil'}
          </button>
        </div>
      </Overlay>
    )
  }

  // ── Profile List ───────────────────────────────────────────────────────
  const active = profiles.find(p => p.is_active)

  return (
    <Overlay onClose={onClose}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
        <div>
          <h2 style={{ fontSize: 15, fontWeight: 700, margin: 0 }}>Perfis de Negócio</h2>
          {active && (
            <div style={{ fontSize: 11, color: 'var(--muted)', marginTop: 2 }}>
              Ativo: <strong style={{ color: 'var(--green)' }}>{active.name}</strong>
            </div>
          )}
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button style={btn({ background: 'var(--green)', color: '#fff', border: 'none' })} onClick={openNew}>
            + Novo Perfil
          </button>
          <button style={btn()} onClick={onClose}>Fechar</button>
        </div>
      </div>

      {error && <div style={{ fontSize: 11, color: 'var(--red, #e53)', marginBottom: 8 }}>{error}</div>}

      {loading ? (
        <div style={{ textAlign: 'center', padding: 32, color: 'var(--muted)', fontSize: 13 }}>Carregando perfis...</div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: 12, overflowY: 'auto', flex: 1 }}>
          {profiles.map(p => {
            const meta = DOMAIN_META[p.domain_type] ?? { emoji: '🏢', label: p.domain_type }
            return (
              <div key={p.id} style={{
                borderRadius: 12, padding: 14,
                border: `2px solid ${p.is_active ? 'var(--green)' : 'var(--border)'}`,
                background: p.is_active ? 'color-mix(in srgb, var(--green) 8%, var(--card))' : 'var(--card)',
                display: 'flex', flexDirection: 'column', gap: 8,
                boxShadow: p.is_active ? '0 0 0 1px color-mix(in srgb, var(--green) 25%, transparent)' : 'var(--shadow-sm)',
              }}>
                {/* Header */}
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <div style={{
                    width: 38, height: 38, borderRadius: 10, fontSize: 18,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    background: 'var(--panel)', border: '1px solid var(--border)', flexShrink: 0,
                  }}>{p.vocabulary?.emoji ?? meta.emoji}</div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontWeight: 700, fontSize: 13, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{p.name}</div>
                    <div style={{ fontSize: 10, color: 'var(--muted)' }}>{meta.label}</div>
                  </div>
                  {p.is_active && (
                    <span style={{
                      fontSize: 9, fontWeight: 700, padding: '2px 7px', borderRadius: 20,
                      background: 'var(--green)', color: '#fff', flexShrink: 0,
                    }}>ATIVO</span>
                  )}
                </div>

                {/* Especialidades (preview) */}
                {p.specialties?.length > 0 && (
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
                    {p.specialties.slice(0, 4).map((sp, i) => (
                      <span key={i} style={{
                        fontSize: 9, padding: '2px 6px', borderRadius: 10,
                        background: 'var(--panel)', border: '1px solid var(--border)',
                        color: 'var(--muted)',
                      }}>{sp.name}</span>
                    ))}
                    {p.specialties.length > 4 && (
                      <span style={{ fontSize: 9, color: 'var(--muted)' }}>+{p.specialties.length - 4}</span>
                    )}
                  </div>
                )}

                {/* Vocabulário resumido */}
                <div style={{ fontSize: 10, color: 'var(--muted)', lineHeight: 1.5 }}>
                  {p.vocabulary?.client && <span>👤 {p.vocabulary.client} · </span>}
                  {p.vocabulary?.professional && <span>🎓 {p.vocabulary.professional} · </span>}
                  {p.vocabulary?.appointment && <span>📅 {p.vocabulary.appointment}</span>}
                </div>

                {/* Botões */}
                <div style={{ display: 'flex', gap: 6, marginTop: 2 }}>
                  {!p.is_active && (
                    <button
                      style={btn({ background: 'var(--green)', color: '#fff', border: 'none', flex: 1, opacity: activating === p.id ? 0.7 : 1 })}
                      onClick={() => handleActivate(p.id)}
                      disabled={activating === p.id}>
                      {activating === p.id ? '...' : '▶ Ativar'}
                    </button>
                  )}
                  <button style={btn({ flex: p.is_active ? 1 : 0 })} onClick={() => openEdit(p)}>✏️ Editar</button>
                  {!p.is_active && (
                    <button style={btn({ color: 'var(--red, #e53)' })} onClick={() => handleDelete(p.id)}>✕</button>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      )}
    </Overlay>
  )
}

function Overlay({ children, onClose }: { children: React.ReactNode; onClose: () => void }) {
  return (
    <div
      style={{
        position: 'fixed', inset: 0, zIndex: 200,
        background: 'rgba(0,0,0,.45)', backdropFilter: 'blur(4px)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        padding: 16,
      }}
      onClick={ev => { if (ev.target === ev.currentTarget) onClose() }}>
      <div style={{
        background: 'var(--panel)',
        border: '1px solid var(--border)',
        borderRadius: 16,
        padding: 20,
        width: '100%',
        maxWidth: 800,
        maxHeight: '90vh',
        display: 'flex',
        flexDirection: 'column',
        boxShadow: '0 24px 48px rgba(0,0,0,.25)',
        overflow: 'hidden',
      }}>
        {children}
      </div>
    </div>
  )
}
