'use client'
import { useState, useEffect } from 'react'
import { RefreshCw, CheckCircle, AlertCircle, ExternalLink, Smartphone, Webhook } from 'lucide-react'

type PhoneInfo = {
  phone_number_id: string
  display_phone_number: string
  verified_name: string
  quality_rating: string
  platform_type: string
  status: string
  waba_id: string | null
  webhook_url: string
}

const QUALITY_COLOR: Record<string, string> = {
  GREEN:  'var(--green)',
  YELLOW: 'var(--gold)',
  RED:    'var(--red)',
  UNKNOWN: 'var(--muted)',
}
const QUALITY_LABEL: Record<string, string> = {
  GREEN: 'Alta', YELLOW: 'Média', RED: 'Baixa', UNKNOWN: '—',
}

export default function WhatsAppConfigPanel() {
  const [info, setInfo]         = useState<PhoneInfo | null>(null)
  const [loading, setLoading]   = useState(true)
  const [error, setError]       = useState<string | null>(null)
  const [webhookUrl, setWebhookUrl] = useState('')
  const [verifyToken, setVerifyToken] = useState('')
  const [saving, setSaving]     = useState(false)
  const [saved, setSaved]       = useState(false)
  const [saveError, setSaveError] = useState<string | null>(null)

  useEffect(() => { load() }, [])

  async function load() {
    setLoading(true)
    setError(null)
    try {
      const r = await fetch('/api/meta/whatsapp')
      if (!r.ok) {
        const d = await r.json().catch(() => ({}))
        setError(d.error ?? 'Erro ao carregar dados do Meta')
      } else {
        const d: PhoneInfo = await r.json()
        setInfo(d)
        setWebhookUrl(d.webhook_url)
      }
    } catch {
      setError('Não foi possível conectar à API')
    }
    setLoading(false)
  }

  async function saveWebhook() {
    if (!webhookUrl || !verifyToken) return
    setSaving(true)
    setSaveError(null)
    setSaved(false)
    try {
      const r = await fetch('/api/meta/whatsapp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ callback_url: webhookUrl, verify_token: verifyToken }),
      })
      const d = await r.json()
      if (!r.ok) setSaveError(d.error ?? 'Falha ao atualizar')
      else { setSaved(true); setTimeout(() => setSaved(false), 3000) }
    } catch {
      setSaveError('Erro de rede')
    }
    setSaving(false)
  }

  const inputStyle: React.CSSProperties = {
    width: '100%', padding: '8px 10px', borderRadius: 8,
    border: '1px solid var(--border)', background: 'var(--card)',
    color: 'var(--foreground)', fontSize: 12, outline: 'none',
    fontFamily: 'var(--font-dm-sans, sans-serif)',
  }
  const labelStyle: React.CSSProperties = {
    fontSize: 10, fontWeight: 600, textTransform: 'uppercase',
    letterSpacing: '.06em', color: 'var(--muted)', marginBottom: 4, display: 'block',
  }
  const cardStyle: React.CSSProperties = {
    background: 'var(--card)', border: '1px solid var(--border)',
    borderRadius: 12, padding: '14px 16px',
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16, padding: 16 }}>

      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <span style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.06em', color: 'var(--muted)' }}>
          Integração WhatsApp · Meta
        </span>
        <button onClick={load} disabled={loading} style={{
          background: 'none', border: 'none', cursor: loading ? 'default' : 'pointer',
          color: 'var(--muted)', padding: 4, display: 'flex', alignItems: 'center',
        }}>
          <RefreshCw size={14} style={{ animation: loading ? 'spin 1s linear infinite' : 'none' }} />
        </button>
      </div>

      {/* Error state */}
      {error && (
        <div style={{ ...cardStyle, borderColor: 'var(--red)', display: 'flex', gap: 8, alignItems: 'flex-start' }}>
          <AlertCircle size={16} color="var(--red)" style={{ flexShrink: 0, marginTop: 1 }} />
          <div>
            <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--red)' }}>Erro de conexão</div>
            <div style={{ fontSize: 11, color: 'var(--muted)', marginTop: 2 }}>{error}</div>
          </div>
        </div>
      )}

      {/* Phone info card */}
      {info && (
        <div style={cardStyle}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
            <div style={{
              width: 36, height: 36, borderRadius: 10,
              background: '#25D366', display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              <Smartphone size={18} color="#fff" />
            </div>
            <div>
              <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--foreground)' }}>
                {info.verified_name || 'Número não verificado'}
              </div>
              <div style={{ fontSize: 12, color: 'var(--muted)', marginTop: 1 }}>
                {info.display_phone_number}
              </div>
            </div>
            <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 5 }}>
              <span style={{
                width: 8, height: 8, borderRadius: '50%',
                background: QUALITY_COLOR[info.quality_rating] ?? 'var(--muted)',
                display: 'inline-block',
              }} />
              <span style={{ fontSize: 10, color: 'var(--muted)' }}>
                Qualidade {QUALITY_LABEL[info.quality_rating] ?? info.quality_rating}
              </span>
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
            {[
              { l: 'Phone Number ID', v: info.phone_number_id },
              { l: 'WABA ID',         v: info.waba_id ?? '—' },
              { l: 'Status',          v: info.status },
              { l: 'Plataforma',      v: info.platform_type ?? '—' },
            ].map(({ l, v }) => (
              <div key={l} style={{ background: 'var(--panel)', borderRadius: 8, padding: '8px 10px' }}>
                <div style={{ fontSize: 9, textTransform: 'uppercase', letterSpacing: '.06em', color: 'var(--muted)', marginBottom: 2 }}>{l}</div>
                <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--foreground)', wordBreak: 'break-all' }}>{v}</div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Webhook config */}
      <div style={cardStyle}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 14 }}>
          <Webhook size={15} color="var(--muted)" />
          <span style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.06em', color: 'var(--muted)' }}>
            Webhook
          </span>
          <a
            href="https://developers.facebook.com/apps/993870354664131/whatsapp-business/wa-dev-console/"
            target="_blank" rel="noopener noreferrer"
            style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 4, fontSize: 10, color: 'var(--muted)', textDecoration: 'none' }}
          >
            Ver no Meta <ExternalLink size={10} />
          </a>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          <div>
            <label style={labelStyle}>URL do Callback</label>
            <input
              style={inputStyle}
              value={webhookUrl}
              onChange={e => setWebhookUrl(e.target.value)}
              placeholder="https://seudominio.com/api/whatsapp"
            />
          </div>
          <div>
            <label style={labelStyle}>Verify Token</label>
            <input
              style={inputStyle}
              value={verifyToken}
              onChange={e => setVerifyToken(e.target.value)}
              placeholder="Token configurado no servidor"
            />
            <div style={{ fontSize: 10, color: 'var(--muted)', marginTop: 4 }}>
              Deve coincidir com <code style={{ background: 'var(--panel)', padding: '1px 4px', borderRadius: 3 }}>WHATSAPP_VERIFY_TOKEN</code> no Vercel
            </div>
          </div>

          {saveError && (
            <div style={{ fontSize: 11, color: 'var(--red)', display: 'flex', alignItems: 'center', gap: 5 }}>
              <AlertCircle size={12} /> {saveError}
            </div>
          )}

          <button
            onClick={saveWebhook}
            disabled={saving || !webhookUrl || !verifyToken}
            style={{
              padding: '9px 0', borderRadius: 8, border: 'none',
              background: saved ? 'var(--green)' : 'var(--accent)',
              color: '#fff', fontSize: 12, fontWeight: 600, cursor: saving || !webhookUrl || !verifyToken ? 'default' : 'pointer',
              opacity: saving || !webhookUrl || !verifyToken ? .6 : 1,
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
              transition: 'background .2s',
            }}
          >
            {saved
              ? <><CheckCircle size={13} /> Webhook atualizado!</>
              : saving ? 'Atualizando...' : 'Atualizar Webhook no Meta'}
          </button>
        </div>
      </div>

      <style>{`@keyframes spin { to { transform: rotate(360deg) } }`}</style>
    </div>
  )
}
