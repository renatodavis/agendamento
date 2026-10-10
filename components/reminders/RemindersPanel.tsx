'use client'
import React, { useState, useEffect, useCallback } from 'react'
import { Bell, Check, Clock, AlertCircle, RefreshCw, Send } from 'lucide-react'

type Reminder = {
  id: string
  scheduledAt: string
  status: string
  type: string
  reminderSentAt: string | null
  patientName: string
  patientPhone: string
  doctorName: string
  doctorSpecialty: string
}

type Data = {
  today: string
  tomorrow: string
  sent: Reminder[]
  pending: Reminder[]
  sentCount: number
  pendingCount: number
}

function fmtTime(iso: string) {
  const d = new Date(iso)
  return d.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit', timeZone: 'UTC' })
}

function fmtDate(iso: string) {
  const [y, m, d] = iso.split('-')
  return `${d}/${m}/${y}`
}

function fmtSentAt(iso: string) {
  const d = new Date(iso)
  return d.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })
}

function statusLabel(status: string) {
  const map: Record<string, { label: string; color: string }> = {
    confirmada: { label: 'Confirmou', color: 'var(--accent)' },
    cancelada:  { label: 'Cancelou',  color: 'var(--red, #ef4444)' },
    agendada:   { label: 'Aguardando', color: 'var(--yellow, #f0a500)' },
    atendida:   { label: 'Atendido',  color: 'var(--accent)' },
  }
  return map[status] ?? { label: status, color: 'var(--muted)' }
}

export default function RemindersPanel() {
  const [data, setData] = useState<Data | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [tab, setTab] = useState<'sent' | 'pending'>('sent')

  const load = useCallback(async () => {
    try {
      setLoading(true)
      const r = await fetch('/api/reminders')
      if (!r.ok) throw new Error('Erro ao carregar lembretes')
      setData(await r.json())
      setError(null)
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Erro desconhecido')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { load() }, [load])

  const list = tab === 'sent' ? data?.sent : data?.pending

  return (
    <div className="rem-panel">
      <div className="rem-header">
        <div className="rem-header-left">
          <Bell size={16} />
          <h2>Lembretes</h2>
        </div>
        <button className="rem-refresh" onClick={load} disabled={loading} title="Atualizar">
          <RefreshCw size={14} className={loading ? 'rem-spin' : ''} />
        </button>
      </div>

      {data && (
        <div className="rem-summary">
          <div className="rem-summary-item">
            <Send size={13} />
            <span><strong>{data.sentCount}</strong> enviado{data.sentCount !== 1 ? 's' : ''}</span>
          </div>
          <div className="rem-summary-item">
            <Clock size={13} />
            <span><strong>{data.pendingCount}</strong> pendente{data.pendingCount !== 1 ? 's' : ''} (amanhã)</span>
          </div>
        </div>
      )}

      <div className="rem-tabs">
        <button className={`rem-tab ${tab === 'sent' ? 'active' : ''}`} onClick={() => setTab('sent')}>
          <Check size={13} /> Enviados {data ? `(${data.sentCount})` : ''}
        </button>
        <button className={`rem-tab ${tab === 'pending' ? 'active' : ''}`} onClick={() => setTab('pending')}>
          <Clock size={13} /> Pendentes {data ? `(${data.pendingCount})` : ''}
        </button>
      </div>

      <div className="rem-list">
        {error && (
          <div className="rem-empty">
            <AlertCircle size={20} />
            <span>{error}</span>
          </div>
        )}

        {!error && loading && <div className="rem-empty"><RefreshCw size={16} className="rem-spin" /> Carregando...</div>}

        {!error && !loading && list?.length === 0 && (
          <div className="rem-empty">
            {tab === 'sent'
              ? <><Send size={20} /><span>Nenhum lembrete enviado hoje</span></>
              : <><Clock size={20} /><span>Nenhum agendamento pendente para amanhã</span></>
            }
          </div>
        )}

        {!error && !loading && list?.map(r => {
          const st = statusLabel(r.status)
          return (
            <div key={r.id} className="rem-card">
              <div className="rem-card-top">
                <span className="rem-time">{fmtTime(r.scheduledAt)}</span>
                <span className="rem-status" style={{ color: st.color }}>{st.label}</span>
              </div>
              <div className="rem-patient">{r.patientName}</div>
              <div className="rem-details">
                {r.doctorName} · {r.type}
              </div>
              {r.reminderSentAt && (
                <div className="rem-sent-info">
                  <Check size={11} /> Enviado às {fmtSentAt(r.reminderSentAt)}
                </div>
              )}
              {!r.reminderSentAt && tab === 'pending' && (
                <div className="rem-sent-info pending">
                  <Clock size={11} /> Será enviado amanhã às 9h
                </div>
              )}
            </div>
          )
        })}
      </div>

      {data && tab === 'pending' && data.pendingCount > 0 && (
        <div className="rem-footer">
          O cron roda diariamente às 9h (Brasília). Agendamentos confirmados e agendados de amanhã recebem lembrete automático.
        </div>
      )}

      <style>{`
        .rem-panel {
          display: flex; flex-direction: column; height: 100%;
          background: var(--background); overflow: hidden;
        }
        .rem-header {
          display: flex; align-items: center; justify-content: space-between;
          padding: 16px 20px 12px; flex-shrink: 0;
        }
        .rem-header-left {
          display: flex; align-items: center; gap: 8px;
          color: var(--foreground);
        }
        .rem-header h2 {
          margin: 0; font-size: 16px; font-weight: 700;
        }
        .rem-refresh {
          width: 32px; height: 32px; border-radius: 8px; border: 1px solid var(--border);
          background: none; color: var(--muted); cursor: pointer;
          display: flex; align-items: center; justify-content: center;
          transition: background .15s, color .15s;
        }
        .rem-refresh:hover { background: var(--card); color: var(--foreground); }
        .rem-refresh:disabled { opacity: .5; cursor: default; }
        .rem-spin { animation: rem-rotate 1s linear infinite; }
        @keyframes rem-rotate { to { transform: rotate(360deg) } }

        .rem-summary {
          display: flex; gap: 16px; padding: 0 20px 12px;
        }
        .rem-summary-item {
          display: flex; align-items: center; gap: 6px;
          font-size: 12px; color: var(--muted);
        }
        .rem-summary-item strong {
          font-weight: 800; color: var(--foreground);
          font-variant-numeric: tabular-nums;
        }

        .rem-tabs {
          display: flex; gap: 0; padding: 0 20px;
          border-bottom: 1px solid var(--border); flex-shrink: 0;
        }
        .rem-tab {
          flex: 1; display: flex; align-items: center; justify-content: center; gap: 6px;
          padding: 10px 0; border: none; background: none; cursor: pointer;
          font-size: 13px; font-weight: 500; color: var(--muted);
          border-bottom: 2px solid transparent; transition: color .15s;
        }
        .rem-tab.active {
          color: var(--accent); font-weight: 700;
          border-bottom-color: var(--accent);
        }
        .rem-tab:hover:not(.active) { color: var(--foreground); }

        .rem-list {
          flex: 1; overflow-y: auto; padding: 12px 20px; display: flex; flex-direction: column; gap: 8px;
        }
        .rem-empty {
          display: flex; flex-direction: column; align-items: center; justify-content: center;
          gap: 8px; padding: 40px 20px; color: var(--muted); font-size: 13px; text-align: center;
        }

        .rem-card {
          padding: 12px 14px; border-radius: 10px; border: 1px solid var(--border);
          background: var(--card); transition: box-shadow .15s;
        }
        .rem-card:hover { box-shadow: 0 2px 8px rgba(0,0,0,.06); }
        .rem-card-top {
          display: flex; align-items: center; justify-content: space-between; margin-bottom: 4px;
        }
        .rem-time {
          font-size: 13px; font-weight: 700; color: var(--foreground);
          font-variant-numeric: tabular-nums;
        }
        .rem-status { font-size: 11px; font-weight: 700; }
        .rem-patient { font-size: 14px; font-weight: 600; color: var(--foreground); margin-bottom: 2px; }
        .rem-details { font-size: 12px; color: var(--muted); }
        .rem-sent-info {
          display: flex; align-items: center; gap: 4px;
          margin-top: 6px; font-size: 11px; color: var(--accent); font-weight: 500;
        }
        .rem-sent-info.pending { color: var(--muted); }

        .rem-footer {
          padding: 10px 20px; flex-shrink: 0;
          font-size: 11px; color: var(--muted); border-top: 1px solid var(--border);
          line-height: 1.4;
        }

        @media (max-width: 767px) {
          .rem-header { padding: 12px 16px 10px; }
          .rem-summary { padding: 0 16px 10px; }
          .rem-tabs { padding: 0 16px; }
          .rem-list { padding: 10px 16px; }
          .rem-footer { padding: 8px 16px; }
        }
      `}</style>
    </div>
  )
}
