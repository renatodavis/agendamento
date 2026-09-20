'use client'
import { useState, useRef, useEffect, useMemo } from 'react'
import { useAppointments } from '@/lib/useAppointments'
import type { Appointment, AppointmentStatus, HistoryKind } from '@/types'
import ChatPanel from '@/components/chat/ChatPanel'

// ── Status config ─────────────────────────────────────────────────────
const STATUS: Record<AppointmentStatus, { color: string; label: string; icon: string; fill: boolean }> = {
  atendida:    { color: '#14C38E', label: 'Atendida',    icon: '✓', fill: true  },
  confirmada:  { color: '#3B9EFF', label: 'Confirmada',  icon: '●', fill: true  },
  pendente:    { color: '#F0A500', label: 'Pendente',    icon: '◐', fill: false },
  agendada:    { color: '#A78BFA', label: 'Agendada',    icon: '○', fill: false },
  cancelada:   { color: '#EF4444', label: 'Cancelada',   icon: '✗', fill: false },
  lista_espera:{ color: '#FB923C', label: 'Fila Espera', icon: '⏳', fill: false },
}

const HISTORY_COLOR: Record<string, string> = {
  schedule:   '#A78BFA',
  confirm:    '#3B9EFF',
  attend:     '#14C38E',
  cancel:     '#EF4444',
  reschedule: '#F0A500',
}

const CANCEL_REASONS = [
  'Paciente não compareceu',
  'Desistência do paciente',
  'Médico indisponível',
  'Conflito de agenda',
  'Exames não realizados',
]

function getDayLabel(offset: number) {
  if (offset === -1) return 'Ontem'
  if (offset === 0)  return 'Hoje'
  if (offset === 1)  return 'Amanhã'
  const d = new Date(); d.setDate(d.getDate() + offset)
  return d.toLocaleDateString('pt-BR', { weekday: 'short', day: 'numeric', month: 'short' })
}
function getDayFull(offset: number) {
  const d = new Date(); d.setDate(d.getDate() + offset)
  return d.toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'long' })
}
function getDayDate(offset: number) {
  const d = new Date(); d.setDate(d.getDate() + offset)
  return d.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' })
}
function fmtTime(iso: string) {
  return new Date(iso).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit', timeZone: 'UTC' })
}
function nowT() {
  return new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })
}

// ── Appointment row ───────────────────────────────────────────────────
function ApptRow({ appt, selected, onSelect }: {
  appt: Appointment; selected: boolean; onSelect: () => void
}) {
  const sc = STATUS[appt.status]
  const name = appt.patient?.name ?? '—'
  const doctor = appt.doctor?.name ?? '—'
  const specialty = appt.doctor?.specialty ?? '—'

  return (
    <div
      onClick={onSelect}
      className="flex items-center gap-2 px-3 py-2 border-b cursor-pointer transition-colors"
      style={{
        borderColor: 'var(--border)',
        borderLeft: `3px solid ${selected ? sc.color : 'transparent'}`,
        background: selected ? `${sc.color}0a` : 'transparent',
      }}
    >
      <span className="text-xs font-bold tabular-nums w-9 shrink-0" style={{ color: sc.color }}>
        {fmtTime(appt.scheduled_at)}
      </span>
      <span className="w-2 h-2 rounded-full shrink-0 border"
        style={{ background: sc.fill ? sc.color : 'transparent', borderColor: sc.color }} />
      <span className="text-base shrink-0">{appt.patient?.photo_emoji ?? '👤'}</span>
      <div className="flex-1 min-w-0">
        <div className="text-xs font-semibold truncate" style={{ color: 'var(--foreground)' }}>{name}</div>
        <div className="text-[10px] truncate" style={{ color: 'var(--muted)' }}>{doctor} · {specialty}</div>
      </div>
      <span className="text-[9px] font-bold px-2 py-0.5 rounded-full border shrink-0"
        style={{ color: sc.color, borderColor: sc.color, background: `${sc.color}18` }}>
        {sc.icon} {sc.label}
      </span>
      <span className="text-xs shrink-0 hidden sm:block" style={{ color: selected ? sc.color : 'var(--muted)' }}>
        {selected ? '↓' : '›'}
      </span>
    </div>
  )
}

// ── Appointment detail ────────────────────────────────────────────────
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
    <div ref={detailRef} className="flex-1 flex flex-col items-center justify-center gap-3 p-6 text-center">
      <span className="text-4xl opacity-30">📋</span>
      <p className="text-xs leading-relaxed" style={{ color: 'var(--muted)' }}>
        Selecione uma consulta<br />para ver detalhes e ações.
      </p>
    </div>
  )

  const sc = STATUS[appt.status]
  const isDone = appt.status === 'atendida'
  const isCancelled = appt.status === 'cancelada'
  const isWaitlist = appt.status === 'lista_espera'
  const canAct = !isDone && !isCancelled && !isWaitlist
  const history = [...(appt.history ?? [])].sort(
    (a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
  )

  return (
    <div ref={detailRef} className="flex-1 overflow-y-auto flex flex-col">
      {/* Patient */}
      <div className="flex items-center gap-3 px-4 py-3 border-b" style={{ borderColor: 'var(--border)' }}>
        <span className="text-3xl shrink-0">{appt.patient?.photo_emoji ?? '👤'}</span>
        <div className="min-w-0 flex-1">
          <div className="text-sm font-bold">{appt.patient?.name}</div>
          <div className="text-[10px] mt-0.5" style={{ color: 'var(--muted)' }}>
            {appt.patient?.convenio} · {appt.type}
          </div>
          <span className="inline-flex items-center gap-1 text-[10px] font-bold mt-1 px-2 py-0.5 rounded-full border"
            style={{ color: sc.color, borderColor: sc.color, background: `${sc.color}18` }}>
            {sc.icon} {sc.label}
            {appt.cancel_reason && <span className="font-normal opacity-80"> — {appt.cancel_reason}</span>}
          </span>
        </div>
      </div>

      {/* Appt info */}
      <div className="px-4 py-2.5 border-b flex flex-col gap-1.5" style={{ borderColor: 'var(--border)' }}>
        <div className="flex items-center gap-2 text-xs">
          <span className="w-4 text-center">🕑</span>
          <span>{fmtTime(appt.scheduled_at)}</span>
          <span className="ml-2 text-[10px]" style={{ color: 'var(--muted)' }}>{appt.doctor?.specialty}</span>
        </div>
        <div className="flex items-center gap-2 text-xs">
          <span className="w-4 text-center">👨‍⚕️</span>
          <span>{appt.doctor?.name}</span>
          <span className="ml-2 text-[10px]" style={{ color: 'var(--muted)' }}>{appt.doctor?.crm}</span>
        </div>
      </div>

      {/* History timeline */}
      <div className="px-4 py-3 flex-1">
        <div className="text-[9px] font-bold uppercase tracking-widest mb-3" style={{ color: 'var(--muted)' }}>
          Histórico
        </div>
        {history.map((ev, i) => (
          <div key={ev.id} className="flex gap-2.5 mb-1">
            <div className="flex flex-col items-center w-3.5 shrink-0">
              <div className="w-2.5 h-2.5 rounded-full border-2 shrink-0"
                style={{ borderColor: HISTORY_COLOR[ev.kind] ?? 'var(--muted)', background: `${HISTORY_COLOR[ev.kind]}30` }} />
              {i < history.length - 1 && <div className="flex-1 w-px mt-0.5" style={{ background: 'var(--border)', minHeight: 12 }} />}
            </div>
            <div className="flex-1 pb-3">
              <div className="text-xs leading-snug" style={{ color: HISTORY_COLOR[ev.kind] ?? 'var(--foreground)' }}>
                {ev.event}
              </div>
              <div className="text-[9px] mt-0.5" style={{ color: 'var(--muted)' }}>
                {new Date(ev.created_at).toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short', timeZone: 'UTC' })}
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Actions */}
      <div className="px-4 py-3 border-t flex flex-col gap-2 shrink-0" style={{ borderColor: 'var(--border)' }}>
        <div className="text-[9px] font-bold uppercase tracking-widest" style={{ color: 'var(--muted)' }}>Ações</div>
        {isDone && <p className="text-xs text-center py-2" style={{ color: 'var(--green)' }}>✓ Consulta já atendida</p>}
        {isCancelled && <p className="text-xs text-center py-2" style={{ color: 'var(--red)' }}>✗ Consulta cancelada</p>}
        {isWaitlist && <p className="text-xs text-center py-2" style={{ color: '#FB923C' }}>⏳ Paciente na fila de espera</p>}
        {canAct && (
          <>
            <button onClick={() => onAttend(appt.id)}
              className="w-full py-1.5 rounded-lg text-xs font-semibold border transition-all hover:opacity-90"
              style={{ background: '#14C38E18', borderColor: 'var(--green)', color: 'var(--green)' }}>
              ✓ Marcar Atendida
            </button>
            <button onClick={() => setShowCancel(v => !v)}
              className="w-full py-1.5 rounded-lg text-xs font-semibold border transition-all hover:opacity-90"
              style={{ background: '#EF444410', borderColor: 'var(--red)', color: 'var(--red)' }}>
              ✗ Cancelar
            </button>
          </>
        )}

        {showCancel && (
          <div className="rounded-lg p-3 border" style={{ background: 'var(--card)', borderColor: 'var(--border)' }}>
            {/* Who cancelled */}
            <p className="text-[10px] font-bold uppercase tracking-wider mb-1.5" style={{ color: 'var(--muted)' }}>
              Cancelado por
            </p>
            <div className="flex gap-2 mb-3">
              {(['clinic', 'patient'] as const).map(v => (
                <label key={v} className="flex items-center gap-1.5 cursor-pointer text-xs px-2.5 py-1 rounded-lg border flex-1 justify-center"
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
            <p className="text-[10px] font-bold uppercase tracking-wider mb-1.5" style={{ color: 'var(--muted)' }}>
              Motivo do cancelamento
            </p>
            {CANCEL_REASONS.map(r => (
              <label key={r} className="flex items-center gap-2 py-1.5 px-2 rounded cursor-pointer text-xs hover:bg-border/50">
                <input type="radio" name="cr" value={r} checked={cancelReason === r}
                  onChange={() => setCancelReason(r)}
                  style={{ accentColor: 'var(--red)' }} />
                {r}
              </label>
            ))}

            <button disabled={!cancelReason}
              onClick={() => { if (cancelReason) { onCancel(appt.id, cancelReason, cancelledBy); setShowCancel(false) } }}
              className="w-full mt-2 py-1.5 text-xs font-semibold text-white rounded-lg disabled:opacity-40"
              style={{ background: 'var(--red)' }}>
              ✗ Confirmar e Notificar Paciente
            </button>
            <button onClick={() => setShowCancel(false)}
              className="w-full mt-1 text-[10px] text-center cursor-pointer"
              style={{ color: 'var(--muted)' }}>
              Voltar
            </button>
          </div>
        )}
      </div>
    </div>
  )
}

// ── Main dashboard ────────────────────────────────────────────────────
export default function AgendaDashboard() {
  const [dayOffset, setDayOffset] = useState(0)
  const [selId, setSelId]         = useState<string | null>(null)
  const [filter, setFilter]       = useState<string>('todos')
  const [activeTab, setActiveTab] = useState<'agenda' | 'chat'>('agenda')
  const detailRef                 = useRef<HTMLDivElement>(null)

  const { appointments, loading, error, updateStatus } = useAppointments(dayOffset)

  const selAppt = appointments.find(a => a.id === selId) ?? null

  // Auto-scroll to detail on mobile when selection changes
  useEffect(() => {
    if (selId && window.innerWidth <= 768) {
      requestAnimationFrame(() =>
        detailRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })
      )
    }
  }, [selId])

  const counts = useMemo(() => ({
    todos:     appointments.length,
    atendida:  appointments.filter(a => a.status === 'atendida').length,
    confirmada:appointments.filter(a => a.status === 'confirmada').length,
    pendente:  appointments.filter(a => a.status === 'pendente' || a.status === 'agendada' || a.status === 'lista_espera').length,
    cancelada: appointments.filter(a => a.status === 'cancelada').length,
  }), [appointments])

  const filtered = filter === 'todos' ? appointments
    : filter === 'pendente' ? appointments.filter(a => a.status === 'pendente' || a.status === 'agendada')
    : appointments.filter(a => a.status === filter)

  const handleAttend = async (id: string) => {
    await updateStatus(id, 'atendida', { event: `Atendido — ${nowT()}`, kind: 'attend' })
  }
  const handleCancel = async (id: string, reason: string, cancelledBy: 'clinic' | 'patient' = 'clinic') => {
    await updateStatus(id, 'cancelada', {
      cancelReason: reason,
      event: `Cancelado — ${reason}`,
      kind: 'cancel',
    })
    if (selId === id) setSelId(null)

    // Send WhatsApp notification to patient
    fetch('/api/appointments/notify', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ appointmentId: id, type: 'cancel', reason, cancelledBy }),
    }).catch(err => console.error('[notify cancel] error:', err))
  }

  return (
    <div className="flex flex-col h-screen overflow-hidden" style={{ background: 'var(--background)' }}>

      {/* Header */}
      <header className="flex items-center justify-between px-4 h-14 shrink-0 border-b"
        style={{ background: 'var(--panel)', borderColor: 'var(--border)' }}>
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg flex items-center justify-center text-base"
            style={{ background: 'var(--green)' }}>🏥</div>
          <div>
            <div className="font-display font-bold text-sm leading-none">Clínica São Lucas</div>
            <div className="text-[10px] mt-0.5" style={{ color: 'var(--muted)' }}>
              Agenda · Supabase conectado ✓
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {/* Tab switcher */}
          <div className="flex items-center rounded-lg border overflow-hidden"
            style={{ borderColor: 'var(--border)' }}>
            {(['agenda', 'chat'] as const).map(tab => (
              <button key={tab} onClick={() => setActiveTab(tab)}
                className="px-3 py-1 text-[10px] font-semibold transition-colors"
                style={{
                  background: activeTab === tab ? 'var(--blue)' : 'var(--card)',
                  color: activeTab === tab ? '#fff' : 'var(--muted)',
                }}>
                {tab === 'agenda' ? '📅 Agenda' : '🤖 Chat IA'}
              </button>
            ))}
          </div>
          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-semibold border"
            style={{ background: '#14C38E18', borderColor: '#14C38E40', color: 'var(--green)' }}>
            <span className="w-1.5 h-1.5 rounded-full animate-pulse" style={{ background: 'var(--green)' }} />
            Online
          </div>
        </div>
      </header>

      {/* Chat tab */}
      {activeTab === 'chat' && (
        <div className="flex-1 min-h-0 overflow-hidden flex flex-col">
          <ChatPanel />
        </div>
      )}

      {/* Agenda panel */}
      <div className={`flex flex-col flex-1 min-h-0 ${activeTab !== 'agenda' ? 'hidden' : ''}`}>

        {/* Agenda header */}
        <div className="flex items-center justify-between px-4 h-11 border-b shrink-0 gap-3"
          style={{ background: 'var(--panel)', borderColor: 'var(--border)' }}>

          {/* Day navigation */}
          <div className="flex items-center gap-1 shrink-0">
            {/* Week back */}
            <button disabled={dayOffset <= 0} onClick={() => setDayOffset(d => Math.max(0, d - 7))}
              title="Semana anterior"
              className="w-6 h-6 flex items-center justify-center rounded border text-[10px] font-bold disabled:opacity-20 transition-colors"
              style={{ background: 'var(--card)', borderColor: 'var(--border)', color: 'var(--muted)' }}>«</button>
            {/* Day back */}
            <button disabled={dayOffset <= -1} onClick={() => setDayOffset(d => d - 1)}
              className="w-5 h-6 flex items-center justify-center rounded border text-xs transition-colors disabled:opacity-30"
              style={{ background: 'var(--card)', borderColor: 'var(--border)', color: 'var(--muted)' }}>‹</button>

            <div className="font-display font-bold text-sm min-w-36 text-center leading-none select-none">
              {getDayLabel(dayOffset)}
              <span className="font-normal text-[10px] ml-1" style={{ color: 'var(--muted)' }}>
                {dayOffset > 1
                  ? getDayDate(dayOffset) + ' · ' + getDayFull(dayOffset).split(',')[0]
                  : getDayFull(dayOffset).replace(/^\w+,\s/, '')}
              </span>
            </div>

            {/* Day forward */}
            <button disabled={dayOffset >= 30} onClick={() => setDayOffset(d => d + 1)}
              className="w-5 h-6 flex items-center justify-center rounded border text-xs transition-colors disabled:opacity-30"
              style={{ background: 'var(--card)', borderColor: 'var(--border)', color: 'var(--muted)' }}>›</button>
            {/* Week forward */}
            <button disabled={dayOffset >= 30} onClick={() => setDayOffset(d => Math.min(30, d + 7))}
              title="Próxima semana"
              className="w-6 h-6 flex items-center justify-center rounded border text-[10px] font-bold disabled:opacity-20 transition-colors"
              style={{ background: 'var(--card)', borderColor: 'var(--border)', color: 'var(--muted)' }}>»</button>
          </div>

          {/* Stats + filters */}
          <div className="flex items-center gap-2">
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

        {/* Filter bar */}
        <div className="flex items-center gap-1.5 px-4 py-2 border-b overflow-x-auto shrink-0"
          style={{ background: 'var(--panel)', borderColor: 'var(--border)' }}>
          {([
            ['todos', 'Todos', counts.todos],
            ['atendida', 'Atendidas', counts.atendida],
            ['confirmada', 'Confirmadas', counts.confirmada],
            ['pendente', 'Pendentes', counts.pendente],
            ['cancelada', 'Canceladas', counts.cancelada],
          ] as [string, string, number][]).map(([k, l, c]) => (
            <button key={k} onClick={() => setFilter(k)}
              className="px-3 py-1 rounded-xl text-[10px] font-medium border whitespace-nowrap transition-all"
              style={{
                background: filter === k ? '#3B9EFF18' : 'var(--card)',
                borderColor: filter === k ? 'var(--blue)' : 'var(--border)',
                color: filter === k ? 'var(--blue)' : 'var(--muted)',
              }}>
              {l}{k !== 'todos' && ` ${c}`}
            </button>
          ))}
        </div>

        {/* Body: list + detail */}
        <div className="flex flex-1 min-h-0">

          {/* List */}
          <div className="w-full md:w-[54%] overflow-y-auto border-r"
            style={{ borderColor: 'var(--border)', background: 'var(--panel)' }}>
            {loading && (
              <div className="flex items-center justify-center h-24 gap-2 text-xs"
                style={{ color: 'var(--muted)' }}>
                <span className="w-4 h-4 border-2 rounded-full animate-spin"
                  style={{ borderColor: 'var(--green)', borderTopColor: 'transparent' }} />
                Carregando…
              </div>
            )}
            {error && (
              <div className="p-4 text-xs text-center" style={{ color: 'var(--red)' }}>
                Erro: {error}
              </div>
            )}
            {!loading && !error && filtered.length === 0 && (
              <div className="flex items-center justify-center h-24 text-xs italic"
                style={{ color: 'var(--muted)' }}>
                Nenhuma consulta para {getDayLabel(dayOffset).toLowerCase()}.
              </div>
            )}
            {!loading && filtered.map(a => (
              <ApptRow key={a.id} appt={a} selected={selId === a.id}
                onSelect={() => setSelId(prev => prev === a.id ? null : a.id)} />
            ))}
          </div>

          {/* Detail */}
          <div className="hidden md:flex flex-col flex-1 min-h-0" style={{ background: 'var(--panel)' }}>
            <ApptDetail appt={selAppt} onAttend={handleAttend} onCancel={handleCancel} detailRef={detailRef} />
          </div>
        </div>

        {/* Mobile detail (below list) */}
        <div className="md:hidden border-t" style={{ borderColor: 'var(--border)', background: 'var(--panel)' }}>
          <ApptDetail appt={selAppt} onAttend={handleAttend} onCancel={handleCancel} detailRef={detailRef} />
        </div>
      </div>
    </div>
  )
}
