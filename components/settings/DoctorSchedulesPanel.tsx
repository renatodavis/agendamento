'use client'
import { useState, useEffect } from 'react'

const DAY_NAMES = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb']

type Schedule = {
  id?: string
  day_of_week: number
  start_time: string
  end_time: string
  slot_minutes: number
}

type BlockedSlot = {
  id: string
  blocked_date: string
  start_time: string | null
  end_time: string | null
  reason: string | null
}

type Doctor = {
  id: string
  name: string
  specialty: string
  schedules: Schedule[]
}

const DEFAULT_SCHEDULE: Omit<Schedule, 'day_of_week'> = {
  start_time: '08:00',
  end_time: '17:00',
  slot_minutes: 60,
}

const inputStyle: React.CSSProperties = {
  fontSize: 11, padding: '4px 6px', borderRadius: 6,
  border: '1px solid var(--border)', background: 'var(--background)',
  color: 'var(--foreground)', outline: 'none',
}

const btnStyle = (color: string): React.CSSProperties => ({
  fontSize: 11, fontWeight: 600, padding: '5px 12px', borderRadius: 7,
  border: 'none', color: '#fff', cursor: 'pointer', background: color,
})

function timeToMin(t: string) {
  const [h, m] = t.split(':').map(Number)
  return h * 60 + m
}
function slotsCount(s: Schedule) {
  return Math.floor((timeToMin(s.end_time) - timeToMin(s.start_time)) / s.slot_minutes)
}
function fmtDate(iso: string) {
  return new Date(iso + 'T12:00:00').toLocaleDateString('pt-BR', { weekday: 'short', day: '2-digit', month: 'short' })
}

// ── Novo Médico ────────────────────────────────────────────
function NewDoctorForm({ onCreated }: { onCreated: () => void }) {
  const [open, setOpen] = useState(false)
  const [name, setName] = useState('')
  const [specialty, setSpecialty] = useState('')
  const [saving, setSaving] = useState(false)
  const [err, setErr] = useState('')

  async function save() {
    if (!name.trim() || !specialty.trim()) { setErr('Preencha nome e especialidade.'); return }
    setSaving(true); setErr('')
    const r = await fetch('/api/doctors', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: name.trim(), specialty: specialty.trim() }),
    })
    setSaving(false)
    if (r.ok) { setName(''); setSpecialty(''); setOpen(false); onCreated() }
    else { const d = await r.json(); setErr(d.error ?? 'Erro ao salvar.') }
  }

  return (
    <div>
      {!open ? (
        <button onClick={() => setOpen(true)} style={{ ...btnStyle('#14C38E'), width: '100%' }}>
          + Novo médico
        </button>
      ) : (
        <div style={{ padding: 12, borderRadius: 10, border: '1px solid var(--border)', background: 'var(--panel)', display: 'flex', flexDirection: 'column', gap: 8 }}>
          <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--foreground)' }}>Novo médico</div>
          <input placeholder="Nome (ex: Dr. Silva)" value={name} onChange={e => setName(e.target.value)}
            style={{ ...inputStyle, width: '100%', boxSizing: 'border-box', padding: '6px 8px', fontSize: 12 }} />
          <input placeholder="Especialidade (ex: Cardiologia)" value={specialty} onChange={e => setSpecialty(e.target.value)}
            style={{ ...inputStyle, width: '100%', boxSizing: 'border-box', padding: '6px 8px', fontSize: 12 }}
            onKeyDown={e => e.key === 'Enter' && save()} />
          {err && <span style={{ fontSize: 11, color: '#EF4444' }}>{err}</span>}
          <div style={{ display: 'flex', gap: 6, justifyContent: 'flex-end' }}>
            <button onClick={() => setOpen(false)} style={{ ...btnStyle('var(--muted)'), background: 'var(--card)', color: 'var(--foreground)', border: '1px solid var(--border)' }}>Cancelar</button>
            <button onClick={save} disabled={saving} style={btnStyle('#14C38E')}>{saving ? 'Salvando…' : 'Salvar'}</button>
          </div>
        </div>
      )}
    </div>
  )
}

// ── Bloqueios ──────────────────────────────────────────────
function BlocksSection({ doctorId }: { doctorId: string }) {
  const [blocks, setBlocks] = useState<BlockedSlot[]>([])
  const [loading, setLoading] = useState(true)
  const [date, setDate] = useState('')
  const [startTime, setStartTime] = useState('')
  const [endTime, setEndTime] = useState('')
  const [reason, setReason] = useState('')
  const [allDay, setAllDay] = useState(true)
  const [saving, setSaving] = useState(false)
  const [err, setErr] = useState('')

  async function load() {
    setLoading(true)
    const r = await fetch(`/api/doctor-blocks?doctor_id=${doctorId}`)
    if (r.ok) setBlocks(await r.json())
    setLoading(false)
  }

  useEffect(() => { load() }, [doctorId])

  async function addBlock() {
    if (!date) { setErr('Selecione uma data.'); return }
    if (!allDay && (!startTime || !endTime)) { setErr('Informe início e fim do bloqueio.'); return }
    setSaving(true); setErr('')
    const r = await fetch('/api/doctor-blocks', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        doctor_id: doctorId,
        blocked_date: date,
        start_time: allDay ? null : startTime,
        end_time: allDay ? null : endTime,
        reason: reason.trim() || null,
      }),
    })
    setSaving(false)
    if (r.ok) { setDate(''); setStartTime(''); setEndTime(''); setReason(''); load() }
    else { const d = await r.json(); setErr(d.error ?? 'Erro ao salvar.') }
  }

  async function removeBlock(id: string) {
    await fetch(`/api/doctor-blocks?id=${id}`, { method: 'DELETE' })
    setBlocks(prev => prev.filter(b => b.id !== id))
  }

  return (
    <div style={{ marginTop: 12, paddingTop: 12, borderTop: '1px dashed var(--border)' }}>
      <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--muted)', marginBottom: 8, textTransform: 'uppercase', letterSpacing: '.04em' }}>
        🔒 Bloqueios de agenda
      </div>

      {/* Formulário de novo bloqueio */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 6, padding: 10, borderRadius: 8, background: 'var(--background)', border: '1px solid var(--border)' }}>
        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', alignItems: 'center' }}>
          <input type="date" value={date} onChange={e => setDate(e.target.value)}
            min={new Date().toISOString().split('T')[0]}
            style={{ ...inputStyle, flex: '1 1 120px' }} />
          <label style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 11, color: 'var(--foreground)', cursor: 'pointer', whiteSpace: 'nowrap' }}>
            <input type="checkbox" checked={allDay} onChange={e => setAllDay(e.target.checked)} />
            Dia inteiro
          </label>
        </div>
        {!allDay && (
          <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
            <input type="time" value={startTime} onChange={e => setStartTime(e.target.value)} style={inputStyle} title="Início do bloqueio" />
            <span style={{ fontSize: 10, color: 'var(--muted)' }}>até</span>
            <input type="time" value={endTime} onChange={e => setEndTime(e.target.value)} style={inputStyle} title="Fim do bloqueio" />
          </div>
        )}
        <div style={{ display: 'flex', gap: 6 }}>
          <input placeholder="Motivo (férias, feriado, almoço…)" value={reason} onChange={e => setReason(e.target.value)}
            style={{ ...inputStyle, flex: 1 }} onKeyDown={e => e.key === 'Enter' && addBlock()} />
          <button onClick={addBlock} disabled={saving} style={btnStyle('#F0A500')}>
            {saving ? '…' : '+ Bloquear'}
          </button>
        </div>
        {err && <span style={{ fontSize: 11, color: '#EF4444' }}>{err}</span>}
      </div>

      {/* Lista de bloqueios */}
      {loading ? (
        <div style={{ fontSize: 11, color: 'var(--muted)', marginTop: 6 }}>Carregando…</div>
      ) : blocks.length === 0 ? (
        <div style={{ fontSize: 11, color: 'var(--muted)', marginTop: 6 }}>Nenhum bloqueio cadastrado.</div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 4, marginTop: 6 }}>
          {blocks.map(b => (
            <div key={b.id} style={{
              display: 'flex', alignItems: 'center', gap: 8, padding: '5px 8px',
              borderRadius: 7, background: '#F0A50010', border: '1px solid #F0A50030',
            }}>
              <span style={{ fontSize: 18 }}>🔒</span>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--foreground)' }}>
                  {fmtDate(b.blocked_date)}
                  {b.start_time && b.end_time ? ` · ${b.start_time.slice(0,5)}–${b.end_time.slice(0,5)}` : ' · Dia inteiro'}
                </div>
                {b.reason && <div style={{ fontSize: 10, color: 'var(--muted)' }}>{b.reason}</div>}
              </div>
              <button onClick={() => removeBlock(b.id)} title="Remover bloqueio"
                style={{
                  width: 22, height: 22, borderRadius: 6, flexShrink: 0,
                  border: '1px solid #EF444440', background: '#EF444410',
                  color: '#EF4444', fontSize: 12, cursor: 'pointer',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}>✕</button>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

// ── Linha de horário ───────────────────────────────────────
function ScheduleRow({ s, onChange, onRemove }: { s: Schedule; onChange: (s: Schedule) => void; onRemove: () => void }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '6px 10px', borderRadius: 8, background: 'var(--card)', border: '1px solid var(--border)', flexWrap: 'wrap' }}>
      <span style={{ width: 32, textAlign: 'center', fontSize: 11, fontWeight: 700, padding: '2px 0', borderRadius: 6, background: '#14C38E18', color: '#14C38E', flexShrink: 0 }}>
        {DAY_NAMES[s.day_of_week]}
      </span>
      <input type="time" value={s.start_time} onChange={e => onChange({ ...s, start_time: e.target.value })} style={inputStyle} title="Início" />
      <span style={{ fontSize: 10, color: 'var(--muted)' }}>até</span>
      <input type="time" value={s.end_time} onChange={e => onChange({ ...s, end_time: e.target.value })} style={inputStyle} title="Fim" />
      <select value={s.slot_minutes} onChange={e => onChange({ ...s, slot_minutes: Number(e.target.value) })} style={{ ...inputStyle, width: 72 }} title="Duração">
        {[20, 30, 45, 60, 90].map(m => <option key={m} value={m}>{m} min</option>)}
      </select>
      <span style={{ fontSize: 10, color: 'var(--muted)', flexShrink: 0 }}>{slotsCount(s)} vagas</span>
      <button onClick={onRemove} title="Remover dia"
        style={{ marginLeft: 'auto', width: 22, height: 22, borderRadius: 6, border: '1px solid #EF444440', background: '#EF444410', color: '#EF4444', fontSize: 12, cursor: 'pointer', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>✕</button>
    </div>
  )
}

// ── Card de médico ─────────────────────────────────────────
function DoctorCard({ doc, onSaved, onDeleted }: { doc: Doctor; onSaved: () => void; onDeleted: () => void }) {
  const [schedules, setSchedules]   = useState<Schedule[]>(doc.schedules)
  const [open, setOpen]             = useState(false)
  const [tab, setTab]               = useState<'agenda' | 'bloqueios'>('agenda')
  const [saving, setSaving]         = useState(false)
  const [saved, setSaved]           = useState(false)
  const [editing, setEditing]       = useState(false)
  const [editName, setEditName]     = useState(doc.name)
  const [editSpec, setEditSpec]     = useState(doc.specialty)
  const [deleting, setDeleting]     = useState(false)
  const [deleteErr, setDeleteErr]   = useState('')

  const activeDays   = schedules.map(s => s.day_of_week)
  const inactiveDays = [0,1,2,3,4,5,6].filter(d => !activeDays.includes(d))
  const totalSlots   = schedules.reduce((acc, s) => acc + slotsCount(s), 0)

  async function saveSchedule() {
    setSaving(true)
    await fetch('/api/doctor-schedules', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ doctor_id: doc.id, schedules }),
    })
    setSaving(false); setSaved(true)
    setTimeout(() => { setSaved(false); onSaved() }, 1800)
  }

  async function saveDoctor() {
    if (!editName.trim() || !editSpec.trim()) return
    await fetch(`/api/doctors/${doc.id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: editName.trim(), specialty: editSpec.trim() }),
    })
    setEditing(false); onSaved()
  }

  async function deleteDoctor() {
    setDeleting(true); setDeleteErr('')
    const r = await fetch(`/api/doctors/${doc.id}`, { method: 'DELETE' })
    if (r.ok) { onDeleted() }
    else { const d = await r.json(); setDeleteErr(d.error ?? 'Erro ao excluir.'); setDeleting(false) }
  }

  return (
    <div style={{ borderRadius: 10, border: '1px solid var(--border)', background: 'var(--panel)', overflow: 'hidden' }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 14px' }}>
        {editing ? (
          <div style={{ flex: 1, display: 'flex', gap: 6, flexWrap: 'wrap' }}>
            <input value={editName} onChange={e => setEditName(e.target.value)}
              style={{ ...inputStyle, flex: '1 1 120px', fontSize: 12 }} placeholder="Nome" />
            <input value={editSpec} onChange={e => setEditSpec(e.target.value)}
              style={{ ...inputStyle, flex: '1 1 120px', fontSize: 12 }} placeholder="Especialidade" />
            <button onClick={saveDoctor} style={btnStyle('#14C38E')}>✓</button>
            <button onClick={() => { setEditing(false); setEditName(doc.name); setEditSpec(doc.specialty) }}
              style={{ ...btnStyle('var(--muted)'), background: 'var(--card)', color: 'var(--foreground)', border: '1px solid var(--border)' }}>✕</button>
          </div>
        ) : (
          <div onClick={() => setOpen(v => !v)} style={{ flex: 1, minWidth: 0, cursor: 'pointer' }}>
            <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--foreground)' }}>{doc.name}</div>
            <div style={{ fontSize: 10, color: 'var(--muted)', marginTop: 2 }}>{doc.specialty}</div>
          </div>
        )}

        {!editing && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 4, flexShrink: 0 }}>
            {/* Summary chips */}
            {schedules.length === 0 ? (
              <span style={{ fontSize: 9, padding: '2px 7px', borderRadius: 20, background: '#EF444412', border: '1px solid #EF444440', color: '#EF4444', fontWeight: 600 }}>Sem agenda</span>
            ) : (
              <>
                <span style={{ fontSize: 9, padding: '2px 7px', borderRadius: 20, background: '#14C38E12', border: '1px solid #14C38E40', color: '#14C38E', fontWeight: 600 }}>{schedules.length}d/sem</span>
                <span style={{ fontSize: 9, padding: '2px 7px', borderRadius: 20, background: 'var(--card)', border: '1px solid var(--border)', color: 'var(--muted)', fontWeight: 600 }}>{totalSlots} vagas/sem</span>
              </>
            )}
            <button onClick={() => setEditing(true)} title="Editar médico"
              style={{ width: 24, height: 24, borderRadius: 6, border: '1px solid var(--border)', background: 'var(--card)', color: 'var(--muted)', fontSize: 12, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>✎</button>
            <span onClick={() => setOpen(v => !v)} style={{ fontSize: 10, color: 'var(--muted)', cursor: 'pointer', transform: open ? 'rotate(0deg)' : 'rotate(-90deg)', transition: 'transform .2s', display: 'inline-block' }}>▾</span>
          </div>
        )}
      </div>

      {/* Expandido */}
      {open && !editing && (
        <div style={{ padding: '0 14px 14px', borderTop: '1px solid var(--border)' }}>
          {/* Tabs */}
          <div style={{ display: 'flex', gap: 2, paddingTop: 10, marginBottom: 10 }}>
            {(['agenda', 'bloqueios'] as const).map(t => (
              <button key={t} onClick={() => setTab(t)}
                style={{
                  fontSize: 11, fontWeight: 600, padding: '4px 12px', borderRadius: 6, border: 'none', cursor: 'pointer',
                  background: tab === t ? 'var(--green)' : 'var(--card)',
                  color: tab === t ? '#fff' : 'var(--muted)',
                }}>
                {t === 'agenda' ? '📅 Agenda semanal' : '🔒 Bloqueios'}
              </button>
            ))}
          </div>

          {/* Tab: Agenda */}
          {tab === 'agenda' && (
            <>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                {schedules.map((s, i) => (
                  <ScheduleRow key={s.day_of_week} s={s}
                    onChange={ns => setSchedules(prev => prev.map((r, idx) => idx === i ? ns : r))}
                    onRemove={() => setSchedules(prev => prev.filter((_, idx) => idx !== i))} />
                ))}
              </div>
              {inactiveDays.length > 0 && (
                <div style={{ display: 'flex', gap: 4, marginTop: 8, flexWrap: 'wrap' }}>
                  <span style={{ fontSize: 10, color: 'var(--muted)', alignSelf: 'center' }}>Adicionar:</span>
                  {inactiveDays.map(d => (
                    <button key={d} onClick={() => setSchedules(prev => [...prev, { day_of_week: d, ...DEFAULT_SCHEDULE }].sort((a, b) => a.day_of_week - b.day_of_week))}
                      style={{ fontSize: 10, fontWeight: 600, padding: '3px 8px', borderRadius: 6, border: '1px solid var(--border)', background: 'var(--card)', color: 'var(--foreground)', cursor: 'pointer' }}>
                      + {DAY_NAMES[d]}
                    </button>
                  ))}
                </div>
              )}
              <div style={{ marginTop: 10, display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
                {saved && <span style={{ fontSize: 11, color: '#14C38E', alignSelf: 'center' }}>✓ Salvo</span>}
                <button onClick={saveSchedule} disabled={saving} style={btnStyle(saved ? '#14C38E' : 'var(--green)')}>
                  {saving ? 'Salvando…' : 'Salvar agenda'}
                </button>
              </div>
            </>
          )}

          {/* Tab: Bloqueios */}
          {tab === 'bloqueios' && <BlocksSection doctorId={doc.id} />}

        </div>
      )}
    </div>
  )
}

// ── Painel principal ───────────────────────────────────────
export default function DoctorSchedulesPanel() {
  const [doctors, setDoctors] = useState<Doctor[]>([])
  const [loading, setLoading] = useState(true)

  async function load() {
    setLoading(true)
    const r = await fetch('/api/doctor-schedules')
    if (r.ok) setDoctors(await r.json())
    setLoading(false)
  }

  useEffect(() => { load() }, [])

  const withSchedule = doctors.filter(d => d.schedules.length > 0).length

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
      <NewDoctorForm onCreated={load} />

      {loading ? (
        <div style={{ padding: 20, textAlign: 'center', color: 'var(--muted)', fontSize: 12 }}>Carregando…</div>
      ) : (
        <>
          {doctors.length > 0 && (
            <div style={{ display: 'flex', gap: 8, padding: '4px 0', flexWrap: 'wrap' }}>
              <span style={{ fontSize: 11, color: 'var(--muted)' }}>
                {withSchedule}/{doctors.length} médicos com agenda configurada
              </span>
              {withSchedule < doctors.length && (
                <span style={{ fontSize: 11, color: '#F0A500', fontWeight: 600 }}>
                  ⚠ {doctors.length - withSchedule} sem agenda (fallback Seg–Sex 8h–17h)
                </span>
              )}
            </div>
          )}
          {doctors.map(doc => (
            <DoctorCard key={doc.id} doc={doc} onSaved={load} onDeleted={load} />
          ))}
          {doctors.length === 0 && (
            <div style={{ padding: 20, textAlign: 'center', color: 'var(--muted)', fontSize: 12 }}>
              Nenhum médico cadastrado. Clique em "+ Novo médico" para começar.
            </div>
          )}
        </>
      )}
    </div>
  )
}
