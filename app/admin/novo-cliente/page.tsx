'use client'

import { useState } from 'react'

export default function NovoClientePage() {
  const [form, setForm] = useState({ slug: '', name: '', secret: '' })
  const [status, setStatus] = useState<'idle' | 'loading' | 'ok' | 'error'>('idle')
  const [message, setMessage] = useState('')

  function toSlug(value: string) {
    return value.toLowerCase().replace(/[^a-z0-9-]/g, '-')
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setStatus('loading')
    setMessage('')

    try {
      const res = await fetch('/api/admin/provisionar', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      })
      const data = await res.json()

      if (!res.ok) {
        setStatus('error')
        setMessage(data.error ?? 'Erro desconhecido')
        return
      }

      setStatus('ok')
      setMessage(
        `Workflow disparado para "${form.name}" (slug: ${data.slug}). ` +
        `Acompanhe em github.com/renatodavis/agendamento/actions — leva ~10 min.`
      )
      setForm({ slug: '', name: '', secret: '' })
    } catch {
      setStatus('error')
      setMessage('Erro de rede')
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
      <div className="w-full max-w-md bg-white rounded-2xl shadow p-8 space-y-6">
        <div>
          <h1 className="text-xl font-semibold text-gray-900">Provisionar novo cliente</h1>
          <p className="text-sm text-gray-500 mt-1">
            Cria Supabase + Vercel + aplica migrações automaticamente.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Nome do cliente
            </label>
            <input
              type="text"
              placeholder="Clínica Exemplo"
              value={form.name}
              onChange={e => {
                const name = e.target.value
                setForm(f => ({
                  ...f,
                  name,
                  slug: f.slug === '' || f.slug === toSlug(f.name) ? toSlug(name) : f.slug,
                }))
              }}
              required
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Slug <span className="text-gray-400 font-normal">(identificador único, sem espaços)</span>
            </label>
            <input
              type="text"
              placeholder="clinica-exemplo"
              value={form.slug}
              onChange={e => setForm(f => ({ ...f, slug: toSlug(e.target.value) }))}
              required
              pattern="[-a-z0-9]+"
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-green-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Senha admin
            </label>
            <input
              type="password"
              value={form.secret}
              onChange={e => setForm(f => ({ ...f, secret: e.target.value }))}
              required
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
            />
          </div>

          <button
            type="submit"
            disabled={status === 'loading'}
            className="w-full bg-green-600 text-white py-2 rounded-lg text-sm font-medium hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {status === 'loading' ? 'Disparando workflow…' : 'Provisionar cliente'}
          </button>
        </form>

        {message && (
          <div className={`rounded-lg px-4 py-3 text-sm ${
            status === 'ok'
              ? 'bg-green-50 text-green-800 border border-green-200'
              : 'bg-red-50 text-red-800 border border-red-200'
          }`}>
            {message}
          </div>
        )}
      </div>
    </div>
  )
}
