'use client'
import { useState, useEffect, useCallback, useRef } from 'react'
import { createClient } from '@supabase/supabase-js'
import { useVocabulary } from '@/lib/useActiveProfile'
import { Bell } from 'lucide-react'

// Supabase client — usado APENAS para Realtime (dispara re-fetch via API).
// A leitura de dados vai para /api/approval (service role, bypassa RLS).
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

type RequestType = 'disponibilidade' | 'cancelamento' | 'atendente' | 'alteracao_horario' | 'reagendamento_forcado'

type ApptDetails = {
  appointment_id?: string
  scheduled_at?: string
  new_scheduled_at?: string
  suggested_new_at?: string
  doctor_name?: string
  doctor_specialty?: string
  appointment_status?: string
  block_reason?: string
}

type ApprovalRequest = {
  id: string
  request_type: RequestType
  patient_name: string | null
  suggested_at: string | null
  message_to_patient: string | null
  message_to_receptionist: string | null
  details: ApptDetails | null
  status: string
  created_at: string
  patient_phone: string | null
  doctor: { name: string; specialty: string } | null
}

const TYPE_CONFIG: Record<RequestType, {
  label: string
  icon: string
  color: string
  bg: string
  border: string
}> = {
  disponibilidade: {
    label: 'Sugestão de horário',
    icon: '📅',
    color: '#F0A500',
    bg: '#F0A50018',
    border: '#F0A500',
  },
  cancelamento: {
    label: 'Cancelamento',
    icon: '🚫',
    color: '#EF4444',
    bg: '#EF444412',
    border: '#EF4444',
  },
  atendente: {
    label: 'Falar com atendente',
    icon: '📞',
    color: '#3B82F6',
    bg: '#3B82F612',
    border: '#3B82F6',
  },
  alteracao_horario: {
    label: 'Alteração de horário',
    icon: '🗓',
    color: '#8B5CF6',
    bg: '#8B5CF612',
    border: '#8B5CF6',
  },
  reagendamento_forcado: {
    label: 'Cancelamento por bloqueio',
    icon: '⚠️',
    color: '#F97316',
    bg: '#F9731612',
    border: '#F97316',
  },
}

function fmtSlot(iso: string) {
  const d = new Date(iso)
  return {
    date: d.toLocaleDateString('pt-BR', { weekday: 'long', day: '2-digit', month: '2-digit', year: 'numeric', timeZone: 'UTC' }),
    time: d.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit', timeZone: 'UTC' }),
  }
}

type Toast = { id: number; name: string; label: string }

function playAlert() {
  try {
    const ctx = new AudioContext()
    const osc = ctx.createOscillator()
    const gain = ctx.createGain()
    osc.connect(gain); gain.connect(ctx.destination)
    osc.type = 'sine'
    osc.frequency.setValueAtTime(880, ctx.currentTime)
    osc.frequency.exponentialRampToValueAtTime(660, ctx.currentTime + 0.15)
    gain.gain.setValueAtTime(0.18, ctx.currentTime)
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.4)
    osc.start(); osc.stop(ctx.currentTime + 0.4)
  } catch { /* sem suporte — silencioso */ }
}

export default function ApprovalPanel() {
  const [requests, setRequests] = useState<ApprovalRequest[]>([])
  const [busy, setBusy]         = useState<Record<string, boolean>>({})
  const [noNotify, setNoNotify] = useState<Record<string, boolean>>({})
  const [toasts, setToasts]     = useState<Toast[]>([])
  const toastId = useRef(0)
  const voc = useVocabulary()

  function pushToast(name: string, label: string) {
    const id = ++toastId.current
    setToasts(prev => [...prev, { id, name, label }])
    setTimeout(() => setToasts(prev => prev.filter(t => t.id !== id)), 5000)
  }

  function notify(name: string, label: string) {
    playAlert()
    pushToast(name, label)
    if (typeof window !== 'undefined' && 'Notification' in window && Notification.permission === 'granted') {
      new Notification('Nova solicitação', { body: `${name} — ${label}`, icon: '/favicon.ico' })
    }
  }

  const load = useCallback(async () => {
    try {
      const res = await fetch('/api/approval')
      if (!res.ok) return
      const data: ApprovalRequest[] = await res.json()
      setRequests(
        data.map(r => ({
          ...r,
          request_type: (r.request_type ?? 'disponibilidade') as RequestType,
          doctor: r.doctor as unknown as { name: string; specialty: string } | null,
        }))
      )
    } catch {
      // silencioso — não quebrar a UI
    }
  }, [])

  useEffect(() => {
    // Pedir permissão para notificações do sistema
    if (typeof window !== 'undefined' && 'Notification' in window && Notification.permission === 'default') {
      Notification.requestPermission()
    }

    load()

    // Polling fallback: atualiza a cada 20s mesmo sem Realtime
    const poll = setInterval(load, 20_000)

    // Realtime: re-fetch em qualquer mudança; alerta apenas em INSERT
    const ch = supabase
      .channel('approval-panel')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'approval_requests' },
        (payload) => {
          const r = payload.new as ApprovalRequest
          const cfg = TYPE_CONFIG[(r.request_type ?? 'disponibilidade') as RequestType] ?? TYPE_CONFIG.disponibilidade
          notify(r.patient_name ?? 'Cliente', cfg.label)
          load()
        })
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'approval_requests' }, () => load())
      .on('postgres_changes', { event: 'DELETE', schema: 'public', table: 'approval_requests' }, () => load())
      .subscribe()
    return () => { clearInterval(poll); supabase.removeChannel(ch) }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [load])

  async function act(id: string, action: string, body?: Record<string, unknown>) {
    setBusy(p => ({ ...p, [id]: true }))
    try {
      await fetch('/api/approval', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, action, notify: !noNotify[id], ...body }),
      })
      setRequests(prev => prev.filter(r => r.id !== id))
      // Notifica o badge imediatamente sem esperar Realtime/polling
      window.dispatchEvent(new CustomEvent('approval-resolved'))
    } finally {
      setBusy(p => ({ ...p, [id]: false }))
    }
  }

  const toastStack = toasts.length > 0 && (
    <div style={{
      position: 'fixed', bottom: 24, right: 24, zIndex: 9999,
      display: 'flex', flexDirection: 'column', gap: 8, alignItems: 'flex-end',
      pointerEvents: 'none',
    }}>
      {toasts.map(t => (
        <div key={t.id} style={{
          display: 'flex', alignItems: 'center', gap: 8,
          background: 'var(--card)', border: '1px solid #25D36660',
          borderRadius: 12, padding: '10px 14px', boxShadow: 'var(--shadow-md)',
          animation: 'toast-in .25s ease',
          minWidth: 220, maxWidth: 300,
        }}>
          <Bell size={14} style={{ color: '#25D366', flexShrink: 0 }} />
          <div>
            <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--foreground)' }}>{t.name}</div>
            <div style={{ fontSize: 10, color: 'var(--muted)' }}>{t.label}</div>
          </div>
        </div>
      ))}
    </div>
  )

  if (requests.length === 0) {
    return (
      <>
        {toastStack}
        <div className="flex-1 flex flex-col items-center justify-center gap-2 p-6 text-center">
          <span className="text-3xl opacity-20">✅</span>
          <p className="text-xs leading-relaxed" style={{ color: 'var(--muted)' }}>
            Nenhuma aprovação pendente.<br />
            Solicitações do bot aparecem aqui.
          </p>
        </div>
      </>
    )
  }

  return (
    <>
    {toastStack}
    <div className="flex-1 overflow-y-auto p-2 flex flex-col gap-2"
      style={{ scrollbarWidth: 'thin', scrollbarColor: 'var(--border) transparent' }}>
      {requests.map(req => {
        const cfg = TYPE_CONFIG[req.request_type] ?? TYPE_CONFIG.disponibilidade
        const isLoading = busy[req.id]

        return (
          <div key={req.id} className="rounded-lg border flex flex-col gap-2 overflow-hidden"
            style={{ background: 'var(--card)', borderColor: cfg.border }}>

            {/* Header */}
            <div className="px-3 pt-2.5 pb-0 flex items-center justify-between gap-2">
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-1.5">
                  {req.patient_phone ? (
                    <a
                      href={`https://wa.me/${req.patient_phone.replace(/\D/g, '')}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      title={`Abrir conversa WhatsApp com ${req.patient_name ?? voc.client}`}
                      className="text-[12px] font-bold leading-tight truncate transition-opacity hover:opacity-75"
                      style={{ color: '#25D366', textDecoration: 'none' }}
                    >
                      {req.patient_name ?? voc.Client}
                    </a>
                  ) : (
                    <div className="text-[12px] font-bold leading-tight truncate">
                      {req.patient_name ?? voc.Client}
                    </div>
                  )}
                </div>
                {req.doctor && (
                  <div className="text-[10px]" style={{ color: 'var(--muted)' }}>
                    {req.doctor.name} · {req.doctor.specialty}
                  </div>
                )}
              </div>
              <span className="text-[8px] px-1.5 py-0.5 rounded-full font-bold border shrink-0"
                style={{ color: cfg.color, borderColor: cfg.border, background: cfg.bg }}>
                {cfg.icon} {cfg.label}
              </span>
            </div>

            {/* Appointment details */}
            {(() => {
              const slotIso    = req.request_type === 'disponibilidade' ? req.suggested_at : req.details?.scheduled_at ?? null
              const newSlotIso = req.request_type === 'alteracao_horario'
                ? (req.details?.new_scheduled_at ?? null)
                : req.request_type === 'reagendamento_forcado'
                  ? (req.details?.suggested_new_at ?? null)
                  : null
              const doctorName = req.doctor?.name ?? req.details?.doctor_name
              const doctorSpec = req.doctor?.specialty ?? req.details?.doctor_specialty
              if (!slotIso && !newSlotIso && !doctorName) return null
              const old_ = slotIso ? fmtSlot(slotIso) : null
              const new_ = newSlotIso ? fmtSlot(newSlotIso) : null
              return (
                <div className="mx-3 px-2.5 py-2 rounded-md flex flex-col gap-1"
                  style={{ background: 'var(--panel)' }}>
                  {old_ && (
                    <div className="flex items-center gap-2">
                      <span className="text-base">{new_ ? '🕐' : '📅'}</span>
                      <div>
                        <div className="text-[11px] font-semibold" style={{ color: new_ ? 'var(--muted)' : undefined }}>
                          {new_ ? <s>{old_.date} às {old_.time}</s> : `${old_.date} às ${old_.time}`}
                        </div>
                        {doctorName && !new_ && (
                          <div className="text-[10px]" style={{ color: 'var(--muted)' }}>
                            {doctorName}{doctorSpec ? ` · ${doctorSpec}` : ''}
                          </div>
                        )}
                        {req.request_type === 'disponibilidade' && (
                          <div className="text-[9px]" style={{ color: 'var(--muted)' }}>horário sugerido pelo sistema</div>
                        )}
                      </div>
                    </div>
                  )}
                  {new_ && (
                    <div className="flex items-center gap-2">
                      <span className="text-base">📅</span>
                      <div>
                        <div className="text-[11px] font-semibold" style={{ color: '#14C38E' }}>
                          {new_.date} às {new_.time}
                        </div>
                        {doctorName && (
                          <div className="text-[10px]" style={{ color: 'var(--muted)' }}>
                            {doctorName}{doctorSpec ? ` · ${doctorSpec}` : ''} ·{' '}
                            {req.request_type === 'reagendamento_forcado' ? 'horário sugerido' : 'novo horário solicitado'}
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              )
            })()}

            {/* Patient message */}
            {req.message_to_receptionist &&
              req.message_to_receptionist !== 'Cancelamento de consulta' &&
              req.message_to_receptionist !== 'Solicitação de atendimento humano' &&
              req.message_to_receptionist !== 'Alteração de horário' &&
              req.request_type !== 'reagendamento_forcado' && (
              <div className="mx-3 px-2.5 py-1.5 rounded-md text-[10px] italic"
                style={{ background: 'var(--panel)', color: 'var(--muted)', borderLeft: `2px solid ${cfg.border}` }}>
                "{req.message_to_receptionist}"
              </div>
            )}

            {/* Block reason — only for reagendamento_forcado */}
            {req.request_type === 'reagendamento_forcado' && req.details?.block_reason && (
              <div className="mx-3 px-2.5 py-1.5 rounded-md text-[10px] italic"
                style={{ background: 'var(--panel)', color: 'var(--muted)', borderLeft: '2px solid #F97316' }}>
                Motivo: "{req.details.block_reason}"
              </div>
            )}

            {/* Message preview — only for disponibilidade */}
            {req.request_type === 'disponibilidade' && req.message_to_patient && (
              <details className="px-3 text-[9px]" style={{ color: 'var(--muted)' }}>
                <summary className="cursor-pointer select-none mb-1">
                  Ver mensagem que será enviada ao paciente
                </summary>
                <pre className="whitespace-pre-wrap leading-relaxed bg-transparent">{req.message_to_patient}</pre>
              </details>
            )}

            {/* Actions */}
            <div className="flex gap-1.5 px-3 pb-2.5">
              {req.request_type === 'disponibilidade' && (
                <>
                  <button disabled={isLoading} onClick={() => act(req.id, 'approve')}
                    className="flex-1 py-1.5 text-[11px] font-semibold rounded-md border transition-all disabled:opacity-40"
                    style={{ color: '#14C38E', borderColor: '#14C38E', background: '#14C38E12' }}>
                    {isLoading ? '…' : '✓ Aprovar e Notificar'}
                  </button>
                  <button disabled={isLoading} onClick={() => act(req.id, 'reject')}
                    className="flex-1 py-1.5 text-[11px] font-semibold rounded-md border transition-all disabled:opacity-40"
                    style={{ color: 'var(--red)', borderColor: 'var(--red)', background: '#EF444412' }}>
                    {isLoading ? '…' : '✗ Rejeitar'}
                  </button>
                </>
              )}

              {req.request_type === 'cancelamento' && (
                <>
                  <button disabled={isLoading} onClick={() => act(req.id, 'confirm_cancel')}
                    className="flex-1 py-1.5 text-[11px] font-semibold rounded-md border transition-all disabled:opacity-40"
                    style={{ color: '#EF4444', borderColor: '#EF4444', background: '#EF444412' }}>
                    {isLoading ? '…' : '🚫 Confirmar Cancelamento'}
                  </button>
                  <button disabled={isLoading} onClick={() => act(req.id, 'keep_appointment')}
                    className="flex-1 py-1.5 text-[11px] font-semibold rounded-md border transition-all disabled:opacity-40"
                    style={{ color: '#14C38E', borderColor: '#14C38E', background: '#14C38E12' }}>
                    {isLoading ? '…' : '✓ Manter Consulta'}
                  </button>
                </>
              )}

              {req.request_type === 'atendente' && (
                <button disabled={isLoading} onClick={() => act(req.id, 'resolve')}
                  className="flex-1 py-1.5 text-[11px] font-semibold rounded-md border transition-all disabled:opacity-40"
                  style={{ color: '#3B82F6', borderColor: '#3B82F6', background: '#3B82F612' }}>
                  {isLoading ? '…' : '✓ Marcar como Atendido'}
                </button>
              )}

              {req.request_type === 'alteracao_horario' && (
                <>
                  <button disabled={isLoading} onClick={() => act(req.id, 'resolve')}
                    className="flex-1 py-1.5 text-[11px] font-semibold rounded-md border transition-all disabled:opacity-40"
                    style={{ color: '#8B5CF6', borderColor: '#8B5CF6', background: '#8B5CF612' }}>
                    {isLoading ? '…' : '🗓 Reagendar'}
                  </button>
                  <button disabled={isLoading} onClick={() => act(req.id, 'keep_appointment')}
                    className="flex-1 py-1.5 text-[11px] font-semibold rounded-md border transition-all disabled:opacity-40"
                    style={{ color: 'var(--muted)', borderColor: 'var(--border)', background: 'var(--panel)' }}>
                    {isLoading ? '…' : 'Manter Horário'}
                  </button>
                </>
              )}

              {req.request_type === 'reagendamento_forcado' && (
                <button disabled={isLoading} onClick={() => act(req.id, 'confirm_forced_reschedule')}
                  className="flex-1 py-1.5 text-[11px] font-semibold rounded-md border transition-all disabled:opacity-40"
                  style={{ color: '#F97316', borderColor: '#F97316', background: '#F9731612' }}>
                  {isLoading ? '…' : '📩 Enviar Sugestão ao Paciente'}
                </button>
              )}
            </div>

            <div className="px-3 pb-2 flex items-center justify-between gap-2">
              <label className="flex items-center gap-1.5 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={!noNotify[req.id]}
                  onChange={e => setNoNotify(p => ({ ...p, [req.id]: !e.target.checked }))}
                  style={{ accentColor: '#25D366', width: 12, height: 12 }}
                />
                <span className="text-[9px]" style={{ color: 'var(--muted)' }}>Notificar cliente</span>
              </label>
              <span className="text-[8px]" style={{ color: 'var(--muted)' }}>
                {new Date(req.created_at).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
              </span>
            </div>
          </div>
        )
      })}
    </div>
    <style>{`
      @keyframes toast-in {
        from { opacity: 0; transform: translateY(8px) scale(.97) }
        to   { opacity: 1; transform: translateY(0) scale(1) }
      }
    `}</style>
    </>
  )
}

// Badge count — também via API para bypassar RLS
export function useApprovalCount() {
  const [count, setCount] = useState(0)

  const load = useCallback(async () => {
    try {
      const res = await fetch('/api/approval')
      if (!res.ok) return
      const data: unknown[] = await res.json()
      setCount(Array.isArray(data) ? data.length : 0)
    } catch {
      // silencioso
    }
  }, [])

  useEffect(() => {
    load()
    const poll = setInterval(load, 20_000)
    window.addEventListener('approval-resolved', load)
    const ch = supabase
      .channel('approval-count')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'approval_requests' }, () => load())
      .subscribe()
    return () => {
      clearInterval(poll)
      window.removeEventListener('approval-resolved', load)
      supabase.removeChannel(ch)
    }
  }, [load])

  return count
}
