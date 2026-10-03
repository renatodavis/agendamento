'use server'

const GITHUB_REPO = 'renatodavis/agendamento'
const WORKFLOW_FILE = 'novo-cliente.yml'

export async function provisionar(slug: string, name: string): Promise<{ ok: true; slug: string } | { ok: false; error: string }> {
  const adminSecret = process.env.ADMIN_SECRET
  const githubPat = process.env.GITHUB_PAT

  if (!githubPat) {
    return { ok: false, error: 'GITHUB_PAT não configurado no servidor' }
  }
  if (!adminSecret) {
    return { ok: false, error: 'ADMIN_SECRET não configurado no servidor' }
  }

  if (!slug || !name) {
    return { ok: false, error: 'slug e name são obrigatórios' }
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
    return { ok: false, error: `GitHub API ${response.status}: ${text}` }
  }

  return { ok: true, slug: slugNormalizado }
}
