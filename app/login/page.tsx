'use client'
import { useState, useEffect, Suspense } from 'react'
import { createBrowserClient } from '@supabase/ssr'
import { useRouter } from 'next/navigation'
import { useClinicName } from '@/lib/useClinicName'

function LoginPageInner() {
  const router = useRouter()
  const clinicName = useClinicName()

  const [mode, setMode] = useState<'login' | 'set-password'>('login')

  const [email, setEmail]           = useState('')
  const [password, setPassword]     = useState('')
  const [confirmPassword, setConfirm] = useState('')
  const [error, setError]           = useState<string | null>(null)
  const [loading, setLoading]       = useState(false)

  const sb = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )

  useEffect(() => {
    // Supabase invite links redirect back with a hash fragment:
    //   #access_token=...&type=invite&...
    const hash = window.location.hash
    const params = new URLSearchParams(hash.replace(/^#/, ''))
    if (params.get('type') === 'invite' && params.get('access_token')) {
      setMode('set-password')
    }
  }, [])

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    setLoading(true)
    const { error } = await sb.auth.signInWithPassword({ email, password })
    if (error) {
      setError('E-mail ou senha incorretos.')
      setLoading(false)
    } else {
      router.push('/dashboard')
      router.refresh()
    }
  }

  async function handleSetPassword(e: React.FormEvent) {
    e.preventDefault()
    setError(null)

    if (password !== confirmPassword) {
      setError('As senhas não coincidem.')
      return
    }
    if (password.length < 8) {
      setError('A senha deve ter no mínimo 8 caracteres.')
      return
    }

    setLoading(true)

    // The hash fragment already established a session via Supabase's PKCE flow.
    // Just update the password.
    const { error: updateError } = await sb.auth.updateUser({ password })
    if (updateError) {
      setError('Erro ao definir senha: ' + updateError.message)
      setLoading(false)
      return
    }

    router.push('/dashboard')
    router.refresh()
  }

  const containerStyle: React.CSSProperties = {
    minHeight: '100dvh', display: 'flex', alignItems: 'center',
    justifyContent: 'center', padding: '16px',
    background: 'var(--background, #F0F5FA)',
  }

  const cardStyle: React.CSSProperties = {
    width: '100%', maxWidth: 380,
    background: 'var(--card, #FFFFFF)',
    borderRadius: 16, border: '1px solid var(--border, #E2E7EF)',
    padding: '36px 28px',
    boxShadow: '0 4px 24px rgba(15,25,35,.08)',
  }

  const inputStyle: React.CSSProperties = {
    width: '100%', padding: '10px 12px', borderRadius: 8,
    border: '1px solid var(--border, #E2E7EF)',
    background: 'var(--background, #F4F6F9)',
    fontSize: 13, outline: 'none',
    color: 'var(--foreground, #0F1923)',
    boxSizing: 'border-box',
  }

  const labelStyle: React.CSSProperties = {
    display: 'block', fontSize: 11, fontWeight: 600,
    color: 'var(--muted, #6B7A90)', textTransform: 'uppercase',
    letterSpacing: '.06em', marginBottom: 6,
  }

  const logoSection = (
    <div style={{ textAlign: 'center', marginBottom: 28 }}>
      <div style={{
        width: 54, height: 54, borderRadius: 14, margin: '0 auto 12px',
        background: 'linear-gradient(135deg, #059669 0%, #0F766E 100%)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontSize: 26, boxShadow: '0 4px 12px rgba(5,150,105,.3)',
      }}>🏥</div>
      <div style={{ fontWeight: 700, fontSize: 18, letterSpacing: '-.01em', color: 'var(--foreground, #0F1923)' }}>
        {clinicName}
      </div>
      <div style={{ fontSize: 11, marginTop: 4, color: 'var(--muted, #6B7A90)', textTransform: 'uppercase', letterSpacing: '.07em' }}>
        {mode === 'set-password' ? 'Definir senha de acesso' : 'Acesso restrito · Recepção'}
      </div>
    </div>
  )

  if (mode === 'set-password') {
    return (
      <div style={containerStyle}>
        <div style={cardStyle}>
          {logoSection}

          <p style={{ fontSize: 13, color: 'var(--muted, #6B7A90)', marginBottom: 20, lineHeight: 1.5 }}>
            Bem-vindo! Defina uma senha para ativar seu acesso.
          </p>

          <form onSubmit={handleSetPassword} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            <div>
              <label style={labelStyle}>Nova senha</label>
              <input
                type="password" required autoComplete="new-password" minLength={8}
                value={password} onChange={e => setPassword(e.target.value)}
                placeholder="Mínimo 8 caracteres"
                style={inputStyle}
              />
            </div>

            <div>
              <label style={labelStyle}>Confirmar senha</label>
              <input
                type="password" required autoComplete="new-password" minLength={8}
                value={confirmPassword} onChange={e => setConfirm(e.target.value)}
                placeholder="Repita a senha"
                style={inputStyle}
              />
            </div>

            {error && (
              <div style={{
                padding: '8px 12px', borderRadius: 8, fontSize: 12,
                background: '#FEF2F2', border: '1px solid #FCA5A5', color: '#DC2626',
              }}>
                {error}
              </div>
            )}

            <button
              type="submit" disabled={loading}
              style={{
                padding: '11px', borderRadius: 8, border: 'none',
                background: loading ? '#6EE7B7' : '#059669',
                color: '#fff', fontSize: 14, fontWeight: 600,
                cursor: loading ? 'default' : 'pointer',
                transition: 'background .15s', marginTop: 4,
              }}
            >
              {loading ? 'Salvando…' : 'Definir senha e entrar'}
            </button>
          </form>
        </div>
      </div>
    )
  }

  return (
    <div style={containerStyle}>
      <div style={cardStyle}>
        {logoSection}

        <form onSubmit={handleLogin} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <div>
            <label style={labelStyle}>E-mail</label>
            <input
              type="email" required autoComplete="email"
              value={email} onChange={e => setEmail(e.target.value)}
              placeholder="recepcao@clinicasaolucas.com.br"
              style={inputStyle}
            />
          </div>

          <div>
            <label style={labelStyle}>Senha</label>
            <input
              type="password" required autoComplete="current-password"
              value={password} onChange={e => setPassword(e.target.value)}
              placeholder="••••••••"
              style={inputStyle}
            />
          </div>

          {error && (
            <div style={{
              padding: '8px 12px', borderRadius: 8, fontSize: 12,
              background: '#FEF2F2', border: '1px solid #FCA5A5', color: '#DC2626',
            }}>
              {error}
            </div>
          )}

          <button
            type="submit" disabled={loading}
            style={{
              padding: '11px', borderRadius: 8, border: 'none',
              background: loading ? '#6EE7B7' : '#059669',
              color: '#fff', fontSize: 14, fontWeight: 600,
              cursor: loading ? 'default' : 'pointer',
              transition: 'background .15s', marginTop: 4,
            }}
          >
            {loading ? 'Entrando…' : 'Entrar'}
          </button>
        </form>
      </div>
    </div>
  )
}

export default function LoginPage() {
  return (
    <Suspense>
      <LoginPageInner />
    </Suspense>
  )
}
