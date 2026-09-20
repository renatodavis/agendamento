'use client'
import { useMemo } from 'react'
import type { Appointment, AppointmentStatus } from '@/types'

// ── Status config ─────────────────────────────────────────────────────────────
const S: Record<AppointmentStatus, { color: string; bg: string; label: string; icon: string }> = {
  atendida:    { color: '#14C38E', bg: '#E6FBF4', label: 'ATENDIDA',    icon: '✓' },
  confirmada:  { color: '#3B9EFF', bg: '#EAF4FF', label: 'CONFIRMADA',  icon: '●' },
  pendente:    { color: '#F0A500', bg: '#FFF8E6', label: 'PENDENTE',    icon: '◐' },
  agendada:    { color: '#A78BFA', bg: '#F4EEFF', label: 'AGENDADA',    icon: '○' },
  cancelada:   { color: '#EF4444', bg: '#FEE9E9', label: 'CANCELADA',   icon: '✗' },
  lista_espera:{ color: '#FB923C', bg: '#FFF0E6', label: 'FILA ESPERA', icon: '⏳' },
}

function fmtTime(iso: string) {
  return new Date(iso).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit', timeZone: 'UTC' })
}

// ── Single card ───────────────────────────────────────────────────────────────
type CardProps = {
  appt: Appointment
  isNext: boolean
  onAttend: (id: string) => void
  onSelect: (appt: Appointment) => void
  selected: boolean
}

function AppointmentCard({ appt, isNext, onAttend, onSelect, selected }: CardProps) {
  const sc = S[appt.status]
  const canAttend = appt.status !== 'atendida' && appt.status !== 'cancelada'
  const isAttended = appt.status === 'atendida'
  const isCancelled = appt.status === 'cancelada'

  return (
    <div
      onClick={() => onSelect(appt)}
      style={{
        width: 168,
        flexShrink: 0,
        borderRadius: 14,
        border: `2px solid ${selected ? sc.color : isNext ? sc.color : `${sc.color}55`}`,
        background: selected ? sc.bg : isAttended ? `${sc.bg}99` : sc.bg,
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
        cursor: 'pointer',
        transition: 'box-shadow .15s, border-color .15s',
        boxShadow: selected
          ? `0 0 0 3px ${sc.color}30, var(--shadow-md)`
          : isNext
          ? `0 0 0 2px ${sc.color}25, var(--shadow-md)`
          : 'var(--shadow-sm)',
        opacity: isCancelled ? 0.55 : 1,
        position: 'relative',
      }}>

      {/* "Próximo" badge */}
      {isNext && (
        <div style={{
          position: 'absolute', top: 6, right: 6,
          fontSize: 8, fontWeight: 800, letterSpacing: '.06em',
          padding: '2px 6px', borderRadius: 20,
          background: sc.color, color: '#fff',
          animation: 'next-pulse 2s ease-in-out infinite',
        }}>
          PRÓXIMO
        </div>
      )}

      {/* Time + status */}
      <div style={{ padding: '12px 12px 8px', borderBottom: `1px solid ${sc.color}30` }}>
        <div style={{
          fontSize: 26, fontWeight: 800, lineHeight: 1, letterSpacing: '-.02em',
          color: sc.color, fontVariantNumeric: 'tabular-nums',
        }}>
          {fmtTime(appt.scheduled_at)}
        </div>
        <div style={{
          marginTop: 4, display: 'flex', alignItems: 'center', gap: 4,
          fontSize: 9, fontWeight: 700, letterSpacing: '.07em', color: sc.color,
        }}>
          <span>{sc.icon}</span> {sc.label}
        </div>
      </div>

      {/* Patient */}
      <div style={{ padding: '10px 12px', flex: 1 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 7, marginBottom: 6 }}>
          <span style={{ fontSize: 22, lineHeight: 1 }}>{appt.patient?.photo_emoji ?? '👤'}</span>
          <div style={{ minWidth: 0 }}>
            <div style={{
              fontSize: 12, fontWeight: 700, lineHeight: 1.2,
              color: 'var(--foreground)', whiteSpace: 'nowrap',
              overflow: 'hidden', textOverflow: 'ellipsis',
            }}>
              {appt.patient?.name ?? '—'}
            </div>
            <div style={{ fontSize: 9, color: 'var(--muted)', marginTop: 2 }}>
              {appt.doctor?.name}
            </div>
            <div style={{ fontSize: 9, color: 'var(--muted)', fontWeight: 600 }}>
              {appt.doctor?.specialty}
            </div>
          </div>
        </div>

        {/* Tags: convenio + type */}
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 3 }}>
          {appt.patient?.convenio && (
            <span style={{
              fontSize: 8, fontWeight: 600, padding: '2px 6px',
              borderRadius: 20, border: `1px solid ${sc.color}60`,
              color: sc.color, background: `${sc.color}12`,
              whiteSpace: 'nowrap', maxWidth: 90, overflow: 'hidden', textOverflow: 'ellipsis',
            }}>
              {appt.patient.convenio}
            </span>
          )}
          {appt.type && (
            <span style={{
              fontSize: 8, fontWeight: 600, padding: '2px 6px',
              borderRadius: 20, border: '1px solid var(--border)',
              color: 'var(--muted)', background: 'var(--card)',
              whiteSpace: 'nowrap',
            }}>
              {appt.type}
            </span>
          )}
        </div>
      </div>

      {/* Action button */}
      <div style={{ padding: '8px 10px 10px' }}>
        {isAttended ? (
          <div style={{
            width: '100%', padding: '7px 0', borderRadius: 8,
            background: `${sc.color}20`, border: `1px solid ${sc.color}50`,
            fontSize: 10, fontWeight: 700, textAlign: 'center', color: sc.color,
          }}>
            ✓ Atendida
          </div>
        ) : isCancelled ? (
          <div style={{
            width: '100%', padding: '7px 0', borderRadius: 8,
            background: '#EF444412', border: '1px solid #EF444440',
            fontSize: 10, fontWeight: 700, textAlign: 'center', color: '#EF4444',
          }}>
            ✗ Cancelada
          </div>
        ) : (
          <button
            onClick={e => { e.stopPropagation(); onAttend(appt.id) }}
            style={{
              width: '100%', padding: '7px 0', borderRadius: 8,
              background: sc.color, border: 'none',
              fontSize: 10, fontWeight: 700, color: '#fff',
              cursor: 'pointer', transition: 'opacity .12s',
            }}
            onMouseEnter={e => (e.currentTarget.style.opacity = '.85')}
            onMouseLeave={e => (e.currentTarget.style.opacity = '1')}>
            {canAttend && appt.status === 'lista_espera' ? '⏳ Promover' : '✓ Marcar Atendida'}
          </button>
        )}
      </div>
    </div>
  )
}

// ── Queue header ──────────────────────────────────────────────────────────────
type QueueHeaderProps = {
  dayOffset: number
  appointments: Appointment[]
  onDayChange: (n: number) => void
  onSwitchView: () => void
  selectedId: string | null
}

function QueueHeader({ dayOffset, appointments, onDayChange, onSwitchView, selectedId }: QueueHeaderProps) {
  const attended = appointments.filter(a => a.status === 'atendida').length
  const total    = appointments.filter(a => a.status !== 'cancelada').length

  const dayLabel = () => {
    if (dayOffset === -1) return 'Ontem'
    if (dayOffset === 0)  return 'Agenda de Hoje'
    if (dayOffset === 1)  return 'Amanhã'
    const d = new Date(); d.setDate(d.getDate() + dayOffset)
    return d.toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'long' })
  }
  const dateStr = () => {
    const d = new Date(); d.setDate(d.getDate() + dayOffset)
    return d.toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'long' })
  }

  return (
    <div style={{
      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      padding: '10px 16px', borderBottom: '1px solid var(--border)',
      background: 'var(--panel)', flexShrink: 0, gap: 12,
    }}>
      {/* Title + date + counter */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, minWidth: 0 }}>
        <div style={{ minWidth: 0 }}>
          <div style={{
            fontSize: 11, fontWeight: 800, letterSpacing: '.08em',
            color: 'var(--foreground)', textTransform: 'uppercase',
            whiteSpace: 'nowrap',
          }}>
            {dayLabel()}
          </div>
          {dayOffset === 0 && (
            <div style={{ fontSize: 10, color: 'var(--muted)', marginTop: 1, whiteSpace: 'nowrap' }}>
              {dateStr()}
            </div>
          )}
        </div>
        {total > 0 && (
          <div style={{
            flexShrink: 0, fontSize: 10, fontWeight: 600,
            padding: '3px 10px', borderRadius: 20,
            background: '#14C38E18', border: '1px solid #14C38E40',
            color: '#14C38E', whiteSpace: 'nowrap',
          }}>
            {attended}/{total} atendidas
          </div>
        )}
      </div>

      {/* Controls */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexShrink: 0 }}>
        {/* Day nav */}
        <div style={{ display: 'flex', gap: 2 }}>
          {[
            { label: '«', step: -7, title: 'Semana anterior' },
            { label: '‹', step: -1, title: 'Dia anterior' },
            { label: '›', step: 1,  title: 'Próximo dia' },
            { label: '»', step: 7,  title: 'Próxima semana' },
          ].map(({ label, step, title }) => (
            <button key={label}
              disabled={(step < 0 && dayOffset <= (step === -7 ? 6 : 0)) || (step > 0 && dayOffset >= 30)}
              onClick={() => onDayChange(dayOffset + step)}
              title={title}
              style={{
                width: 24, height: 24, borderRadius: 6, border: '1px solid var(--border)',
                background: 'var(--card)', color: 'var(--muted)',
                fontSize: 11, fontWeight: 600, cursor: 'pointer',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                opacity: ((step < 0 && dayOffset <= 0) || (step > 0 && dayOffset >= 30)) ? .3 : 1,
              }}>
              {label}
            </button>
          ))}
        </div>

        {/* View toggle */}
        <button
          onClick={onSwitchView}
          title="Alternar para visualização em lista"
          style={{
            padding: '4px 10px', borderRadius: 7,
            border: '1px solid var(--border)',
            background: 'var(--card)', color: 'var(--muted)',
            fontSize: 10, fontWeight: 600, cursor: 'pointer',
            display: 'flex', alignItems: 'center', gap: 4,
          }}>
          ☰ Lista
        </button>
      </div>
    </div>
  )
}

// ── Main export ───────────────────────────────────────────────────────────────
type Props = {
  appointments: Appointment[]
  loading: boolean
  dayOffset: number
  onDayChange: (n: number) => void
  onAttend: (id: string) => void
  onSwitchView: () => void
  selectedId: string | null
  onSelect: (appt: Appointment) => void
}

export default function AgendaQueueView({
  appointments, loading, dayOffset, onDayChange,
  onAttend, onSwitchView, selectedId, onSelect,
}: Props) {
  // The "next" card: first non-attended, non-cancelled, ordered by time
  const nextId = useMemo(() => {
    const eligible = appointments.filter(
      a => a.status !== 'atendida' && a.status !== 'cancelada'
    )
    return eligible[0]?.id ?? null
  }, [appointments])

  return (
    <div style={{ display: 'flex', flexDirection: 'column', flex: 1, minHeight: 0, overflow: 'hidden' }}>
      <QueueHeader
        dayOffset={dayOffset}
        appointments={appointments}
        onDayChange={onDayChange}
        onSwitchView={onSwitchView}
        selectedId={selectedId}
      />

      {/* Cards scroll area */}
      <div style={{
        flex: 1,
        overflowX: 'auto',
        overflowY: 'hidden',
        padding: '16px 20px',
        display: 'flex',
        alignItems: 'flex-start',
        gap: 12,
        scrollbarWidth: 'thin',
        scrollbarColor: 'var(--border) transparent',
      }}>
        {loading ? (
          <div style={{
            flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center',
            gap: 8, color: 'var(--muted)', fontSize: 12,
          }}>
            <span style={{
              width: 14, height: 14, borderRadius: '50%',
              border: '2px solid var(--green)', borderTopColor: 'transparent',
              animation: 'spin .7s linear infinite',
              display: 'inline-block',
            }} />
            Carregando agenda…
          </div>
        ) : appointments.length === 0 ? (
          <div style={{
            flex: 1, display: 'flex', flexDirection: 'column',
            alignItems: 'center', justifyContent: 'center', gap: 8,
          }}>
            <span style={{ fontSize: 32, opacity: .2 }}>📋</span>
            <p style={{ fontSize: 12, color: 'var(--muted)', textAlign: 'center' }}>
              Nenhuma consulta para este dia.
            </p>
          </div>
        ) : (
          appointments.map(appt => (
            <AppointmentCard
              key={appt.id}
              appt={appt}
              isNext={appt.id === nextId}
              onAttend={onAttend}
              onSelect={onSelect}
              selected={selectedId === appt.id}
            />
          ))
        )}
      </div>

      <style>{`
        @keyframes spin { to { transform: rotate(360deg) } }
        @keyframes next-pulse {
          0%,100% { opacity: 1; transform: scale(1) }
          50%      { opacity: .75; transform: scale(.97) }
        }
      `}</style>
    </div>
  )
}
