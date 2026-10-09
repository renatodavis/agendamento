'use client'
import { useState, useEffect, useRef } from 'react'
import { supabase } from '@/lib/supabase'
import type { Doctor, Patient } from '@/types'
import { X, Search, CalendarDays, Clock, User, Stethoscope } from 'lucide-react'

interface Props {
  onClose: () => void
  onCreated: () => void
}

type Step = 'paciente' | 'detalhes' | 'confirmacao'

// scheduled_at guarda a hora de Brasília marcada como UTC (15h → "T15:00:00Z")
function toScheduledAt(date: string, time: string): string {
  return `${date}T${time}:00Z`
}

function localToday(): string {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

function fmtDate(d: string) {
  return new Date(d + 'T12:00:00').toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'long' })
}

export default function NovoAgendamentoModal({ onClose, onCreated }: Props) {
  const [step, setStep] = useState<Step>('paciente')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Paciente
  const [search, setSearch] = useState('')
  const [patients, setPatients] = useState<Patient[]>([])
  const [searching, setSearching] = useState(false)
  const [selectedPatient, setSelectedPatient] = useState<Patient | null>(null)
  const searchRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  // Detalhes
  const [doctors, setDoctors] = useState<Doctor[]>([])
  const [selectedDoctor, setSelectedDoctor] = useState<Doctor | null>(null)
  const [date, setDate] = useState(localToday)
  const [time, setTime] = useState('09:00')
  const [type, setType] = useState('')

  useEffect(() => {
    supabase.from('doctors').select('id, name, specialty, crm').order('specialty')
      .then(({ data }) => { if (data) setDoctors(data) })
  }, [])

  useEffect(() => {
    if (!search.trim()) { setPatients([]); return }
    if (searchRef.current) clearTimeout(searchRef.current)
    searchRef.current = setTimeout(async () => {
      setSearching(true)
      const { data } = await supabase
        .from('patients')
        .select('id, name, phone, convenio, photo_emoji, created_at')
        .or(`name.ilike.%${search}%,phone.ilike.%${search}%`)
        .limit(8)
      setPatients(data ?? [])
      setSearching(false)
    }, 300)
  }, [search])

  async function handleSave() {
    if (!selectedPatient || !selectedDoctor || !date || !time) return
    setSaving(true); setError(null)
    try {
      const scheduledAt = toScheduledAt(date, time)
      const { error: err } = await supabase.from('appointments').insert({
        patient_id:   selectedPatient.id,
        doctor_id:    selectedDoctor.id,
        scheduled_at: scheduledAt,
        type:         type || selectedDoctor.specialty,
        status:       'confirmada',
      })
      if (err) throw new Error(err.message)

      // history entry
      const { data: created } = await supabase
        .from('appointments')
        .select('id')
        .eq('patient_id', selectedPatient.id)
        .eq('scheduled_at', scheduledAt)
        .order('created_at', { ascending: false })
        .limit(1)
        .single()

      if (created?.id) {
        await supabase.from('appointment_history').insert({
          appointment_id: created.id,
          event: 'Agendado via sistema',
          kind: 'schedule',
          actor: 'recepcionista',
        })
      }
      onCreated()
      onClose()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Erro ao salvar')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: 'rgba(0,0,0,.55)' }}
      onClick={e => { if (e.target === e.currentTarget) onClose() }}
    >
      <div
        className="relative flex flex-col rounded-xl shadow-2xl"
        style={{
          width: '100%', maxWidth: 480, maxHeight: '90vh',
          background: 'var(--surface-raised)',
          border: '1px solid var(--line)',
          boxShadow: 'var(--shadow-pop)',
        }}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b" style={{ borderColor: 'var(--line)' }}>
          <div>
            <div className="text-[11px] font-semibold uppercase tracking-widest" style={{ color: 'var(--ink-muted)' }}>
              {step === 'paciente' ? 'Passo 1 de 3' : step === 'detalhes' ? 'Passo 2 de 3' : 'Passo 3 de 3'}
            </div>
            <h2 className="font-display font-semibold text-base mt-0.5" style={{ color: 'var(--ink)' }}>
              {step === 'paciente' ? 'Selecionar paciente' : step === 'detalhes' ? 'Data, horário e profissional' : 'Confirmar agendamento'}
            </h2>
          </div>
          <button
            onClick={onClose}
            className="flex items-center justify-center w-8 h-8 rounded-lg transition-colors"
            style={{ color: 'var(--ink-muted)' }}
          >
            <X size={18} />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-5 flex flex-col gap-4">

          {/* ── Step 1: Paciente ─────────────────────────────────── */}
          {step === 'paciente' && (
            <>
              <div className="relative">
                <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" style={{ color: 'var(--ink-muted)' }} />
                <input
                  autoFocus
                  placeholder="Buscar por nome ou telefone…"
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                  className="w-full pl-9 pr-3 py-2.5 rounded-lg text-sm border outline-none"
                  style={{
                    background: 'var(--surface-sunken)',
                    borderColor: 'var(--line)',
                    color: 'var(--ink)',
                  }}
                />
              </div>

              {searching && (
                <div className="text-xs text-center py-2" style={{ color: 'var(--ink-muted)' }}>Buscando…</div>
              )}

              {patients.length > 0 && (
                <div className="flex flex-col gap-1">
                  {patients.map(p => (
                    <button
                      key={p.id}
                      onClick={() => { setSelectedPatient(p); setStep('detalhes') }}
                      className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-left transition-colors hover:opacity-80"
                      style={{ background: 'var(--surface-sunken)', border: '1px solid var(--line)' }}
                    >
                      <span className="text-xl leading-none">{p.photo_emoji || '🧑'}</span>
                      <div className="flex-1 min-w-0">
                        <div className="text-sm font-medium truncate" style={{ color: 'var(--ink)' }}>{p.name}</div>
                        <div className="text-xs" style={{ color: 'var(--ink-muted)' }}>{p.phone}{p.convenio ? ` · ${p.convenio}` : ''}</div>
                      </div>
                    </button>
                  ))}
                </div>
              )}

              {search.trim() && !searching && patients.length === 0 && (
                <div className="text-sm text-center py-4" style={{ color: 'var(--ink-muted)' }}>
                  Nenhum paciente encontrado para "{search}"
                </div>
              )}

              {!search.trim() && (
                <div className="text-sm text-center py-6" style={{ color: 'var(--ink-muted)' }}>
                  Digite o nome ou telefone do paciente
                </div>
              )}
            </>
          )}

          {/* ── Step 2: Detalhes ─────────────────────────────────── */}
          {step === 'detalhes' && (
            <>
              {/* Paciente selecionado */}
              <div className="flex items-center gap-3 px-3 py-2.5 rounded-lg" style={{ background: 'var(--brand-soft)', border: '1px solid var(--brand)' }}>
                <User size={14} style={{ color: 'var(--brand-ink)' }} />
                <div>
                  <div className="text-xs font-semibold" style={{ color: 'var(--brand-ink)' }}>{selectedPatient?.name}</div>
                  <div className="text-[11px]" style={{ color: 'var(--brand-ink)', opacity: 0.8 }}>{selectedPatient?.phone}</div>
                </div>
                <button
                  className="ml-auto text-[11px] underline"
                  style={{ color: 'var(--brand-ink)' }}
                  onClick={() => { setSelectedPatient(null); setStep('paciente') }}
                >
                  Trocar
                </button>
              </div>

              {/* Profissional */}
              <div>
                <label className="flex items-center gap-1.5 text-xs font-semibold mb-1.5" style={{ color: 'var(--ink-muted)' }}>
                  <Stethoscope size={13} /> Profissional
                </label>
                <div className="flex flex-col gap-1">
                  {doctors.map(d => (
                    <button
                      key={d.id}
                      onClick={() => { setSelectedDoctor(d); if (!type) setType(d.specialty) }}
                      className="flex items-center gap-3 px-3 py-2 rounded-lg text-left transition-colors"
                      style={{
                        background: selectedDoctor?.id === d.id ? 'var(--brand-soft)' : 'var(--surface-sunken)',
                        border: `1px solid ${selectedDoctor?.id === d.id ? 'var(--brand)' : 'var(--line)'}`,
                        color: 'var(--ink)',
                      }}
                    >
                      <div className="flex-1 min-w-0">
                        <div className="text-sm font-medium">{d.name}</div>
                        <div className="text-xs" style={{ color: 'var(--ink-muted)' }}>{d.specialty}</div>
                      </div>
                      {selectedDoctor?.id === d.id && (
                        <div className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: 'var(--brand)' }} />
                      )}
                    </button>
                  ))}
                </div>
              </div>

              {/* Data e hora */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="flex items-center gap-1.5 text-xs font-semibold mb-1.5" style={{ color: 'var(--ink-muted)' }}>
                    <CalendarDays size={13} /> Data
                  </label>
                  <input
                    type="date"
                    value={date}
                    min={localToday()}
                    onChange={e => setDate(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg text-sm border outline-none"
                    style={{ background: 'var(--surface-sunken)', borderColor: 'var(--line)', color: 'var(--ink)' }}
                  />
                </div>
                <div>
                  <label className="flex items-center gap-1.5 text-xs font-semibold mb-1.5" style={{ color: 'var(--ink-muted)' }}>
                    <Clock size={13} /> Horário
                  </label>
                  <input
                    type="time"
                    value={time}
                    onChange={e => setTime(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg text-sm border outline-none"
                    style={{ background: 'var(--surface-sunken)', borderColor: 'var(--line)', color: 'var(--ink)' }}
                  />
                </div>
              </div>

              {/* Tipo (opcional) */}
              <div>
                <label className="text-xs font-semibold mb-1.5 block" style={{ color: 'var(--ink-muted)' }}>
                  Tipo / serviço <span style={{ color: 'var(--ink-muted)', fontWeight: 400 }}>(opcional)</span>
                </label>
                <input
                  placeholder={selectedDoctor?.specialty || 'Ex: Consulta, Retorno, Avaliação…'}
                  value={type}
                  onChange={e => setType(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg text-sm border outline-none"
                  style={{ background: 'var(--surface-sunken)', borderColor: 'var(--line)', color: 'var(--ink)' }}
                />
              </div>
            </>
          )}

          {/* ── Step 3: Confirmação ──────────────────────────────── */}
          {step === 'confirmacao' && (
            <div className="flex flex-col gap-3">
              {[
                { icon: <User size={14} />, label: 'Paciente', value: selectedPatient?.name },
                { icon: <Stethoscope size={14} />, label: 'Profissional', value: selectedDoctor ? `${selectedDoctor.name} — ${selectedDoctor.specialty}` : '—' },
                { icon: <CalendarDays size={14} />, label: 'Data', value: date ? fmtDate(date) : '—' },
                { icon: <Clock size={14} />, label: 'Horário', value: time },
                { icon: null, label: 'Tipo', value: type || selectedDoctor?.specialty || '—' },
              ].map(row => (
                <div key={row.label} className="flex items-start gap-3 px-3 py-2.5 rounded-lg" style={{ background: 'var(--surface-sunken)', border: '1px solid var(--line)' }}>
                  <span style={{ color: 'var(--brand)', marginTop: 1 }}>{row.icon}</span>
                  <div>
                    <div className="text-[10px] uppercase tracking-wider font-semibold" style={{ color: 'var(--ink-muted)' }}>{row.label}</div>
                    <div className="text-sm font-medium mt-0.5" style={{ color: 'var(--ink)' }}>{row.value || '—'}</div>
                  </div>
                </div>
              ))}
              {error && (
                <div className="text-xs px-3 py-2 rounded-lg" style={{ background: 'var(--danger-soft)', color: 'var(--danger)' }}>
                  {error}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex gap-2 px-5 py-4 border-t" style={{ borderColor: 'var(--line)' }}>
          {step === 'paciente' && (
            <button onClick={onClose} className="flex-1 py-2.5 rounded-lg text-sm font-medium" style={{ background: 'var(--surface-sunken)', color: 'var(--ink-muted)', border: '1px solid var(--line)' }}>
              Cancelar
            </button>
          )}

          {step === 'detalhes' && (
            <>
              <button onClick={() => setStep('paciente')} className="px-4 py-2.5 rounded-lg text-sm font-medium" style={{ background: 'var(--surface-sunken)', color: 'var(--ink-muted)', border: '1px solid var(--line)' }}>
                Voltar
              </button>
              <button
                onClick={() => setStep('confirmacao')}
                disabled={!selectedDoctor || !date || !time}
                className="flex-1 py-2.5 rounded-lg text-sm font-semibold transition-opacity disabled:opacity-40"
                style={{ background: 'var(--brand)', color: 'var(--on-brand)' }}
              >
                Continuar
              </button>
            </>
          )}

          {step === 'confirmacao' && (
            <>
              <button onClick={() => setStep('detalhes')} className="px-4 py-2.5 rounded-lg text-sm font-medium" style={{ background: 'var(--surface-sunken)', color: 'var(--ink-muted)', border: '1px solid var(--line)' }}>
                Voltar
              </button>
              <button
                onClick={handleSave}
                disabled={saving}
                className="flex-1 py-2.5 rounded-lg text-sm font-semibold transition-opacity disabled:opacity-60"
                style={{ background: 'var(--brand)', color: 'var(--on-brand)' }}
              >
                {saving ? 'Salvando…' : 'Confirmar agendamento'}
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
