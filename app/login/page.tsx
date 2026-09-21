'use client'
import { useState } from 'react'
import { createBrowserClient } from '@supabase/ssr'
import { useRouter } from 'next/navigation'

export default function LoginPage() {
  const router = useRouter()
  const [email, setEmail]       = useState('')
  const [password, setPassword] = useState('')
  const [error, setError]       = useState<string | null>(null)
  const [loading, setLoading]   = useState(false)

  const sb = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    setLoading(true)
    const { error } = await sb.auth.signInWithPassword({ email, password })
    if (error) {
      setError('E-mail ou senha incorretos.')
      setLoading(false)
    } else {
      router.push('/')
      router.refresh()
    }
  }

  return (
    <div style={{
      minHeight: '100dvh', display: 'flex', alignItems: 'center',
      justifyContent: 'center', padding: '16px',
      background: 'var(--background, #F0F5FA)',
    }}>
      <div style={{
        width: '100%', maxWidth: 380,
        background: 'var(--card, #FFFFFF)',
        borderRadius: 16, border: '1px solid var(--border, #E2E7EF)',
        padding: '36px 28px',
        boxShadow: '0 4px 24px rgba(15,25,35,.08)',
      }}>

        {/* Logo */}
        <div style={{ textAlign: 'center', marginBottom: 28 }}>
          <div style={{
            width: 54, height: 54, borderRadius: 14, margin: '0 auto 12px',
            background: 'linear-gradient(135deg, #059669 0%, #0F766E 100%)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 26, boxShadow: '0 4px 12px rgba(5,150,105,.3)',
          }}>🏥</div>
          <div style={{ fontWeight: 700, fontSize: 18, letterSpacing: '-.01em', color: 'var(--foreground, #0F1923)' }}>
            Clínica São Lucas
          </div>
          <div style={{ fontSize: 11, marginTop: 4, color: 'var(--muted, #6B7A90)', textTransform: 'uppercase', letterSpacing: '.07em' }}>
            Acesso restrito · Recepção
          </div>
        </div>

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>

          <div>
            <label style={{
              display: 'block', fontSize: 11, fontWeight: 600,
              color: 'var(--muted, #6B7A90)', textTransform: 'uppercase',
              letterSpacing: '.06em', marginBottom: 6,
            }}>E-mail</label>
            <input
              type="email" required autoComplete="email"
              value={email} onChange={e => setEmail(e.target.value)}
              placeholder="recepcao@clinicasaolucas.com.br"
              style={{
                width: '100%', padding: '10px 12px', borderRadius: 8,
                border: '1px solid var(--border, #E2E7EF)',
                background: 'var(--background, #F4F6F9)',
                fontSize: 13, outline: 'none',
                color: 'var(--foreground, #0F1923)',
                boxSizing: 'border-box',
              }}
            />
          </div>

          <div>
            <label style={{
              display: 'block', fontSize: 11, fontWeight: 600,
              color: 'var(--muted, #6B7A90)', textTransform: 'uppercase',
              letterSpacing: '.06em', marginBottom: 6,
            }}>Senha</label>
            <input
              type="password" required autoComplete="current-password"
              value={password} onChange={e => setPassword(e.target.value)}
              placeholder="••••••••"
              style={{
                width: '100%', padding: '10px 12px', borderRadius: 8,
                border: '1px solid var(--border, #E2E7EF)',
                background: 'var(--background, #F4F6F9)',
                fontSize: 13, outline: 'none',
                color: 'var(--foreground, #0F1923)',
                boxSizing: 'border-box',
              }}
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
