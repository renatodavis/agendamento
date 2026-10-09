'use client'
import { useMemo, type CSSProperties } from 'react'
import type { Appointment, AppointmentStatus } from '@/types'
import { useActiveProfile, profileHasConvenio, patientFallbackEmoji } from '@/lib/useActiveProfile'
import { ClipboardList, Check, X, Hourglass } from 'lucide-react'

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
  showConvenio: boolean
  onAttend: (id: string) => void
  onSelect: (appt: Appointment) => void
  selected: boolean
}

function AppointmentCard({ appt, isNext, showConvenio, onAttend, onSelect, selected }: CardProps) {
  const patientFallback = patientFallbackEmoji(useActiveProfile())
  const sc = S[appt.status]
  const canAttend = appt.status !== 'atendida' && appt.status !== 'cancelada'
  const isAttended = appt.status === 'atendida'
  const isCancelled = appt.status === 'cancelada'

  const vars = { '--c': sc.color, '--bg': isAttended ? `${sc.bg}99` : sc.bg } as CSSProperties
  const state = [selected && 'is-selected', isNext && 'is-next', isCancelled && 'is-cancelled'].filter(Boolean).join(' ')

  return (
    <div className={`aa-qcard ${state}`} style={vars} onClick={() => onSelect(appt)}>

      <div className="aa-qcard-time">
        <div className="aa-qcard-hour">{fmtTime(appt.scheduled_at)}</div>
        <div className="aa-qcard-status"><span>{sc.icon}</span> {sc.label}</div>
        {isNext && <div className="aa-qcard-badge">PRÓXIMO</div>}
      </div>

      <div className="aa-qcard-patient">
        <div className="aa-qcard-who">
          <span className="aa-qcard-emoji">{appt.patient?.photo_emoji ?? patientFallback}</span>
          <div style={{ minWidth: 0 }}>
            <div className="aa-qcard-name">{appt.patient?.name ?? '—'}</div>
            <div className="aa-qcard-sub">
              {appt.doctor?.name}
              <span className="aa-qcard-spec">{appt.doctor?.specialty}</span>
            </div>
          </div>
        </div>

        <div className="aa-qcard-tags">
          {showConvenio && appt.patient?.convenio && (
            <span className="aa-qcard-tag accent">{appt.patient.convenio}</span>
          )}
          {appt.type && <span className="aa-qcard-tag">{appt.type}</span>}
        </div>
      </div>

      <div className="aa-qcard-action">
        {isAttended ? (
          <div className="aa-qcard-btn soft"><Check size={14} /> Atendido</div>
        ) : isCancelled ? (
          <div className="aa-qcard-btn danger"><X size={14} /> Cancelado</div>
        ) : (
          <button className="aa-qcard-btn solid" onClick={e => { e.stopPropagation(); onAttend(appt.id) }}>
            {canAttend && appt.status === 'lista_espera'
              ? <><Hourglass size={14} /> Promover</>
              : <><Check size={14} /> Marcar atendido</>}
          </button>
        )}
      </div>
    </div>
  )
}

// ── Main export ───────────────────────────────────────────────────────────────
type Props = {
  appointments: Appointment[]
  loading: boolean
  onAttend: (id: string) => void
  selectedId: string | null
  onSelect: (appt: Appointment) => void
}

export default function AgendaQueueView({ appointments, loading, onAttend, selectedId, onSelect }: Props) {
  const profile = useActiveProfile()
  const showConvenio = profileHasConvenio(profile)

  // The "next" card: first non-attended, non-cancelled, ordered by time
  const nextId = useMemo(() => {
    const eligible = appointments.filter(
      a => a.status !== 'atendida' && a.status !== 'cancelada'
    )
    return eligible[0]?.id ?? null
  }, [appointments])

  return (
    <div style={{ display: 'flex', flexDirection: 'column', flex: 1, minHeight: 0, overflow: 'hidden' }}>
      {/* Cards scroll area */}
      <div className="aa-queue">
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
            <ClipboardList size={32} strokeWidth={1.5} style={{ color: 'var(--muted)', opacity: .5 }} />
            <p style={{ fontSize: 12, color: 'var(--muted)', textAlign: 'center' }}>
              Nenhum horário marcado neste dia.
            </p>
          </div>
        ) : (
          appointments.map(appt => (
            <AppointmentCard
              key={appt.id}
              appt={appt}
              isNext={appt.id === nextId}
              showConvenio={showConvenio}
              onAttend={onAttend}
              onSelect={onSelect}
              selected={selectedId === appt.id}
            />
          ))
        )}
      </div>

      <style>{`
        .aa-queue {
          flex: 1; min-height: 0; overflow-x: auto; overflow-y: hidden;
          padding: 16px 20px; display: flex; align-items: flex-start; gap: 12px;
          scrollbar-width: thin; scrollbar-color: var(--border) transparent;
        }
        .aa-qcard {
          position: relative; flex-shrink: 0; width: 168px; height: 214px;
          display: flex; flex-direction: column; overflow: hidden; cursor: pointer;
          border-radius: 14px; border: 2px solid color-mix(in srgb, var(--c) 35%, transparent);
          background: var(--bg); box-shadow: var(--shadow-sm);
          transition: box-shadow .15s, border-color .15s;
        }
        .aa-qcard.is-next { border-color: var(--c); box-shadow: 0 0 0 2px color-mix(in srgb, var(--c) 15%, transparent), var(--shadow-pop); }
        .aa-qcard.is-selected { border-color: var(--c); box-shadow: 0 0 0 3px color-mix(in srgb, var(--c) 20%, transparent), var(--shadow-pop); }
        .aa-qcard.is-cancelled { opacity: .55; }

        .aa-qcard-time { padding: 12px 12px 8px; border-bottom: 1px solid color-mix(in srgb, var(--c) 20%, transparent); }
        .aa-qcard-hour { font-size: 26px; font-weight: 800; line-height: 1; letter-spacing: -.02em; color: var(--c); font-variant-numeric: tabular-nums; }
        .aa-qcard-status { margin-top: 4px; display: flex; align-items: center; gap: 4px; font-size: 9px; font-weight: 700; letter-spacing: .07em; color: var(--c); }
        .aa-qcard-badge {
          position: absolute; top: 6px; right: 6px;
          font-size: 8px; font-weight: 800; letter-spacing: .06em;
          padding: 2px 6px; border-radius: 20px; background: var(--c); color: #fff;
          animation: next-pulse 2s ease-in-out infinite;
        }

        .aa-qcard-patient { padding: 10px 12px; flex: 1; min-width: 0; }
        .aa-qcard-who { display: flex; align-items: center; gap: 7px; margin-bottom: 6px; }
        .aa-qcard-emoji { font-size: 22px; line-height: 1; }
        .aa-qcard-name { font-size: 12px; font-weight: 700; line-height: 1.2; color: #111817; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
        .aa-qcard-sub { font-size: 9px; color: #55605e; margin-top: 2px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; display: flex; flex-direction: column; }
        .aa-qcard-spec { font-weight: 600; overflow: hidden; text-overflow: ellipsis; }
        .aa-qcard-tags { display: flex; gap: 4px; overflow: hidden; }
        .aa-qcard-tag {
          font-size: 8px; font-weight: 600; padding: 2px 6px; border-radius: 20px; white-space: nowrap;
          border: 1px solid #dcd9d1; color: #55605e; background: #ffffffaa;
          max-width: 100%; overflow: hidden; text-overflow: ellipsis;
        }
        .aa-qcard-tag.accent { border-color: color-mix(in srgb, var(--c) 40%, transparent); color: var(--c); background: color-mix(in srgb, var(--c) 8%, transparent); max-width: 90px; }

        .aa-qcard-action { padding: 8px 10px 10px; }
        .aa-qcard-btn {
          width: 100%; padding: 7px 0; border-radius: 8px; border: none;
          font-size: 11px; font-weight: 700; display: flex; align-items: center; justify-content: center; gap: 4px;
        }
        .aa-qcard-btn.solid { background: var(--c); color: #fff; cursor: pointer; transition: opacity .12s; }
        .aa-qcard-btn.solid:hover { opacity: .85; }
        .aa-qcard-btn.soft { background: color-mix(in srgb, var(--c) 12%, transparent); border: 1px solid color-mix(in srgb, var(--c) 30%, transparent); color: var(--c); }
        .aa-qcard-btn.danger { background: #EF444412; border: 1px solid #EF444440; color: #EF4444; }

        @media (max-width: 767px) {
          .aa-queue { flex-direction: column; align-items: stretch; overflow-x: hidden; overflow-y: auto; padding: 12px 16px 16px; gap: 10px; }
          .aa-qcard {
            width: 100%; height: auto;
            display: grid; grid-template-columns: 92px minmax(0, 1fr);
            grid-template-areas: "time patient" "time action";
          }
          .aa-qcard-time {
            grid-area: time; padding: 14px 12px; border-bottom: none;
            border-right: 1px solid color-mix(in srgb, var(--c) 20%, transparent);
            display: flex; flex-direction: column; gap: 6px;
          }
          .aa-qcard-hour { font-size: 24px; }
          .aa-qcard-status { margin-top: 0; font-size: 10px; }
          .aa-qcard-badge { position: static; align-self: flex-start; font-size: 9px; padding: 3px 8px; }
          .aa-qcard-patient { grid-area: patient; padding: 12px 14px 6px; }
          .aa-qcard-who { gap: 10px; margin-bottom: 8px; }
          .aa-qcard-emoji { font-size: 26px; }
          .aa-qcard-name { font-size: 15px; }
          .aa-qcard-sub { font-size: 12px; margin-top: 3px; }
          .aa-qcard-tags { flex-wrap: wrap; gap: 6px; }
          .aa-qcard-tag, .aa-qcard-tag.accent { font-size: 11px; padding: 3px 9px; max-width: 100%; }
          .aa-qcard-action { grid-area: action; padding: 6px 14px 14px; }
          .aa-qcard-btn { padding: 10px 0; font-size: 13px; border-radius: 10px; }
        }

        @keyframes spin { to { transform: rotate(360deg) } }
        @keyframes next-pulse {
          0%,100% { opacity: 1; transform: scale(1) }
          50%      { opacity: .75; transform: scale(.97) }
        }
      `}</style>
    </div>
  )
}
