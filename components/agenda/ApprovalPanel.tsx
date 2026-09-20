'use client'
import { useState, useEffect } from 'react'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

type ApprovalRequest = {
  id: string
  patient_name: string | null
  suggested_at: string
  message_to_patient: string
  status: string
  created_at: string
  doctor: { name: string; specialty: string } | null
}

function fmtSlot(iso: string) {
  const d = new Date(iso)
  return {
    date: d.toLocaleDateString('pt-BR', { weekday: 'long', day: '2-digit', month: '2-digit', year: 'numeric', timeZone: 'UTC' }),
    time: d.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit', timeZone: 'UTC' }),
  }
}

export default function ApprovalPanel() {
  const [requests, setRequests] = useState<ApprovalRequest[]>([])
  const [busy, setBusy]         = useState<Record<string, boolean>>({})

  useEffect(() => {
    load()
    const ch = supabase
      .channel('approval-panel')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'approval_requests' }, load)
      .subscribe()
    return () => { supabase.removeChannel(ch) }
  }, [])

  async function load() {
    const { data } = await supabase
      .from('approval_requests')
      .select('*, doctor:doctors(name, specialty)')
      .eq('status', 'pending')
      .order('created_at', { ascending: true })
    setRequests(
      (data ?? []).map(r => ({
        ...r,
        doctor: r.doctor as unknown as { name: string; specialty: string } | null,
      }))
    )
  }

  async function act(id: string, action: 'approve' | 'reject') {
    setBusy(p => ({ ...p, [id]: true }))
    try {
      await fetch('/api/approval', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, action }),
      })
      setRequests(prev => prev.filter(r => r.id !== id))
    } finally {
      setBusy(p => ({ ...p, [id]: false }))
    }
  }

  if (requests.length === 0) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center gap-2 p-6 text-center">
        <span className="text-3xl opacity-20">✅</span>
        <p className="text-xs leading-relaxed" style={{ color: 'var(--muted)' }}>
          Nenhuma aprovação pendente.<br />
          Quando o bot encontrar uma vaga,<br />
          ela aparece aqui para você confirmar.
        </p>
      </div>
    )
  }

  return (
    <div className="flex-1 overflow-y-auto p-2 flex flex-col gap-2"
      style={{ scrollbarWidth: 'thin', scrollbarColor: 'var(--border) transparent' }}>
      {requests.map(req => {
        const { date, time } = fmtSlot(req.suggested_at)
        const isLoading = busy[req.id]
        return (
          <div key={req.id} className="rounded-lg border flex flex-col gap-2 overflow-hidden"
            style={{ background: 'var(--card)', borderColor: '#F0A500' }}>

            {/* Orange top bar */}
            <div className="px-3 pt-2.5 pb-0 flex items-center justify-between gap-2">
              <div>
                <div className="text-[12px] font-bold leading-tight">{req.patient_name ?? 'Paciente'}</div>
                <div className="text-[10px]" style={{ color: 'var(--muted)' }}>
                  {req.doctor?.name} · {req.doctor?.specialty}
                </div>
              </div>
              <span className="text-[8px] px-1.5 py-0.5 rounded-full font-bold border shrink-0"
                style={{ color: '#F0A500', borderColor: '#F0A500', background: '#F0A50018' }}>
                ◐ aguarda revisão
              </span>
            </div>

            {/* Slot */}
            <div className="mx-3 px-2.5 py-2 rounded-md flex items-center gap-2"
              style={{ background: 'var(--panel)' }}>
              <span className="text-base">📅</span>
              <div>
                <div className="text-[11px] font-semibold">{date} às {time}</div>
                <div className="text-[9px]" style={{ color: 'var(--muted)' }}>horário sugerido pelo sistema</div>
              </div>
            </div>

            {/* Message preview */}
            <details className="px-3 text-[9px]" style={{ color: 'var(--muted)' }}>
              <summary className="cursor-pointer select-none mb-1">
                Ver mensagem que será enviada ao paciente
              </summary>
              <pre className="whitespace-pre-wrap leading-relaxed bg-transparent">{req.message_to_patient}</pre>
            </details>

            {/* Actions */}
            <div className="flex gap-1.5 px-3 pb-2.5">
              <button disabled={isLoading} onClick={() => act(req.id, 'approve')}
                className="flex-1 py-1.5 text-[11px] font-semibold rounded-md border transition-all disabled:opacity-40"
                style={{ color: '#14C38E', borderColor: '#14C38E', background: '#14C38E12' }}
                onMouseEnter={e => { if (!isLoading) e.currentTarget.style.background = 'var(--green)'; e.currentTarget.style.color = '#fff' }}
                onMouseLeave={e => { e.currentTarget.style.background = '#14C38E12'; e.currentTarget.style.color = '#14C38E' }}>
                {isLoading ? '…' : '✓ Aprovar e Notificar'}
              </button>
              <button disabled={isLoading} onClick={() => act(req.id, 'reject')}
                className="flex-1 py-1.5 text-[11px] font-semibold rounded-md border transition-all disabled:opacity-40"
                style={{ color: 'var(--red)', borderColor: 'var(--red)', background: '#EF444412' }}>
                {isLoading ? '…' : '✗ Rejeitar'}
              </button>
            </div>

            <div className="px-3 pb-2 text-[8px]" style={{ color: 'var(--muted)' }}>
              solicitado às {new Date(req.created_at).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
            </div>
          </div>
        )
      })}
    </div>
  )
}

// Export hook for badge count
export function useApprovalCount() {
  const [count, setCount] = useState(0)
  useEffect(() => {
    const load = async () => {
      const { count: c } = await supabase
        .from('approval_requests')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'pending')
      setCount(c ?? 0)
    }
    load()
    const ch = supabase
      .channel('approval-count')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'approval_requests' }, load)
      .subscribe()
    return () => { supabase.removeChannel(ch) }
  }, [])
  return count
}
