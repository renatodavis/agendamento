'use client'
import { useState, useRef, useEffect, useMemo } from 'react'
import { useAppointments } from '@/lib/useAppointments'
import type { Appointment, AppointmentStatus, Doctor } from '@/types'
import ApprovalPanel from './ApprovalPanel'
import ClinicConfigPanel from '@/components/settings/ClinicConfigPanel'
import DoctorSchedulesPanel from '@/components/settings/DoctorSchedulesPanel'
import ContactsPanel from '@/components/contacts/ContactsPanel'
import AgendaQueueView from './AgendaQueueView'

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
function ApptRow({ appt, selected, compact, onSelect, onAttend }: {
  appt: Appointment; selected: boolean; compact?: boolean
  onSelect: () => void; onAttend: (id: string) => void
}) {
  const sc = STATUS[appt.status]
  const canAct = appt.status !== 'atendida' && appt.status !== 'cancelada'
  return (
    <div onClick={onSelect}
      className="flex items-center gap-3 border-b cursor-pointer transition-colors"
      style={{
        minHeight: compact ? 52 : 60,
        padding: compact ? '0 12px' : '0 16px',
        borderColor: 'var(--border)',
        borderLeft: `4px solid ${selected ? sc.color : 'transparent'}`,
        background: selected ? `${sc.color}0d` : 'transparent',
      }}>
      {/* Time + status */}
      <div className="shrink-0" style={{ width: compact ? 40 : 48 }}>
        <div className="font-black tabular-nums leading-none"
          style={{ fontSize: compact ? 13 : 15, color: sc.color }}>
          {fmtTime(appt.scheduled_at)}
        </div>
        <div className="mt-0.5 font-semibold uppercase tracking-wide"
          style={{ fontSize: 8, color: sc.color, opacity: .75 }}>
          {sc.icon} {sc.label.split(' ')[0]}
        </div>
      </div>

      {/* Emoji */}
      {!compact && <span className="text-[22px] leading-none shrink-0">{appt.patient?.photo_emoji ?? '👤'}</span>}

      {/* Info */}
      <div className="flex-1 min-w-0">
        <div className="font-semibold leading-snug truncate"
          style={{ fontSize: compact ? 12 : 13, color: 'var(--foreground)' }}>
          {compact && (appt.patient?.photo_emoji ?? '👤') + ' '}{appt.patient?.name}
        </div>
        <div className="truncate mt-px" style={{ fontSize: 10, color: 'var(--muted)' }}>
          {compact ? appt.doctor?.name : `${appt.doctor?.name}${appt.doctor?.specialty ? ' · ' + appt.doctor.specialty : ''}`}
        </div>
        {!compact && appt.patient?.convenio && (
          <span className="inline-flex mt-1 font-medium px-1.5 py-px rounded border"
            style={{ fontSize: 10, color: sc.color, borderColor: `${sc.color}60`, background: `${sc.color}10` }}>
            {appt.patient.convenio}
          </span>
        )}
      </div>

      {/* Quick attend */}
      {canAct ? (
        <button
          onClick={e => { e.stopPropagation(); onAttend(appt.id) }}
          title="Marcar como atendida"
          className="shrink-0 flex items-center justify-center rounded-full border-2 font-bold transition-all"
          style={{
            width: compact ? 28 : 32, height: compact ? 28 : 32,
            fontSize: compact ? 11 : 13,
            borderColor: '#14C38E', color: '#14C38E', background: 'transparent',
          }}
          onMouseEnter={e => { e.currentTarget.style.background = '#14C38E'; e.currentTarget.style.color = '#fff' }}
          onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = '#14C38E' }}>
          ✓
        </button>
      ) : appt.status === 'atendida' ? (
        <span className="shrink-0 flex items-center justify-center rounded-full font-bold"
          style={{
            width: compact ? 28 : 32, height: compact ? 28 : 32,
            fontSize: compact ? 11 : 13,
            background: '#14C38E20', color: '#14C38E',
          }}>✓</span>
      ) : null}
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
export default function AgendaBottomPanel({ approvalCount = 0 }: { approvalCount?: number }) {
  const [panelView, setPanelView]       = useState<'agenda' | 'approvals' | 'config' | 'schedules' | 'contacts'>('agenda')
  const [agendaView, setAgendaView]     = useState<'list' | 'queue'>('list')
  const [dayOffset, setDayOffset]       = useState(0)
  const [selId, setSelId]               = useState<string | null>(null)
  const [filter, setFilter]             = useState('todos')
  const [doctorFilter, setDoctorFilter] = useState<string | null>(null)
  const detailRef                       = useRef<HTMLDivElement>(null)

  const { appointments, loading, error, updateStatus } = useAppointments(dayOffset)
  const selAppt = appointments.find(a => a.id === selId) ?? null

  // Reset doctor filter when day changes
  useEffect(() => { setDoctorFilter(null) }, [dayOffset])

  // Swipe to change day (mobile)
  const touchStartX = useRef<number | null>(null)
  const swipeHandlers = {
    onTouchStart: (e: React.TouchEvent) => { touchStartX.current = e.touches[0].clientX },
    onTouchEnd:   (e: React.TouchEvent) => {
      if (touchStartX.current === null) return
      const delta = e.changedTouches[0].clientX - touchStartX.current
      touchStartX.current = null
      if (Math.abs(delta) < 50) return
      if (delta < 0) setDayOffset(d => Math.min(30, d + 1))   // swipe left → próximo dia
      if (delta > 0) setDayOffset(d => Math.max(-1, d - 1))   // swipe right → dia anterior
    },
  }

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
      <div className="flex border-b shrink-0" style={{ borderColor: 'var(--border)', overflowX: 'auto', scrollbarWidth: 'none' }}>
        <button onClick={() => setPanelView('agenda')}
          className="flex-none py-1.5 px-3 text-[11px] font-semibold border-b-2 transition-colors whitespace-nowrap"
          style={{
            borderColor: panelView === 'agenda' ? 'var(--blue)' : 'transparent',
            color: panelView === 'agenda' ? 'var(--blue)' : 'var(--muted)',
          }}>
          📅 Agenda
        </button>
        <button onClick={() => setPanelView('approvals')}
          className="flex-none py-1.5 px-3 text-[11px] font-semibold border-b-2 transition-colors whitespace-nowrap"
          style={{
            borderColor: panelView === 'approvals' ? '#F0A500' : 'transparent',
            color: panelView === 'approvals' ? '#F0A500' : 'var(--muted)',
          }}>
          <span className="inline-flex items-center justify-center gap-1">
            ✅ Aprovações
            {approvalCount > 0 && (
              <span className="inline-flex items-center justify-center min-w-[16px] h-4 px-1 rounded-full text-[9px] font-bold text-white leading-none"
                style={{ background: '#F0A500' }}>
                {approvalCount}
              </span>
            )}
          </span>
        </button>
        <button onClick={() => setPanelView('config')}
          className="flex-none py-1.5 px-3 text-[11px] font-semibold border-b-2 transition-colors whitespace-nowrap"
          style={{
            borderColor: panelView === 'config' ? '#A78BFA' : 'transparent',
            color: panelView === 'config' ? '#A78BFA' : 'var(--muted)',
          }}>
          ⚙️ Config
        </button>
        <button onClick={() => setPanelView('schedules')}
          className="flex-none py-1.5 px-3 text-[11px] font-semibold border-b-2 transition-colors whitespace-nowrap"
          style={{
            borderColor: panelView === 'schedules' ? '#3B9EFF' : 'transparent',
            color: panelView === 'schedules' ? '#3B9EFF' : 'var(--muted)',
          }}>
          🗓 Agendas
        </button>
        <button onClick={() => setPanelView('contacts')}
          className="flex-none py-1.5 px-3 text-[11px] font-semibold border-b-2 transition-colors whitespace-nowrap"
          style={{
            borderColor: panelView === 'contacts' ? '#22D3EE' : 'transparent',
            color: panelView === 'contacts' ? '#22D3EE' : 'var(--muted)',
          }}>
          👥 Contatos
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
        <div className="flex-1 min-h-0 overflow-y-auto">
          <ClinicConfigPanel />
        </div>
      )}

      {/* ── Schedules panel ── */}
      {panelView === 'schedules' && (
        <div className="flex-1 min-h-0 overflow-y-auto p-4">
          <DoctorSchedulesPanel />
        </div>
      )}

      {/* ── Contacts panel ── */}
      {panelView === 'contacts' && (
        <div className="flex-1 min-h-0 flex flex-col">
          <ContactsPanel />
        </div>
      )}

      {/* ── Agenda panel ── */}
      {panelView === 'agenda' && <>

      {/* Header */}
      <div className="flex items-center gap-3 px-4 border-b shrink-0"
        style={{ borderColor: 'var(--border)', minHeight: 52 }}>
        {/* Day nav */}
        <div className="flex items-center gap-1 shrink-0">
          <button disabled={dayOffset <= 0} onClick={() => setDayOffset(d => Math.max(0, d - 7))}
            title="Semana anterior"
            className="w-7 h-7 flex items-center justify-center rounded-lg border text-[11px] font-bold disabled:opacity-20 transition-colors"
            style={{ background: 'var(--card)', borderColor: 'var(--border)', color: 'var(--muted)' }}>«</button>
          <button disabled={dayOffset <= -1} onClick={() => setDayOffset(d => d - 1)}
            className="w-6 h-7 flex items-center justify-center rounded-lg border text-sm disabled:opacity-30"
            style={{ background: 'var(--card)', borderColor: 'var(--border)', color: 'var(--muted)' }}>‹</button>

          <div className="font-display font-bold text-[15px] px-2 text-center leading-tight select-none" style={{ minWidth: 140 }}>
            {getDayLabel(dayOffset)}
            <div className="font-normal text-[11px] mt-px" style={{ color: 'var(--muted)' }}>
              {dayOffset > 1
                ? getDayFull(dayOffset)
                : getDayFull(dayOffset).replace(/^\w+,\s/, '')}
            </div>
          </div>

          <button disabled={dayOffset >= 30} onClick={() => setDayOffset(d => d + 1)}
            className="w-6 h-7 flex items-center justify-center rounded-lg border text-sm disabled:opacity-30"
            style={{ background: 'var(--card)', borderColor: 'var(--border)', color: 'var(--muted)' }}>›</button>
          <button disabled={dayOffset >= 30} onClick={() => setDayOffset(d => Math.min(30, d + 7))}
            title="Próxima semana"
            className="w-7 h-7 flex items-center justify-center rounded-lg border text-[11px] font-bold disabled:opacity-20 transition-colors"
            style={{ background: 'var(--card)', borderColor: 'var(--border)', color: 'var(--muted)' }}>»</button>
        </div>

        {/* Filters */}
        <div className="flex items-center gap-1.5 overflow-x-auto flex-1" style={{ scrollbarWidth: 'none' }}>
          {([
            ['todos', 'Todos', counts.todos],
            ['atendida', 'Atendida', counts.atendida],
            ['confirmada', 'Confirmada', counts.confirmada],
            ['pendente', 'Pendente', counts.pendente],
            ['cancelada', 'Cancelada', counts.cancelada],
          ] as [string, string, number][]).map(([k, l, c]) => (
            <button key={k} onClick={() => setFilter(k)}
              className="px-3 py-1 rounded-full text-[11px] font-semibold border whitespace-nowrap transition-all"
              style={{
                background: filter === k ? '#3B9EFF18' : 'var(--card)',
                borderColor: filter === k ? 'var(--blue)' : 'var(--border)',
                color: filter === k ? 'var(--blue)' : 'var(--muted)',
              }}>
              {l}{k !== 'todos' && c > 0 ? ` · ${c}` : ''}
            </button>
          ))}
        </div>

        {/* Stats + view toggle */}
        <div className="flex items-center gap-2 shrink-0">
          <span className="text-[11px] font-medium" style={{ color: 'var(--muted)' }}>
            {counts.atendida}/{counts.todos}
          </span>
          <button
            onClick={() => setAgendaView(v => v === 'list' ? 'queue' : 'list')}
            title={agendaView === 'list' ? 'Ver fila de atendimento' : 'Ver lista'}
            className="px-3 py-1 rounded-full text-[11px] font-bold border transition-all"
            style={{
              color: agendaView === 'queue' ? '#14C38E' : 'var(--muted)',
              borderColor: agendaView === 'queue' ? '#14C38E' : 'var(--border)',
              background: agendaView === 'queue' ? '#14C38E18' : 'var(--card)',
            }}>
            {agendaView === 'list' ? '🎫 Fila' : '☰ Lista'}
          </button>
        </div>
      </div>

      {/* ── Doctor filter row ── */}
      {doctors.length > 0 && (
        <div className="flex items-center gap-2 px-4 py-2 border-b overflow-x-auto shrink-0"
          style={{ borderColor: 'var(--border)', scrollbarWidth: 'none' }}>
          <span className="text-[10px] font-bold uppercase tracking-[.07em] shrink-0"
            style={{ color: 'var(--muted)' }}>Médico</span>
          <button
            onClick={() => setDoctorFilter(null)}
            className="px-3 py-1 rounded-full text-[11px] font-semibold border whitespace-nowrap shrink-0 transition-all"
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
              className="flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-semibold border whitespace-nowrap shrink-0 transition-all"
              style={{
                background: doctorFilter === doctor.id ? `${color}18` : 'var(--card)',
                borderColor: doctorFilter === doctor.id ? color : 'var(--border)',
                color: doctorFilter === doctor.id ? color : 'var(--muted)',
              }}>
              <span className="w-2 h-2 rounded-full shrink-0" style={{ background: color }} />
              {doctor.name}
            </button>
          ))}
        </div>
      )}

      {/* Body — queue view */}
      {agendaView === 'queue' && (
        <AgendaQueueView
          appointments={filtered}
          loading={loading}
          dayOffset={dayOffset}
          onDayChange={setDayOffset}
          onAttend={handleAttend}
          onSwitchView={() => setAgendaView('list')}
          selectedId={selId}
          onSelect={a => setSelId(prev => prev === a.id ? null : a.id)}
        />
      )}

      {/* Body — list view */}
      {agendaView === 'list' && (
      <div className="flex flex-1 min-h-0">
        {/* List — full width when nothing selected, 44% when detail open. Swipe left/right to change day (mobile) */}
        <div
          className="overflow-y-auto"
          style={{
            width: selAppt ? '44%' : '100%',
            transition: 'width 0.2s ease',
            borderRight: selAppt ? '1px solid var(--border)' : 'none',
            flexShrink: 0,
          }}
          {...swipeHandlers}>
          {loading && (
            <div className="flex items-center justify-center h-20 gap-2 text-sm" style={{ color: 'var(--muted)' }}>
              <span className="w-4 h-4 border-2 rounded-full animate-spin"
                style={{ borderColor: 'var(--green)', borderTopColor: 'transparent' }} />
              Carregando agenda…
            </div>
          )}
          {error && <div className="p-4 text-sm text-center" style={{ color: 'var(--red)' }}>Erro: {error}</div>}
          {!loading && filtered.length === 0 && (
            <div className="flex flex-col items-center justify-center gap-2 py-12 text-sm" style={{ color: 'var(--muted)' }}>
              <span style={{ fontSize: 28, opacity: .2 }}>📋</span>
              Nenhuma consulta para {getDayLabel(dayOffset).toLowerCase()}.
            </div>
          )}
          {!loading && filtered.map(a => (
            <ApptRow key={a.id} appt={a} selected={selId === a.id}
              compact={!!selAppt}
              onSelect={() => setSelId(prev => prev === a.id ? null : a.id)}
              onAttend={handleAttend} />
          ))}
        </div>

        {/* Detail — only when selected */}
        {selAppt && (
          <div className="flex-1 overflow-y-auto" style={{ background: 'var(--panel)' }}>
            <ApptDetail appt={selAppt} onAttend={handleAttend} onCancel={handleCancel} detailRef={detailRef} />
          </div>
        )}
      </div>
      )}

      </>} {/* end agenda panel */}
    </div>
  )
}
