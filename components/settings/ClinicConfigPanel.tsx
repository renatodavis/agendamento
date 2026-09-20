'use client'
import { useState, useEffect, useRef } from 'react'

type Service = { name: string; description: string }

type ClinicConfig = {
  clinic_name?: string
  working_hours?: string
  services?: Service[]
  out_of_scope_response?: string
}

export default function ClinicConfigPanel() {
  const [cfg, setCfg]       = useState<ClinicConfig>({})
  const [loading, setLoading] = useState(true)
  const [saving, setSaving]   = useState(false)
  const [saved, setSaved]     = useState(false)

  // new service form
  const [newName, setNewName]   = useState('')
  const [newDesc, setNewDesc]   = useState('')
  const nameRef = useRef<HTMLInputElement>(null)

  useEffect(() => { load() }, [])

  async function load() {
    setLoading(true)
    const r = await fetch('/api/clinic-config')
    if (r.ok) setCfg(await r.json())
    setLoading(false)
  }

  async function save() {
    setSaving(true)
    setSaved(false)
    await fetch('/api/clinic-config', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(cfg),
    })
    setSaving(false)
    setSaved(true)
    setTimeout(() => setSaved(false), 2500)
  }

  function addService() {
    if (!newName.trim()) return
    setCfg(prev => ({
      ...prev,
      services: [...(prev.services ?? []), { name: newName.trim(), description: newDesc.trim() }],
    }))
    setNewName(''); setNewDesc('')
    nameRef.current?.focus()
  }

  function removeService(idx: number) {
    setCfg(prev => ({ ...prev, services: (prev.services ?? []).filter((_, i) => i !== idx) }))
  }

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center" style={{ color: 'var(--muted)' }}>
        <span className="text-xs">Carregando configurações…</span>
      </div>
    )
  }

  return (
    <div className="flex-1 overflow-y-auto p-3 flex flex-col gap-4"
      style={{ scrollbarWidth: 'thin', scrollbarColor: 'var(--border) transparent' }}>

      {/* Dados gerais */}
      <section className="flex flex-col gap-2">
        <div className="text-[10px] font-bold uppercase tracking-wide" style={{ color: 'var(--muted)' }}>
          Dados da Clínica
        </div>

        <label className="flex flex-col gap-1">
          <span className="text-[10px]" style={{ color: 'var(--muted)' }}>Nome da clínica</span>
          <input
            className="text-[12px] px-2.5 py-1.5 rounded-md border outline-none"
            style={{ background: 'var(--panel)', borderColor: 'var(--border)', color: 'var(--text)' }}
            value={cfg.clinic_name ?? ''}
            onChange={e => setCfg(p => ({ ...p, clinic_name: e.target.value }))}
          />
        </label>

        <label className="flex flex-col gap-1">
          <span className="text-[10px]" style={{ color: 'var(--muted)' }}>Horário de funcionamento</span>
          <input
            className="text-[12px] px-2.5 py-1.5 rounded-md border outline-none"
            style={{ background: 'var(--panel)', borderColor: 'var(--border)', color: 'var(--text)' }}
            value={cfg.working_hours ?? ''}
            onChange={e => setCfg(p => ({ ...p, working_hours: e.target.value }))}
          />
        </label>
      </section>

      {/* Serviços disponíveis */}
      <section className="flex flex-col gap-2">
        <div className="text-[10px] font-bold uppercase tracking-wide" style={{ color: 'var(--muted)' }}>
          Especialidades / Serviços Atendidos
        </div>
        <p className="text-[9px] leading-relaxed" style={{ color: 'var(--muted)' }}>
          O bot responderá APENAS solicitações relacionadas a estas especialidades. Pedidos fora da lista recebem uma mensagem educada informando o que a clínica atende.
        </p>

        <div className="flex flex-col gap-1.5">
          {(cfg.services ?? []).map((s, i) => (
            <div key={i} className="flex items-center gap-2 rounded-md px-2.5 py-2 border"
              style={{ background: 'var(--panel)', borderColor: 'var(--border)' }}>
              <div className="flex-1 min-w-0">
                <div className="text-[11px] font-semibold truncate">{s.name}</div>
                <div className="text-[9px] truncate" style={{ color: 'var(--muted)' }}>{s.description}</div>
              </div>
              <button
                onClick={() => removeService(i)}
                className="shrink-0 w-5 h-5 rounded flex items-center justify-center text-[10px] transition-colors"
                style={{ color: 'var(--red)', background: '#EF444416' }}
                title="Remover">
                ✕
              </button>
            </div>
          ))}
        </div>

        {/* Add new service */}
        <div className="flex flex-col gap-1.5 rounded-md border-dashed border px-2.5 py-2"
          style={{ borderColor: 'var(--border)' }}>
          <div className="text-[9px] font-semibold" style={{ color: 'var(--muted)' }}>Nova especialidade</div>
          <input
            ref={nameRef}
            className="text-[11px] px-2 py-1 rounded border outline-none"
            style={{ background: 'var(--panel)', borderColor: 'var(--border)', color: 'var(--text)' }}
            placeholder="Nome (ex: Neurologia)"
            value={newName}
            onChange={e => setNewName(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && addService()}
          />
          <input
            className="text-[11px] px-2 py-1 rounded border outline-none"
            style={{ background: 'var(--panel)', borderColor: 'var(--border)', color: 'var(--text)' }}
            placeholder="Descrição curta (opcional)"
            value={newDesc}
            onChange={e => setNewDesc(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && addService()}
          />
          <button
            onClick={addService}
            className="self-start text-[10px] px-2.5 py-1 rounded border font-semibold"
            style={{ color: '#14C38E', borderColor: '#14C38E', background: '#14C38E12' }}>
            + Adicionar
          </button>
        </div>
      </section>

      {/* Mensagem fora de escopo */}
      <section className="flex flex-col gap-2">
        <div className="text-[10px] font-bold uppercase tracking-wide" style={{ color: 'var(--muted)' }}>
          Mensagem para Atendimento Fora do Escopo
        </div>
        <p className="text-[9px]" style={{ color: 'var(--muted)' }}>
          Use <code className="px-1 rounded" style={{ background: 'var(--panel)' }}>{'{clinic_name}'}</code> e <code className="px-1 rounded" style={{ background: 'var(--panel)' }}>{'{services_list}'}</code> como variáveis.
        </p>
        <textarea
          rows={5}
          className="text-[11px] px-2.5 py-2 rounded-md border outline-none resize-none leading-relaxed"
          style={{ background: 'var(--panel)', borderColor: 'var(--border)', color: 'var(--text)' }}
          value={cfg.out_of_scope_response ?? ''}
          onChange={e => setCfg(p => ({ ...p, out_of_scope_response: e.target.value }))}
        />
      </section>

      {/* Save button */}
      <button
        onClick={save}
        disabled={saving}
        className="w-full py-2 rounded-md text-[12px] font-semibold transition-all disabled:opacity-50"
        style={{
          background: saved ? '#14C38E' : 'var(--accent)',
          color: '#fff',
        }}>
        {saving ? 'Salvando…' : saved ? '✓ Salvo com sucesso!' : 'Salvar Configurações'}
      </button>
    </div>
  )
}
