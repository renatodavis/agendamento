'use client'
import { useState, Suspense } from 'react'
import { createBrowserClient } from '@supabase/ssr'
import { useRouter, useSearchParams } from 'next/navigation'

function LoginPageInner() {
  const router = useRouter()
  const searchParams = useSearchParams()

  const setup = searchParams.get('setup') === 'true'
  const callbackError = searchParams.get('error') === 'callback'

  const [email, setEmail]             = useState('')
  const [password, setPassword]       = useState('')
  const [confirmPassword, setConfirm] = useState('')
  const [error, setError]             = useState<string | null>(
    callbackError ? 'Link de convite inválido ou expirado. Solicite um novo convite.' : null
  )
  const [loading, setLoading] = useState(false)

  const sb = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )

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
    if (password !== confirmPassword) { setError('As senhas não coincidem.'); return }
    if (password.length < 8) { setError('A senha deve ter no mínimo 8 caracteres.'); return }
    setLoading(true)
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
    minHeight: '100dvh',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '16px',
    background: 'var(--background)',
  }

  const cardStyle: React.CSSProperties = {
    width: '100%',
    maxWidth: 380,
    background: 'var(--panel)',
    borderRadius: 20,
    border: '1px solid var(--border)',
    padding: '40px 32px',
    boxShadow: 'var(--shadow-md)',
  }

  const inputStyle: React.CSSProperties = {
    width: '100%', padding: '11px 13px', borderRadius: 10,
    border: '1px solid var(--border)',
    background: 'var(--card)',
    fontSize: 13, outline: 'none',
    color: 'var(--foreground)',
    boxSizing: 'border-box',
    transition: 'border-color .15s',
  }

  const labelStyle: React.CSSProperties = {
    display: 'block', fontSize: 11, fontWeight: 600,
    color: 'var(--muted)', textTransform: 'uppercase',
    letterSpacing: '.06em', marginBottom: 6,
  }

  const btnStyle = (disabled: boolean): React.CSSProperties => ({
    width: '100%', padding: '12px', borderRadius: 10, border: 'none',
    background: disabled ? 'var(--border)' : 'var(--accent)',
    color: '#fff', fontSize: 14, fontWeight: 700,
    cursor: disabled ? 'default' : 'pointer',
    transition: 'opacity .15s, transform .1s',
    marginTop: 6, letterSpacing: '.01em',
    opacity: disabled ? .6 : 1,
  })

  const logoSection = (
    <div style={{ textAlign: 'center', marginBottom: 32 }}>
      {/* Brand mark */}
      <div style={{
        width: 58, height: 58, borderRadius: 16, margin: '0 auto 14px',
        background: 'linear-gradient(135deg, var(--accent) 0%, #1aae53 100%)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontSize: 28, boxShadow: '0 4px 16px rgba(37,211,102,.3)',
      }}>
        📅
      </div>

      {/* Brand name */}
      <div style={{ fontWeight: 800, fontSize: 20, letterSpacing: '-.02em', color: 'var(--foreground)', lineHeight: 1 }}>
        Agenda<span style={{ color: 'var(--accent)' }}>Agentic</span>
      </div>

      {/* Subtitle */}
      <div style={{ fontSize: 12, marginTop: 6, color: 'var(--muted)', letterSpacing: '.04em' }}>
        {setup ? 'Defina sua senha de acesso' : 'Sistema de Agendamento'}
      </div>
    </div>
  )

  if (setup) {
    return (
      <div style={containerStyle}>
        <div style={cardStyle}>
          {logoSection}

          <p style={{ fontSize: 13, color: 'var(--muted)', marginBottom: 20, lineHeight: 1.5, textAlign: 'center' }}>
            Bem-vindo! Crie uma senha para ativar seu acesso.
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

            {error && <ErrorBox message={error} />}

            <button type="submit" disabled={loading} style={btnStyle(loading)}>
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
              placeholder="seu@email.com"
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

          {error && <ErrorBox message={error} />}

          <button type="submit" disabled={loading} style={btnStyle(loading)}>
            {loading ? 'Entrando…' : 'Entrar'}
          </button>
        </form>
      </div>
    </div>
  )
}

function ErrorBox({ message }: { message: string }) {
  return (
    <div style={{
      padding: '9px 12px', borderRadius: 8, fontSize: 12,
      background: 'rgba(220,53,69,.08)', border: '1px solid rgba(220,53,69,.3)',
      color: 'var(--red)', lineHeight: 1.4,
    }}>
      {message}
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
