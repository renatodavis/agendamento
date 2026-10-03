import { NextRequest, NextResponse } from 'next/server'

const GITHUB_REPO = 'renatodavis/agendamento'
const WORKFLOW_FILE = 'novo-cliente.yml'

export async function POST(req: NextRequest) {
  const adminSecret = process.env.ADMIN_SECRET
  const githubPat = process.env.GITHUB_PAT

  if (!adminSecret || !githubPat) {
    return NextResponse.json({ error: 'Servidor mal configurado' }, { status: 500 })
  }

  const authHeader = req.headers.get('authorization') ?? ''
  const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : ''

  if (token !== adminSecret) {
    return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
  }

  const body = await req.json()
  const { slug, name } = body as { slug: string; name: string }

  if (!slug || !name) {
    return NextResponse.json({ error: 'slug e name são obrigatórios' }, { status: 400 })
  }

  const slugNormalizado = slug.toLowerCase().replace(/[^a-z0-9-]/g, '-')

  const response = await fetch(
    `https://api.github.com/repos/${GITHUB_REPO}/actions/workflows/${WORKFLOW_FILE}/dispatches`,
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${githubPat}`,
        Accept: 'application/vnd.github+json',
        'X-GitHub-Api-Version': '2022-11-28',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        ref: 'main',
        inputs: { slug: slugNormalizado, name },
      }),
    }
  )

  if (!response.ok) {
    const text = await response.text()
    console.error('GitHub API error:', response.status, text)
    return NextResponse.json({ error: 'Falha ao disparar workflow' }, { status: 502 })
  }

  return NextResponse.json({ ok: true, slug: slugNormalizado })
}
