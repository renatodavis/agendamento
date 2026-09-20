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

function timeToMin(t: string) {
  const [h, m] = t.split(':').map(Number)
  return h * 60 + m
}

function slotsCount(s: Schedule) {
  return Math.floor((timeToMin(s.end_time) - timeToMin(s.start_time)) / s.slot_minutes)
}

function ScheduleRow({ s, onChange, onRemove }: {
  s: Schedule
  onChange: (s: Schedule) => void
  onRemove: () => void
}) {
  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: 8, padding: '6px 10px',
      borderRadius: 8, background: 'var(--card)', border: '1px solid var(--border)',
      flexWrap: 'wrap',
    }}>
      {/* Day badge */}
      <span style={{
        width: 32, textAlign: 'center', fontSize: 11, fontWeight: 700,
        padding: '2px 0', borderRadius: 6,
        background: '#14C38E18', color: '#14C38E', flexShrink: 0,
      }}>
        {DAY_NAMES[s.day_of_week]}
      </span>

      {/* Start */}
      <input type="time" value={s.start_time}
        onChange={e => onChange({ ...s, start_time: e.target.value })}
        style={inputStyle} title="Início" />
      <span style={{ fontSize: 10, color: 'var(--muted)' }}>até</span>
      <input type="time" value={s.end_time}
        onChange={e => onChange({ ...s, end_time: e.target.value })}
        style={inputStyle} title="Fim" />

      {/* Slot */}
      <select value={s.slot_minutes}
        onChange={e => onChange({ ...s, slot_minutes: Number(e.target.value) })}
        style={{ ...inputStyle, width: 72 }} title="Duração da consulta">
        {[20, 30, 45, 60, 90].map(m => (
          <option key={m} value={m}>{m} min</option>
        ))}
      </select>

      {/* Slots count */}
      <span style={{ fontSize: 10, color: 'var(--muted)', flexShrink: 0 }}>
        {slotsCount(s)} vagas
      </span>

      <button onClick={onRemove} title="Remover dia"
        style={{
          marginLeft: 'auto', width: 22, height: 22, borderRadius: 6,
          border: '1px solid #EF444440', background: '#EF444410',
          color: '#EF4444', fontSize: 12, cursor: 'pointer', flexShrink: 0,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>✕</button>
    </div>
  )
}

const inputStyle: React.CSSProperties = {
  fontSize: 11, padding: '4px 6px', borderRadius: 6,
  border: '1px solid var(--border)', background: 'var(--background)',
  color: 'var(--foreground)', outline: 'none',
}

function DoctorCard({ doc, onSaved }: { doc: Doctor; onSaved: () => void }) {
  const [schedules, setSchedules] = useState<Schedule[]>(doc.schedules)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [open, setOpen] = useState(false)

  const activeDays = schedules.map(s => s.day_of_week)
  const inactiveDays = [0,1,2,3,4,5,6].filter(d => !activeDays.includes(d))

  function addDay(day: number) {
    setSchedules(prev => [...prev, { day_of_week: day, ...DEFAULT_SCHEDULE }]
      .sort((a, b) => a.day_of_week - b.day_of_week))
  }

  function updateRow(idx: number, s: Schedule) {
    setSchedules(prev => prev.map((r, i) => i === idx ? s : r))
  }

  function removeRow(idx: number) {
    setSchedules(prev => prev.filter((_, i) => i !== idx))
  }

  async function save() {
    setSaving(true)
    await fetch('/api/doctor-schedules', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ doctor_id: doc.id, schedules }),
    })
    setSaving(false)
    setSaved(true)
    setTimeout(() => { setSaved(false); onSaved() }, 1800)
  }

  const totalSlots = schedules.reduce((acc, s) => acc + slotsCount(s), 0)

  return (
    <div style={{
      borderRadius: 10, border: '1px solid var(--border)',
      background: 'var(--panel)', overflow: 'hidden',
    }}>
      {/* Card header */}
      <div
        onClick={() => setOpen(v => !v)}
        style={{
          display: 'flex', alignItems: 'center', gap: 10, padding: '10px 14px',
          cursor: 'pointer', userSelect: 'none',
        }}>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--foreground)' }}>
            {doc.name}
          </div>
          <div style={{ fontSize: 10, color: 'var(--muted)', marginTop: 2 }}>
            {doc.specialty}
          </div>
        </div>

        {/* Summary chips */}
        <div style={{ display: 'flex', gap: 4, flexShrink: 0 }}>
          {schedules.length === 0 ? (
            <span style={{ fontSize: 9, padding: '2px 7px', borderRadius: 20,
              background: '#EF444412', border: '1px solid #EF444440', color: '#EF4444', fontWeight: 600 }}>
              Sem agenda
            </span>
          ) : (
            <>
              <span style={{ fontSize: 9, padding: '2px 7px', borderRadius: 20,
                background: '#14C38E12', border: '1px solid #14C38E40', color: '#14C38E', fontWeight: 600 }}>
                {schedules.length}d/sem
              </span>
              <span style={{ fontSize: 9, padding: '2px 7px', borderRadius: 20,
                background: 'var(--card)', border: '1px solid var(--border)', color: 'var(--muted)', fontWeight: 600 }}>
                {totalSlots} vagas/sem
              </span>
            </>
          )}
        </div>

        <span style={{
          fontSize: 10, color: 'var(--muted)',
          transform: open ? 'rotate(0deg)' : 'rotate(-90deg)',
          transition: 'transform .2s', display: 'inline-block',
        }}>▾</span>
      </div>

      {/* Expanded editor */}
      {open && (
        <div style={{ padding: '0 14px 14px', borderTop: '1px solid var(--border)' }}>
          <div style={{ paddingTop: 10, display: 'flex', flexDirection: 'column', gap: 6 }}>
            {schedules.map((s, i) => (
              <ScheduleRow key={s.day_of_week} s={s}
                onChange={ns => updateRow(i, ns)}
                onRemove={() => removeRow(i)} />
            ))}
          </div>

          {/* Add day buttons */}
          {inactiveDays.length > 0 && (
            <div style={{ display: 'flex', gap: 4, marginTop: 8, flexWrap: 'wrap' }}>
              <span style={{ fontSize: 10, color: 'var(--muted)', alignSelf: 'center' }}>Adicionar:</span>
              {inactiveDays.map(d => (
                <button key={d} onClick={() => addDay(d)}
                  style={{
                    fontSize: 10, fontWeight: 600, padding: '3px 8px', borderRadius: 6,
                    border: '1px solid var(--border)', background: 'var(--card)',
                    color: 'var(--foreground)', cursor: 'pointer',
                  }}>
                  + {DAY_NAMES[d]}
                </button>
              ))}
            </div>
          )}

          {/* Save button */}
          <div style={{ marginTop: 10, display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
            {saved && (
              <span style={{ fontSize: 11, color: '#14C38E', alignSelf: 'center' }}>✓ Salvo</span>
            )}
            <button onClick={save} disabled={saving}
              style={{
                fontSize: 11, fontWeight: 600, padding: '6px 14px', borderRadius: 8,
                background: saved ? '#14C38E' : 'var(--green)',
                border: 'none', color: '#fff', cursor: saving ? 'wait' : 'pointer',
                opacity: saving ? .7 : 1,
              }}>
              {saving ? 'Salvando…' : 'Salvar agenda'}
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

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

  if (loading) {
    return (
      <div style={{ padding: 20, textAlign: 'center', color: 'var(--muted)', fontSize: 12 }}>
        Carregando agendas…
      </div>
    )
  }

  if (!doctors.length) {
    return (
      <div style={{ padding: 20, textAlign: 'center', color: 'var(--muted)', fontSize: 12 }}>
        Nenhum médico cadastrado.
      </div>
    )
  }

  const withSchedule = doctors.filter(d => d.schedules.length > 0).length

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
      {/* Summary */}
      <div style={{
        display: 'flex', gap: 8, padding: '8px 0', flexWrap: 'wrap',
      }}>
        <span style={{ fontSize: 11, color: 'var(--muted)' }}>
          {withSchedule}/{doctors.length} médicos com agenda configurada
        </span>
        {withSchedule < doctors.length && (
          <span style={{ fontSize: 11, color: '#F0A500', fontWeight: 600 }}>
            ⚠ {doctors.length - withSchedule} sem agenda (usando fallback Seg–Sex 8h–17h)
          </span>
        )}
      </div>

      {/* Doctor cards */}
      {doctors.map(doc => (
        <DoctorCard key={doc.id} doc={doc} onSaved={load} />
      ))}
    </div>
  )
}
