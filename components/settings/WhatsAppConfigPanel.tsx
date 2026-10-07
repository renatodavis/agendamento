'use client'
import { useState, useEffect, useCallback } from 'react'
import { Wifi, WifiOff, RefreshCw, Eye, EyeOff, ExternalLink } from 'lucide-react'

declare global {
  interface Window {
    FB: {
      init: (opts: Record<string, unknown>) => void
      login: (cb: (r: { authResponse?: { code?: string } }) => void, opts: Record<string, unknown>) => void
    }
    fbAsyncInit?: () => void
  }
}

type SecretStatus = { set: boolean; masked: string | null; updated_at: string | null }

type ConfigStatus = {
  connected: boolean
  whatsapp_api_token: SecretStatus
  whatsapp_phone_number_id: SecretStatus
  whatsapp_verify_token: SecretStatus
  whatsapp_app_secret: SecretStatus
}

const META_APP_ID = process.env.NEXT_PUBLIC_META_APP_ID
const META_CONFIG_ID = process.env.NEXT_PUBLIC_META_CONFIG_ID

export default function WhatsAppConfigPanel() {
  const [status, setStatus]     = useState<ConfigStatus | null>(null)
  const [loading, setLoading]   = useState(true)
  const [saving, setSaving]     = useState(false)
  const [saved, setSaved]       = useState(false)
  const [fbLoading, setFbLoading] = useState(false)
  const [showManual, setShowManual] = useState(false)
  const [showToken, setShowToken]   = useState(false)
  const [showSecret, setShowSecret] = useState(false)

  const [form, setForm] = useState({
    whatsapp_api_token: '',
    whatsapp_phone_number_id: '',
    whatsapp_verify_token: '',
    whatsapp_app_secret: '',
  })

  const load = useCallback(async () => {
    setLoading(true)
    const r = await fetch('/api/whatsapp-config')
    if (r.ok) setStatus(await r.json())
    setLoading(false)
  }, [])

  useEffect(() => { load() }, [load])

  useEffect(() => {
    if (!META_APP_ID || typeof window === 'undefined') return
    if (document.getElementById('facebook-jssdk')) return

    window.fbAsyncInit = () => {
      window.FB.init({ appId: META_APP_ID, autoLogAppEvents: true, xfbml: true, version: 'v20.0' })
    }

    const script = document.createElement('script')
    script.id = 'facebook-jssdk'
    script.src = 'https://connect.facebook.net/pt_BR/sdk.js'
    script.async = true
    document.body.appendChild(script)
  }, [])

  function handleFbMessage(event: MessageEvent) {
    if (event.origin !== 'https://www.facebook.com') return
    try {
      const data = JSON.parse(event.data as string) as {
        type?: string
        event?: string
        data?: { phone_number_id?: string; waba_id?: string }
      }
      if (data.type === 'WA_EMBEDDED_SIGNUP' && data.event === 'FINISH') {
        const phone_number_id = data.data?.phone_number_id
        const waba_id         = data.data?.waba_id
        return { phone_number_id, waba_id }
      }
    } catch {}
    return null
  }

  async function launchFacebookSignup() {
    if (!window.FB || !META_CONFIG_ID) return
    setFbLoading(true)

    const collected = { phone_number_id: '', waba_id: '' }

    const onMessage = (event: MessageEvent) => {
      const res = handleFbMessage(event)
      if (res?.phone_number_id) {
        collected.phone_number_id = res.phone_number_id
        collected.waba_id = res.waba_id ?? ''
      }
    }
    window.addEventListener('message', onMessage)

    window.FB.login(async (response) => {
      window.removeEventListener('message', onMessage)
      if (!response.authResponse?.code) { setFbLoading(false); return }

      const r = await fetch('/api/whatsapp-config', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          code: response.authResponse.code,
          phone_number_id: collected.phone_number_id || undefined,
          waba_id: collected.waba_id || undefined,
        }),
      })

      setFbLoading(false)
      if (r.ok) { await load(); setSaved(true); setTimeout(() => setSaved(false), 2500) }
    }, {
      config_id: META_CONFIG_ID,
      response_type: 'code',
      override_default_response_type: true,
      extras: { setup: {}, featureType: '', sessionInfoVersion: '2' },
    })
  }

  async function saveManual() {
    setSaving(true)
    setSaved(false)
    const payload = Object.fromEntries(
      Object.entries(form).filter(([, v]) => v.trim().length > 0)
    )
    if (Object.keys(payload).length > 0) {
      await fetch('/api/whatsapp-config', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })
      setForm({ whatsapp_api_token: '', whatsapp_phone_number_id: '', whatsapp_verify_token: '', whatsapp_app_secret: '' })
      await load()
    }
    setSaving(false)
    setSaved(true)
    setTimeout(() => setSaved(false), 2500)
  }

  const inputStyle = {
    width: '100%', padding: '7px 10px', borderRadius: 6, fontSize: 12, outline: 'none',
    border: '1px solid var(--border)', background: 'var(--panel)', color: 'var(--foreground)',
    boxSizing: 'border-box' as const,
  }
  const labelStyle = { fontSize: 10, color: 'var(--muted)', marginBottom: 4, display: 'block' as const }

  if (loading) {
    return (
      <div style={{ padding: '12px 0', color: 'var(--muted)', fontSize: 11 }}>
        Carregando status WhatsApp…
      </div>
    )
  }

  return (
    <section style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.06em', color: 'var(--muted)' }}>
          WhatsApp Business
        </div>
        <button onClick={load} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--muted)', display: 'flex', alignItems: 'center', gap: 4, fontSize: 10 }}>
          <RefreshCw size={11} /> Atualizar
        </button>
      </div>

      {/* Status badge */}
      <div style={{
        display: 'flex', alignItems: 'center', gap: 8, padding: '8px 12px',
        borderRadius: 8, border: `1px solid ${status?.connected ? '#14C38E40' : '#EF444440'}`,
        background: status?.connected ? '#14C38E0C' : '#EF44440C',
      }}>
        {status?.connected
          ? <Wifi size={14} style={{ color: '#14C38E', flexShrink: 0 }} />
          : <WifiOff size={14} style={{ color: '#EF4444', flexShrink: 0 }} />
        }
        <div>
          <div style={{ fontSize: 12, fontWeight: 600, color: status?.connected ? '#14C38E' : '#EF4444' }}>
            {status?.connected ? 'Conectado' : 'Não configurado'}
          </div>
          {status?.whatsapp_phone_number_id.masked && (
            <div style={{ fontSize: 10, color: 'var(--muted)', marginTop: 1 }}>
              Phone ID: {status.whatsapp_phone_number_id.masked}
            </div>
          )}
        </div>
      </div>

      {/* Credenciais individuais */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6 }}>
        {[
          { key: 'whatsapp_api_token',       label: 'API Token' },
          { key: 'whatsapp_phone_number_id', label: 'Phone Number ID' },
          { key: 'whatsapp_verify_token',    label: 'Verify Token' },
          { key: 'whatsapp_app_secret',      label: 'App Secret' },
        ].map(({ key, label }) => {
          const s = status?.[key as keyof ConfigStatus] as SecretStatus | undefined
          return (
            <div key={key} style={{
              padding: '6px 10px', borderRadius: 6, border: '1px solid var(--border)',
              background: 'var(--panel)',
            }}>
              <div style={{ fontSize: 9, color: 'var(--muted)', marginBottom: 2 }}>{label}</div>
              <div style={{ fontSize: 10, fontWeight: 600, color: s?.set ? 'var(--foreground)' : 'var(--muted)' }}>
                {s?.set ? (s.masked ?? '••••') : '— não definido'}
              </div>
            </div>
          )
        })}
      </div>

      {saved && (
        <div style={{ fontSize: 11, color: '#14C38E', fontWeight: 600, textAlign: 'center' }}>
          ✓ Salvo com sucesso!
        </div>
      )}

      {/* Botão Facebook */}
      {META_APP_ID && META_CONFIG_ID ? (
        <button
          onClick={launchFacebookSignup}
          disabled={fbLoading}
          style={{
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
            padding: '10px 16px', borderRadius: 8, border: 'none', cursor: fbLoading ? 'default' : 'pointer',
            background: fbLoading ? '#1877F280' : '#1877F2', color: '#fff',
            fontSize: 13, fontWeight: 600, transition: 'background .15s',
          }}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
            <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
          </svg>
          {fbLoading ? 'Conectando…' : 'Conectar via Facebook'}
        </button>
      ) : (
        <div style={{
          padding: '8px 12px', borderRadius: 8, background: 'var(--panel)',
          border: '1px dashed var(--border)', fontSize: 11, color: 'var(--muted)', lineHeight: 1.5,
        }}>
          Para usar o login via Facebook, configure <code style={{ background: 'var(--background)', padding: '1px 4px', borderRadius: 3 }}>NEXT_PUBLIC_META_APP_ID</code> e <code style={{ background: 'var(--background)', padding: '1px 4px', borderRadius: 3 }}>NEXT_PUBLIC_META_CONFIG_ID</code> nas variáveis de ambiente.{' '}
          <a href="https://developers.facebook.com/docs/whatsapp/embedded-signup" target="_blank" rel="noopener noreferrer"
            style={{ color: '#1877F2', display: 'inline-flex', alignItems: 'center', gap: 3 }}>
            Documentação <ExternalLink size={10} />
          </a>
        </div>
      )}

      {/* Config manual */}
      <button
        onClick={() => setShowManual(v => !v)}
        style={{
          background: 'none', border: 'none', cursor: 'pointer', textAlign: 'left',
          fontSize: 11, color: 'var(--muted)', padding: '4px 0',
          display: 'flex', alignItems: 'center', gap: 4,
        }}>
        <span style={{ transform: showManual ? 'rotate(90deg)' : 'none', display: 'inline-block', transition: 'transform .15s' }}>▶</span>
        Configurar manualmente
      </button>

      {showManual && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10, padding: '10px 12px', borderRadius: 8, border: '1px solid var(--border)', background: 'var(--panel)' }}>
          <div>
            <label style={labelStyle}>Phone Number ID</label>
            <input
              style={inputStyle}
              placeholder="123456789012345"
              autoComplete="off"
              value={form.whatsapp_phone_number_id}
              onChange={e => setForm(p => ({ ...p, whatsapp_phone_number_id: e.target.value }))} />
            <div style={{ fontSize: 9, color: 'var(--muted)', marginTop: 3 }}>
              Meta Developer Console → WhatsApp → Getting Started
            </div>
          </div>

          <div>
            <label style={labelStyle}>API Token (acesso permanente)</label>
            <div style={{ position: 'relative' }}>
              <input
                type={showToken ? 'text' : 'password'}
                style={{ ...inputStyle, paddingRight: 32 }}
                placeholder="EAAT…"
                autoComplete="new-password"
                value={form.whatsapp_api_token}
                onChange={e => setForm(p => ({ ...p, whatsapp_api_token: e.target.value }))} />
              <button onClick={() => setShowToken(v => !v)}
                style={{ position: 'absolute', right: 8, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: 'var(--muted)', display: 'flex' }}>
                {showToken ? <EyeOff size={13} /> : <Eye size={13} />}
              </button>
            </div>
          </div>

          <div>
            <label style={labelStyle}>Verify Token (webhook)</label>
            <input
              style={inputStyle}
              placeholder="token-aleatorio-seguro"
              autoComplete="off"
              value={form.whatsapp_verify_token}
              onChange={e => setForm(p => ({ ...p, whatsapp_verify_token: e.target.value }))} />
            <div style={{ fontSize: 9, color: 'var(--muted)', marginTop: 3 }}>
              Mesmo valor configurado no Meta Developer Console → Webhooks
            </div>
          </div>

          <div>
            <label style={labelStyle}>App Secret</label>
            <div style={{ position: 'relative' }}>
              <input
                type={showSecret ? 'text' : 'password'}
                style={{ ...inputStyle, paddingRight: 32 }}
                placeholder="App Secret do Facebook App"
                autoComplete="new-password"
                value={form.whatsapp_app_secret}
                onChange={e => setForm(p => ({ ...p, whatsapp_app_secret: e.target.value }))} />
              <button onClick={() => setShowSecret(v => !v)}
                style={{ position: 'absolute', right: 8, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: 'var(--muted)', display: 'flex' }}>
                {showSecret ? <EyeOff size={13} /> : <Eye size={13} />}
              </button>
            </div>
            <div style={{ fontSize: 9, color: 'var(--muted)', marginTop: 3 }}>
              Meta Developer Console → Configurações → Básico
            </div>
          </div>

          <button
            onClick={saveManual}
            disabled={saving}
            style={{
              padding: '8px', borderRadius: 6, border: 'none', cursor: saving ? 'default' : 'pointer',
              background: '#14C38E', color: '#fff', fontSize: 12, fontWeight: 600,
              opacity: saving ? 0.6 : 1,
            }}>
            {saving ? 'Salvando…' : 'Salvar credenciais'}
          </button>

          <div style={{ fontSize: 9, color: 'var(--muted)', lineHeight: 1.5, borderTop: '1px solid var(--border)', paddingTop: 8 }}>
            🔒 Credenciais salvas com criptografia server-side. O browser nunca recebe os valores reais.
          </div>
        </div>
      )}
    </section>
  )
}
