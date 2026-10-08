'use client'
import { useState, useEffect } from 'react'
import { RefreshCw, CheckCircle, AlertCircle, ExternalLink, Smartphone, Webhook, ChevronDown } from 'lucide-react'

type MetaApp = {
  app_id: string
  name: string
  business_name: string
}

type PhoneEntry = {
  id: string
  display_phone_number: string
  verified_name: string
  quality_rating: string
  status: string
  platform_type?: string
}

type AppDetail = {
  app_id: string
  app_name: string | null
  waba_id: string | null
  phones: PhoneEntry[]
  current_webhook: string | null
  suggested_webhook: string
}

const QUALITY_COLOR: Record<string, string> = {
  GREEN: 'var(--green)', YELLOW: 'var(--gold)', RED: 'var(--red)', UNKNOWN: 'var(--muted)',
}
const QUALITY_LABEL: Record<string, string> = {
  GREEN: 'Alta', YELLOW: 'Média', RED: 'Baixa', UNKNOWN: '—',
}

const inputStyle: React.CSSProperties = {
  width: '100%', padding: '8px 10px', borderRadius: 8,
  border: '1px solid var(--border)', background: 'var(--card)',
  color: 'var(--foreground)', fontSize: 12, outline: 'none',
  fontFamily: 'var(--font-dm-sans, sans-serif)', boxSizing: 'border-box',
}
const labelStyle: React.CSSProperties = {
  fontSize: 10, fontWeight: 600, textTransform: 'uppercase',
  letterSpacing: '.06em', color: 'var(--muted)', marginBottom: 4, display: 'block',
}
const cardStyle: React.CSSProperties = {
  background: 'var(--card)', border: '1px solid var(--border)',
  borderRadius: 12, padding: '14px 16px',
}

export default function WhatsAppConfigPanel() {
  const [apps, setApps]               = useState<MetaApp[]>([])
  const [appsLoading, setAppsLoading] = useState(true)
  const [appsError, setAppsError]     = useState<string | null>(null)

  const [selectedAppId, setSelectedAppId] = useState<string | null>(null)
  const [appOpen, setAppOpen]             = useState(false)

  const [detail, setDetail]           = useState<AppDetail | null>(null)
  const [detailLoading, setDetailLoading] = useState(false)
  const [detailError, setDetailError] = useState<string | null>(null)

  const [selectedPhone, setSelectedPhone] = useState<PhoneEntry | null>(null)
  const [phoneOpen, setPhoneOpen]         = useState(false)

  const [webhookUrl, setWebhookUrl]   = useState('')
  const [verifyToken, setVerifyToken] = useState('')
  const [saving, setSaving]           = useState(false)
  const [saved, setSaved]             = useState(false)
  const [saveError, setSaveError]     = useState<string | null>(null)

  useEffect(() => { loadApps() }, [])

  async function loadApps() {
    setAppsLoading(true)
    setAppsError(null)
    try {
      const r = await fetch('/api/meta/apps')
      if (!r.ok) {
        const d = await r.json().catch(() => ({})) as { error?: string }
        setAppsError(d.error ?? 'Erro ao carregar apps')
      } else {
        const d = await r.json() as { apps: MetaApp[] }
        setApps(d.apps ?? [])
        if (d.apps?.length === 1) selectApp(d.apps[0].app_id)
      }
    } catch {
      setAppsError('Não foi possível conectar à API')
    }
    setAppsLoading(false)
  }

  async function selectApp(appId: string) {
    setSelectedAppId(appId)
    setAppOpen(false)
    setDetail(null)
    setSelectedPhone(null)
    setDetailError(null)
    setDetailLoading(true)
    try {
      const r = await fetch(`/api/meta/apps/${appId}`)
      if (!r.ok) {
        const d = await r.json().catch(() => ({})) as { error?: string }
        setDetailError(d.error ?? 'Erro ao carregar detalhes do app')
      } else {
        const d: AppDetail = await r.json()
        setDetail(d)
        const first = d.phones?.[0] ?? null
        setSelectedPhone(first)
        setWebhookUrl(d.current_webhook ?? d.suggested_webhook ?? '')
      }
    } catch {
      setDetailError('Erro de rede ao carregar detalhes')
    }
    setDetailLoading(false)
  }

  async function saveWebhook() {
    if (!webhookUrl || !verifyToken || !selectedAppId) return
    setSaving(true)
    setSaveError(null)
    setSaved(false)
    try {
      const r = await fetch('/api/meta/whatsapp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          callback_url: webhookUrl,
          verify_token: verifyToken,
          app_id: selectedAppId,
        }),
      })
      const d = await r.json() as { error?: string }
      if (!r.ok) setSaveError(d.error ?? 'Falha ao atualizar')
      else { setSaved(true); setTimeout(() => setSaved(false), 3000) }
    } catch {
      setSaveError('Erro de rede')
    }
    setSaving(false)
  }

  const selectedApp = apps.find(a => a.app_id === selectedAppId)

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16, padding: 16 }}>

      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <span style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.06em', color: 'var(--muted)' }}>
          Integração WhatsApp · Meta
        </span>
        <button onClick={loadApps} disabled={appsLoading} style={{
          background: 'none', border: 'none', cursor: appsLoading ? 'default' : 'pointer',
          color: 'var(--muted)', padding: 4, display: 'flex', alignItems: 'center',
        }}>
          <RefreshCw size={14} style={{ animation: appsLoading ? 'spin 1s linear infinite' : 'none' }} />
        </button>
      </div>

      {/* Apps error */}
      {appsError && (
        <div style={{ ...cardStyle, borderColor: 'var(--red)', display: 'flex', gap: 8, alignItems: 'flex-start' }}>
          <AlertCircle size={16} color="var(--red)" style={{ flexShrink: 0, marginTop: 1 }} />
          <div>
            <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--red)' }}>Erro ao listar apps</div>
            <div style={{ fontSize: 11, color: 'var(--muted)', marginTop: 2 }}>{appsError}</div>
          </div>
        </div>
      )}

      {/* App selector */}
      <div style={cardStyle}>
        <label style={labelStyle}>App Meta (Developers)</label>
        <div style={{ position: 'relative' }}>
          <button
            onClick={() => setAppOpen(o => !o)}
            disabled={appsLoading || apps.length === 0}
            style={{
              ...inputStyle,
              display: 'flex', alignItems: 'center', justifyContent: 'space-between',
              cursor: apps.length === 0 ? 'default' : 'pointer',
              textAlign: 'left', border: '1px solid var(--border)',
            }}
          >
            <span style={{ color: selectedApp ? 'var(--foreground)' : 'var(--muted)' }}>
              {appsLoading
                ? 'Carregando apps...'
                : selectedApp
                  ? `${selectedApp.name}${selectedApp.business_name ? ` · ${selectedApp.business_name}` : ''}`
                  : apps.length === 0 ? 'Nenhum app encontrado' : 'Selecione um app…'}
            </span>
            <ChevronDown size={13} color="var(--muted)" style={{ transform: appOpen ? 'rotate(180deg)' : 'none', transition: 'transform .15s' }} />
          </button>

          {appOpen && apps.length > 0 && (
            <div style={{
              position: 'absolute', top: 'calc(100% + 4px)', left: 0, right: 0, zIndex: 50,
              background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 8,
              boxShadow: '0 4px 16px rgba(0,0,0,.12)', overflow: 'hidden',
            }}>
              {apps.map(app => (
                <button
                  key={app.app_id}
                  onClick={() => selectApp(app.app_id)}
                  style={{
                    display: 'flex', flexDirection: 'column', alignItems: 'flex-start',
                    width: '100%', padding: '10px 14px', border: 'none', background: 'none',
                    cursor: 'pointer', textAlign: 'left',
                    borderBottom: '1px solid var(--border)',
                    background: app.app_id === selectedAppId ? 'var(--panel)' : 'none',
                  }}
                  onMouseEnter={e => (e.currentTarget.style.background = 'var(--panel)')}
                  onMouseLeave={e => (e.currentTarget.style.background = app.app_id === selectedAppId ? 'var(--panel)' : 'none')}
                >
                  <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--foreground)' }}>{app.name}</span>
                  {app.business_name && (
                    <span style={{ fontSize: 10, color: 'var(--muted)', marginTop: 1 }}>{app.business_name}</span>
                  )}
                  <span style={{ fontSize: 9, color: 'var(--muted)', marginTop: 1 }}>ID: {app.app_id}</span>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Detail loading */}
      {detailLoading && (
        <div style={{ ...cardStyle, display: 'flex', alignItems: 'center', gap: 8, color: 'var(--muted)', fontSize: 12 }}>
          <RefreshCw size={14} style={{ animation: 'spin 1s linear infinite' }} />
          Carregando detalhes do app…
        </div>
      )}

      {/* Detail error */}
      {detailError && (
        <div style={{ ...cardStyle, borderColor: 'var(--red)', display: 'flex', gap: 8, alignItems: 'flex-start' }}>
          <AlertCircle size={16} color="var(--red)" style={{ flexShrink: 0, marginTop: 1 }} />
          <div style={{ fontSize: 11, color: 'var(--red)' }}>{detailError}</div>
        </div>
      )}

      {/* Phone selector + info */}
      {detail && detail.phones.length > 0 && (
        <div style={cardStyle}>
          <label style={labelStyle}>Número de Telefone</label>

          {detail.phones.length > 1 && (
            <div style={{ position: 'relative', marginBottom: 12 }}>
              <button
                onClick={() => setPhoneOpen(o => !o)}
                style={{
                  ...inputStyle,
                  display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                  cursor: 'pointer', textAlign: 'left', marginBottom: 0,
                }}
              >
                <span>
                  {selectedPhone
                    ? `${selectedPhone.display_phone_number} · ${selectedPhone.verified_name}`
                    : 'Selecione um número…'}
                </span>
                <ChevronDown size={13} color="var(--muted)" style={{ transform: phoneOpen ? 'rotate(180deg)' : 'none', transition: 'transform .15s' }} />
              </button>
              {phoneOpen && (
                <div style={{
                  position: 'absolute', top: 'calc(100% + 4px)', left: 0, right: 0, zIndex: 50,
                  background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 8,
                  boxShadow: '0 4px 16px rgba(0,0,0,.12)', overflow: 'hidden',
                }}>
                  {detail.phones.map(p => (
                    <button key={p.id} onClick={() => { setSelectedPhone(p); setPhoneOpen(false) }}
                      style={{
                        display: 'flex', flexDirection: 'column', alignItems: 'flex-start',
                        width: '100%', padding: '10px 14px', border: 'none',
                        borderBottom: '1px solid var(--border)', cursor: 'pointer', textAlign: 'left',
                        background: p.id === selectedPhone?.id ? 'var(--panel)' : 'none',
                      }}
                      onMouseEnter={e => (e.currentTarget.style.background = 'var(--panel)')}
                      onMouseLeave={e => (e.currentTarget.style.background = p.id === selectedPhone?.id ? 'var(--panel)' : 'none')}
                    >
                      <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--foreground)' }}>{p.display_phone_number}</span>
                      <span style={{ fontSize: 10, color: 'var(--muted)', marginTop: 1 }}>{p.verified_name}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Phone card */}
          {selectedPhone && (
            <>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
                <div style={{
                  width: 36, height: 36, borderRadius: 10, flexShrink: 0,
                  background: '#25D366', display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}>
                  <Smartphone size={18} color="#fff" />
                </div>
                <div>
                  <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--foreground)' }}>
                    {selectedPhone.verified_name || 'Número não verificado'}
                  </div>
                  <div style={{ fontSize: 12, color: 'var(--muted)', marginTop: 1 }}>
                    {selectedPhone.display_phone_number}
                  </div>
                </div>
                <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 5 }}>
                  <span style={{
                    width: 8, height: 8, borderRadius: '50%', flexShrink: 0,
                    background: QUALITY_COLOR[selectedPhone.quality_rating] ?? 'var(--muted)',
                    display: 'inline-block',
                  }} />
                  <span style={{ fontSize: 10, color: 'var(--muted)' }}>
                    Qualidade {QUALITY_LABEL[selectedPhone.quality_rating] ?? selectedPhone.quality_rating}
                  </span>
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                {[
                  { l: 'Phone Number ID', v: selectedPhone.id },
                  { l: 'WABA ID',         v: detail.waba_id ?? '—' },
                  { l: 'Status',          v: selectedPhone.status },
                  { l: 'Plataforma',      v: selectedPhone.platform_type ?? '—' },
                ].map(({ l, v }) => (
                  <div key={l} style={{ background: 'var(--panel)', borderRadius: 8, padding: '8px 10px' }}>
                    <div style={{ fontSize: 9, textTransform: 'uppercase', letterSpacing: '.06em', color: 'var(--muted)', marginBottom: 2 }}>{l}</div>
                    <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--foreground)', wordBreak: 'break-all' }}>{v}</div>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>
      )}

      {/* Webhook config */}
      {detail && (
        <div style={cardStyle}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 14 }}>
            <Webhook size={15} color="var(--muted)" />
            <span style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.06em', color: 'var(--muted)' }}>
              Webhook
            </span>
            <a
              href={`https://developers.facebook.com/apps/${detail.app_id}/whatsapp-business/wa-dev-console/`}
              target="_blank" rel="noopener noreferrer"
              style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 4, fontSize: 10, color: 'var(--muted)', textDecoration: 'none' }}
            >
              Ver no Meta <ExternalLink size={10} />
            </a>
          </div>

          {detail.current_webhook && (
            <div style={{ marginBottom: 10, padding: '6px 10px', borderRadius: 8, background: 'var(--panel)', fontSize: 11, color: 'var(--muted)' }}>
              <span style={{ fontWeight: 600 }}>Atual: </span>{detail.current_webhook}
            </div>
          )}

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
                color: '#fff', fontSize: 12, fontWeight: 600,
                cursor: saving || !webhookUrl || !verifyToken ? 'default' : 'pointer',
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
      )}

      <style>{`@keyframes spin { to { transform: rotate(360deg) } }`}</style>
    </div>
  )
}
