'use client'
import { useState, useRef, useEffect, useMemo } from 'react'
import { useAppointments } from '@/lib/useAppointments'
import type { Appointment, AppointmentStatus, Doctor } from '@/types'
import ApprovalPanel, { useApprovalCount } from './ApprovalPanel'
import ClinicConfigPanel from '@/components/settings/ClinicConfigPanel'

const DOCTOR_COLORS = ['#3B9EFF', '#14C38E', '#F0A500', '#A78BFA', '#FB923C', '#F472B6', '#22D3EE', '#EF4444']

const STATUS: Record<AppointmentStatus, { color: string; label: string; icon: string; fill: boolean }> = {
  atendida:    { color: '#14C38E', label: 'Atendida',    icon: '✓', fill: true  },
  confirmada:  { color: '#3B9EFF', label: 'Confirmada',  icon: '●', fill: true  },
  pendente:    { color: '#F0A500', label: 'Pendente',    icon: '◐', fill: false },
  agendada:    { color: '#A78BFA', label: 'Agendada',    icon: '○', fill: false },
  cancelada:   { color: '#EF4444', label: 'Cancelada',   icon: '✗', fill: false },
  lista_espera:{ color: '#FB923C', label: 'Fila Espera', icon: '⏳', fill: false },
}

const CANCEL_REASONS = [
  'Paciente não compareceu',
  'Desistência do paciente',
  'Médico indisponível',
  'Conflito de agenda',
]

function getDayLabel(o: number) {
  if (o === -1) return 'Ontem'
  if (o === 0)  return 'Hoje'
  if (o === 1)  return 'Amanhã'
  const d = new Date(); d.setDate(d.getDate() + o)
  return d.toLocaleDateString('pt-BR', { weekday: 'short', day: 'numeric', month: 'short' })
}
function getDayFull(o: number) {
  const d = new Date(); d.setDate(d.getDate() + o)
  return d.toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'long' })
}
function fmtTime(iso: string) {
  return new Date(iso).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit', timeZone: 'UTC' })
}
function nowT() {
  return new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })
}

// ── Row ─────────────────────────────────────────────────────────────
function ApptRow({ appt, selected, onSelect }: { appt: Appointment; selected: boolean; onSelect: () => void }) {
  const sc = STATUS[appt.status]
  return (
    <div onClick={onSelect}
      className="flex items-center gap-2 px-3 py-1.5 border-b cursor-pointer transition-colors"
      style={{
        borderColor: 'var(--border)',
        borderLeft: `3px solid ${selected ? sc.color : 'transparent'}`,
        background: selected ? `${sc.color}0a` : 'transparent',
      }}>
      <span className="text-[11px] font-bold tabular-nums w-8 shrink-0" style={{ color: sc.color }}>
        {fmtTime(appt.scheduled_at)}
      </span>
      <span className="w-2 h-2 rounded-full shrink-0 border"
        style={{ background: sc.fill ? sc.color : 'transparent', borderColor: sc.color }} />
      <span className="text-sm shrink-0">{appt.patient?.photo_emoji ?? '👤'}</span>
      <div className="flex-1 min-w-0">
        <div className="text-[11px] font-semibold truncate">{appt.patient?.name}</div>
        <div className="text-[9px] truncate" style={{ color: 'var(--muted)' }}>
          {appt.doctor?.name} · {appt.doctor?.specialty}
        </div>
      </div>
      <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-full border shrink-0 hidden sm:inline-flex"
        style={{ color: sc.color, borderColor: sc.color, background: `${sc.color}18` }}>
        {sc.icon} {sc.label}
      </span>
    </div>
  )
}

// ── Detail ───────────────────────────────────────────────────────────
function ApptDetail({ appt, onAttend, onCancel, detailRef }: {
  appt: Appointment | null
  onAttend: (id: string) => void
  onCancel: (id: string, reason: string, cancelledBy: 'clinic' | 'patient') => void
  detailRef: React.RefObject<HTMLDivElement | null>
}) {
  const [showCancel, setShowCancel] = useState(false)
  const [cancelReason, setCancelReason] = useState('')
  const [cancelledBy, setCancelledBy] = useState<'clinic' | 'patient'>('clinic')
  useEffect(() => { setShowCancel(false); setCancelReason(''); setCancelledBy('clinic') }, [appt?.id])

  if (!appt) return (
    <div ref={detailRef} className="flex-1 flex flex-col items-center justify-center gap-2 p-4 text-center">
      <span className="text-3xl opacity-30">📋</span>
      <p className="text-xs" style={{ color: 'var(--muted)' }}>Selecione uma consulta<br />para ver detalhes.</p>
    </div>
  )

  const sc = STATUS[appt.status]
  const canAct = appt.status !== 'atendida' && appt.status !== 'cancelada' && appt.status !== 'lista_espera'
  const history = [...(appt.history ?? [])].sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime())

  return (
    <div ref={detailRef} className="flex-1 overflow-y-auto flex flex-col">
      <div className="flex items-center gap-2.5 px-3 py-2 border-b shrink-0" style={{ borderColor: 'var(--border)' }}>
        <span className="text-2xl">{appt.patient?.photo_emoji ?? '👤'}</span>
        <div className="flex-1 min-w-0">
          <div className="text-sm font-bold truncate">{appt.patient?.name}</div>
          <div className="text-[10px]" style={{ color: 'var(--muted)' }}>{appt.patient?.convenio} · {appt.type}</div>
          <span className="inline-flex items-center gap-1 text-[9px] font-bold mt-0.5 px-1.5 py-0.5 rounded-full border"
            style={{ color: sc.color, borderColor: sc.color, background: `${sc.color}18` }}>
            {sc.icon} {sc.label}
          </span>
        </div>
        <div className="text-right shrink-0">
          <div className="text-xs font-bold tabular-nums">{fmtTime(appt.scheduled_at)}</div>
          <div className="text-[9px]" style={{ color: 'var(--muted)' }}>{appt.doctor?.name}</div>
        </div>
      </div>

      {history.length > 0 && (
        <div className="px-3 py-2 border-b flex-1 overflow-y-auto" style={{ borderColor: 'var(--border)' }}>
          <div className="text-[9px] font-bold uppercase tracking-[.1em] mb-2" style={{ color: 'var(--muted)' }}>Histórico</div>
          {history.map((ev, i) => (
            <div key={i} className="flex gap-2 mb-2">
              <div className="flex flex-col items-center w-3 shrink-0">
                <span className="w-2 h-2 rounded-full border-2 shrink-0" style={{ borderColor: '#14C38E' }} />
                {i < history.length - 1 && <div className="flex-1 w-px mt-0.5" style={{ background: 'var(--border)' }} />}
              </div>
              <div className="pb-2 flex-1">
                <div className="text-[11px]">{ev.event}</div>
                <div className="text-[9px]" style={{ color: 'var(--muted)' }}>
                  {new Date(ev.created_at).toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short', timeZone: 'UTC' })}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      <div className="px-3 py-2 border-t shrink-0 flex gap-2" style={{ borderColor: 'var(--border)' }}>
        {canAct ? (
          <>
            <button onClick={() => onAttend(appt.id)}
              className="flex-1 py-1.5 text-[11px] font-semibold rounded-md border transition-all hover:text-white"
              style={{ color: 'var(--green)', borderColor: 'var(--green)', background: '#14C38E12' }}
              onMouseEnter={e => (e.currentTarget.style.background = 'var(--green)')}
              onMouseLeave={e => (e.currentTarget.style.background = '#14C38E12')}>
              ✓ Atendida
            </button>
            <button onClick={() => setShowCancel(v => !v)}
              className="flex-1 py-1.5 text-[11px] font-semibold rounded-md border transition-all"
              style={{ color: 'var(--red)', borderColor: 'var(--red)', background: '#EF444412' }}>
              ✗ Cancelar
            </button>
          </>
        ) : (
          <div className="text-[11px] text-center w-full py-1" style={{ color: 'var(--muted)' }}>
            {appt.status === 'atendida' ? '✓ Consulta já atendida'
            : appt.status === 'cancelada' ? '✗ Consulta cancelada'
            : '⏳ Paciente na fila de espera'}
          </div>
        )}
      </div>

      {showCancel && (
        <div className="px-3 py-2 border-t shrink-0" style={{ background: 'var(--card)', borderColor: 'var(--border)' }}>
          {/* Who cancelled */}
          <p className="text-[9px] font-bold uppercase tracking-wider mb-1.5" style={{ color: 'var(--muted)' }}>Cancelado por</p>
          <div className="flex gap-1.5 mb-2">
            {(['clinic', 'patient'] as const).map(v => (
              <label key={v} className="flex items-center gap-1 cursor-pointer text-[10px] px-2 py-0.5 rounded border flex-1 justify-center"
                style={{
                  borderColor: cancelledBy === v ? 'var(--red)' : 'var(--border)',
                  background: cancelledBy === v ? '#EF444410' : 'var(--panel)',
                  color: cancelledBy === v ? 'var(--red)' : 'var(--muted)',
                }}>
                <input type="radio" name="cb" value={v} checked={cancelledBy === v}
                  onChange={() => setCancelledBy(v)} className="sr-only" />
                {v === 'clinic' ? '🏥 Clínica' : '👤 Paciente'}
              </label>
            ))}
          </div>
          {/* Reason */}
          <p className="text-[9px] font-bold uppercase tracking-wider mb-1" style={{ color: 'var(--muted)' }}>Motivo</p>
          {CANCEL_REASONS.map(r => (
            <label key={r} className="flex items-center gap-2 py-1 text-xs cursor-pointer">
              <input type="radio" name="cr" value={r} checked={cancelReason === r}
                onChange={() => setCancelReason(r)} style={{ accentColor: 'var(--red)' }} />
              {r}
            </label>
          ))}
          <button disabled={!cancelReason}
            onClick={() => { if (cancelReason) { onCancel(appt.id, cancelReason, cancelledBy); setShowCancel(false) } }}
            className="w-full mt-1.5 py-1 text-xs font-semibold text-white rounded-md disabled:opacity-40"
            style={{ background: 'var(--red)' }}>
            ✗ Confirmar e Notificar Paciente
          </button>
        </div>
      )}
    </div>
  )
}

// ── Main ──────────────────────────────────────────────────────────────
export default function AgendaBottomPanel() {
  const [panelView, setPanelView]       = useState<'agenda' | 'approvals' | 'config'>('agenda')
  const [dayOffset, setDayOffset]       = useState(0)
  const [selId, setSelId]               = useState<string | null>(null)
  const [filter, setFilter]             = useState('todos')
  const [doctorFilter, setDoctorFilter] = useState<string | null>(null)
  const detailRef                       = useRef<HTMLDivElement>(null)
  const approvalCount                   = useApprovalCount()

  const { appointments, loading, error, updateStatus } = useAppointments(dayOffset)
  const selAppt = appointments.find(a => a.id === selId) ?? null

  // Reset doctor filter when day changes
  useEffect(() => { setDoctorFilter(null) }, [dayOffset])

  useEffect(() => {
    if (selId && window.innerWidth <= 768) {
      requestAnimationFrame(() => detailRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }))
    }
  }, [selId])

  // Unique doctors with stable colors
  const doctors = useMemo(() => {
    const seen = new Map<string, { doctor: Doctor; color: string }>()
    let i = 0
    appointments.forEach(a => {
      if (a.doctor && !seen.has(a.doctor.id)) {
        seen.set(a.doctor.id, { doctor: a.doctor, color: DOCTOR_COLORS[i % DOCTOR_COLORS.length] })
        i++
      }
    })
    return Array.from(seen.values())
  }, [appointments])

  const counts = useMemo(() => ({
    todos:     appointments.length,
    atendida:  appointments.filter(a => a.status === 'atendida').length,
    confirmada:appointments.filter(a => a.status === 'confirmada').length,
    pendente:  appointments.filter(a => a.status === 'pendente' || a.status === 'agendada' || a.status === 'lista_espera').length,
    cancelada: appointments.filter(a => a.status === 'cancelada').length,
  }), [appointments])

  const filtered = useMemo(() => {
    let list = filter === 'todos' ? appointments
      : filter === 'pendente' ? appointments.filter(a => a.status === 'pendente' || a.status === 'agendada')
      : appointments.filter(a => a.status === filter)
    if (doctorFilter) list = list.filter(a => a.doctor?.id === doctorFilter)
    return list
  }, [appointments, filter, doctorFilter])

  const handleAttend = async (id: string) =>
    updateStatus(id, 'atendida', { event: `Atendido — ${nowT()}`, kind: 'attend' })

  const handleCancel = async (id: string, reason: string, cancelledBy: 'clinic' | 'patient' = 'clinic') => {
    await updateStatus(id, 'cancelada', { cancelReason: reason, event: `Cancelado — ${reason}`, kind: 'cancel' })
    if (selId === id) setSelId(null)

    // Notify patient via WhatsApp
    fetch('/api/appointments/notify', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ appointmentId: id, type: 'cancel', reason, cancelledBy }),
    }).catch(err => console.error('[notify cancel] error:', err))
  }

  return (
    <div className="flex flex-col flex-1 min-h-0" style={{
      background: 'var(--panel)',
    }}>
      {/* ── Tab switcher ── */}
      <div className="flex border-b shrink-0" style={{ borderColor: 'var(--border)' }}>
        <button onClick={() => setPanelView('agenda')}
          className="flex-1 py-1.5 text-[11px] font-semibold border-b-2 transition-colors"
          style={{
            borderColor: panelView === 'agenda' ? 'var(--blue)' : 'transparent',
            color: panelView === 'agenda' ? 'var(--blue)' : 'var(--muted)',
          }}>
          📅 Agenda
        </button>
        <button onClick={() => setPanelView('approvals')}
          className="flex-1 py-1.5 text-[11px] font-semibold border-b-2 transition-colors relative"
          style={{
            borderColor: panelView === 'approvals' ? '#F0A500' : 'transparent',
            color: panelView === 'approvals' ? '#F0A500' : 'var(--muted)',
          }}>
          ✅ Aprovações
          {approvalCount > 0 && (
            <span className="absolute -top-0.5 right-3 w-4 h-4 rounded-full text-[9px] font-bold text-white flex items-center justify-center"
              style={{ background: '#F0A500' }}>
              {approvalCount}
            </span>
          )}
        </button>
        <button onClick={() => setPanelView('config')}
          className="flex-1 py-1.5 text-[11px] font-semibold border-b-2 transition-colors"
          style={{
            borderColor: panelView === 'config' ? '#A78BFA' : 'transparent',
            color: panelView === 'config' ? '#A78BFA' : 'var(--muted)',
          }}>
          ⚙️ Config
        </button>
      </div>

      {/* ── Approval panel ── */}
      {panelView === 'approvals' && (
        <div className="flex-1 min-h-0 flex flex-col">
          <ApprovalPanel />
        </div>
      )}

      {/* ── Config panel ── */}
      {panelView === 'config' && (
        <div className="flex-1 min-h-0 flex flex-col">
          <ClinicConfigPanel />
        </div>
      )}

      {/* ── Agenda panel ── */}
      {panelView === 'agenda' && <>

      {/* Header */}
      <div className="flex items-center justify-between px-4 h-[44px] border-b shrink-0 gap-3"
        style={{ borderColor: 'var(--border)' }}>
        {/* Day nav */}
        <div className="flex items-center gap-1 shrink-0">
          {/* Week back */}
          <button disabled={dayOffset <= 0} onClick={() => setDayOffset(d => Math.max(0, d - 7))}
            title="Semana anterior"
            className="w-6 h-6 flex items-center justify-center rounded border text-[10px] font-bold disabled:opacity-20 transition-colors"
            style={{ background: 'var(--card)', borderColor: 'var(--border)', color: 'var(--muted)' }}>«</button>
          {/* Day back */}
          <button disabled={dayOffset <= -1} onClick={() => setDayOffset(d => d - 1)}
            className="w-5 h-6 flex items-center justify-center rounded border text-xs disabled:opacity-30"
            style={{ background: 'var(--card)', borderColor: 'var(--border)', color: 'var(--muted)' }}>‹</button>

          <div className="font-display font-bold text-sm min-w-36 text-center leading-none select-none">
            {getDayLabel(dayOffset)}
            <span className="font-normal text-[10px] ml-1" style={{ color: 'var(--muted)' }}>
              {dayOffset > 1
                ? new Date(Date.now() + dayOffset * 86400000).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' })
                  + ' · ' + getDayFull(dayOffset).split(',')[0]
                : getDayFull(dayOffset).replace(/^\w+,\s/, '')}
            </span>
          </div>

          {/* Day forward */}
          <button disabled={dayOffset >= 30} onClick={() => setDayOffset(d => d + 1)}
            className="w-5 h-6 flex items-center justify-center rounded border text-xs disabled:opacity-30"
            style={{ background: 'var(--card)', borderColor: 'var(--border)', color: 'var(--muted)' }}>›</button>
          {/* Week forward */}
          <button disabled={dayOffset >= 30} onClick={() => setDayOffset(d => Math.min(30, d + 7))}
            title="Próxima semana"
            className="w-6 h-6 flex items-center justify-center rounded border text-[10px] font-bold disabled:opacity-20 transition-colors"
            style={{ background: 'var(--card)', borderColor: 'var(--border)', color: 'var(--muted)' }}>»</button>
        </div>

        {/* Filters */}
        <div className="flex items-center gap-1.5 overflow-x-auto">
          {([
            ['todos', 'Todos', counts.todos],
            ['atendida', 'Atend.', counts.atendida],
            ['confirmada', 'Confirm.', counts.confirmada],
            ['pendente', 'Pend.', counts.pendente],
            ['cancelada', 'Cancel.', counts.cancelada],
          ] as [string, string, number][]).map(([k, l, c]) => (
            <button key={k} onClick={() => setFilter(k)}
              className="px-2 py-0.5 rounded-full text-[10px] font-medium border whitespace-nowrap"
              style={{
                background: filter === k ? '#3B9EFF18' : 'var(--card)',
                borderColor: filter === k ? 'var(--blue)' : 'var(--border)',
                color: filter === k ? 'var(--blue)' : 'var(--muted)',
              }}>
              {l}{k !== 'todos' ? ` ${c}` : ''}
            </button>
          ))}
        </div>

        {/* Stats */}
        <div className="flex items-center gap-2 shrink-0">
          {counts.atendida > 0 && (
            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold border"
              style={{ color: '#14C38E', borderColor: '#14C38E', background: '#14C38E18' }}>
              ✓ {counts.atendida}
            </span>
          )}
          {counts.pendente > 0 && (
            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold border"
              style={{ color: '#F0A500', borderColor: '#F0A500', background: '#F0A50018' }}>
              ◐ {counts.pendente}
            </span>
          )}
          <span className="text-[10px]" style={{ color: 'var(--muted)' }}>{counts.todos} total</span>
        </div>
      </div>

      {/* ── Doctor filter row ── */}
      {doctors.length > 0 && (
        <div className="flex items-center gap-1.5 px-4 py-1.5 border-b overflow-x-auto shrink-0"
          style={{ borderColor: 'var(--border)', scrollbarWidth: 'none' }}>
          <span className="text-[9px] font-bold uppercase tracking-[.08em] shrink-0 mr-0.5"
            style={{ color: 'var(--muted)' }}>Médico</span>
          <button
            onClick={() => setDoctorFilter(null)}
            className="px-2.5 py-0.5 rounded-full text-[10px] font-medium border whitespace-nowrap shrink-0 transition-all"
            style={{
              background: !doctorFilter ? '#3B9EFF18' : 'var(--card)',
              borderColor: !doctorFilter ? 'var(--blue)' : 'var(--border)',
              color: !doctorFilter ? 'var(--blue)' : 'var(--muted)',
            }}>
            Todos
          </button>
          {doctors.map(({ doctor, color }) => (
            <button
              key={doctor.id}
              onClick={() => setDoctorFilter(f => f === doctor.id ? null : doctor.id)}
              className="flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-medium border whitespace-nowrap shrink-0 transition-all"
              style={{
                background: doctorFilter === doctor.id ? `${color}18` : 'var(--card)',
                borderColor: doctorFilter === doctor.id ? color : 'var(--border)',
                color: doctorFilter === doctor.id ? color : 'var(--muted)',
              }}>
              <span className="w-[6px] h-[6px] rounded-full shrink-0" style={{ background: color }} />
              {doctor.name}
            </button>
          ))}
        </div>
      )}

      {/* Body */}
      <div className="flex flex-1 min-h-0">
        {/* List */}
        <div className="w-[54%] overflow-y-auto border-r" style={{ borderColor: 'var(--border)' }}>
          {loading && (
            <div className="flex items-center justify-center h-16 gap-2 text-xs" style={{ color: 'var(--muted)' }}>
              <span className="w-3 h-3 border-2 rounded-full animate-spin"
                style={{ borderColor: 'var(--green)', borderTopColor: 'transparent' }} />
              Carregando…
            </div>
          )}
          {error && <div className="p-3 text-xs text-center" style={{ color: 'var(--red)' }}>Erro: {error}</div>}
          {!loading && filtered.length === 0 && (
            <div className="flex items-center justify-center h-16 text-xs italic" style={{ color: 'var(--muted)' }}>
              Nenhuma consulta para {getDayLabel(dayOffset).toLowerCase()}.
            </div>
          )}
          {!loading && filtered.map(a => (
            <ApptRow key={a.id} appt={a} selected={selId === a.id}
              onSelect={() => setSelId(prev => prev === a.id ? null : a.id)} />
          ))}
        </div>

        {/* Detail */}
        <div className="flex-1 overflow-y-auto" style={{ background: 'var(--panel)' }}>
          <ApptDetail appt={selAppt} onAttend={handleAttend} onCancel={handleCancel} detailRef={detailRef} />
        </div>
      </div>

      </>} {/* end agenda panel */}
    </div>
  )
}
