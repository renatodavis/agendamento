'use client'

import { useState } from 'react'
import { provisionar } from './actions'

export default function NovoClientePage() {
  const [form, setForm] = useState({ slug: '', name: '' })
  const [status, setStatus] = useState<'idle' | 'loading' | 'ok' | 'error'>('idle')
  const [error, setError] = useState('')
  const [sentSlug, setSentSlug] = useState('')
  const [sentName, setSentName] = useState('')

  function toSlug(value: string) {
    return value.toLowerCase().replace(/[^a-z0-9-]/g, '-')
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setStatus('loading')
    setError('')

    const result = await provisionar(form.slug, form.name)

    if (!result.ok) {
      setStatus('error')
      setError(result.error)
      return
    }

    setSentSlug(result.slug)
    setSentName(form.name)
    setStatus('ok')
  }

  if (status === 'ok') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
        <div className="w-full max-w-md bg-white rounded-2xl shadow p-8 space-y-6 text-center">
          <div className="flex justify-center">
            <div className="w-14 h-14 rounded-full bg-green-100 flex items-center justify-center">
              <svg className="w-7 h-7 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
              </svg>
            </div>
          </div>
          <div>
            <h1 className="text-xl font-semibold text-gray-900">Workflow disparado!</h1>
            <p className="text-sm text-gray-500 mt-1">
              Provisionamento de <span className="font-medium text-gray-700">{sentName}</span> iniciado.
            </p>
          </div>
          <div className="bg-gray-50 rounded-lg px-4 py-3 text-left space-y-1">
            <p className="text-xs text-gray-500">Slug</p>
            <p className="text-sm font-mono text-gray-800">{sentSlug}</p>
          </div>
          <p className="text-xs text-gray-400">
            Acompanhe em{' '}
            <a
              href="https://github.com/renatodavis/agendamento/actions"
              target="_blank"
              rel="noopener noreferrer"
              className="text-green-600 hover:underline"
            >
              github.com/renatodavis/agendamento/actions
            </a>
            {' '}— leva ~10 min.
          </p>
          <button
            onClick={() => {
              setStatus('idle')
              setForm({ slug: '', name: '' })
            }}
            className="w-full border border-gray-300 text-gray-700 py-2 rounded-lg text-sm font-medium hover:bg-gray-50 transition-colors"
          >
            Provisionar outro cliente
          </button>
        </div>
      </div>
    )
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

          <button
            type="submit"
            disabled={status === 'loading'}
            className="w-full bg-green-600 text-white py-2 rounded-lg text-sm font-medium hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {status === 'loading' ? 'Disparando workflow…' : 'Provisionar cliente'}
          </button>
        </form>

        {error && (
          <div className="rounded-lg px-4 py-3 text-sm bg-red-50 text-red-800 border border-red-200">
            {error}
          </div>
        )}
      </div>
    </div>
  )
}
