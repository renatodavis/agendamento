import type { Metadata } from 'next'
import Link from 'next/link'
import MarketingShell, { Breadcrumbs, JsonLd } from '@/components/marketing/MarketingShell'
import { POSTS, fmtDate } from '@/lib/blog'
import { SITE_URL, SITE_NAME, openGraphFor } from '@/lib/site'

const TITLE = 'Blog: agenda, WhatsApp e gestão de clínicas'
const DESCRIPTION = 'Artigos práticos para clínicas e consultórios: como reduzir faltas, organizar a agenda e atender pacientes pelo WhatsApp.'

export const metadata: Metadata = {
  title: TITLE,
  description: DESCRIPTION,
  alternates: { canonical: '/blog' },
  openGraph: openGraphFor('/blog', TITLE, DESCRIPTION),
}

export default function BlogIndex() {
  const posts = [...POSTS].sort((a, b) => b.datePublished.localeCompare(a.datePublished))
  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'Blog',
    '@id': `${SITE_URL}/blog#blog`,
    name: `Blog ${SITE_NAME}`,
    url: `${SITE_URL}/blog`,
    inLanguage: 'pt-BR',
    publisher: { '@id': `${SITE_URL}/#organization` },
    blogPost: posts.map(p => ({ '@type': 'BlogPosting', headline: p.title, url: `${SITE_URL}/blog/${p.slug}`, datePublished: p.datePublished })),
  }

  return (
    <MarketingShell>
      <JsonLd data={jsonLd} />
      <section className="mk-hero">
        <div className="mk-narrow">
          <Breadcrumbs items={[{ name: 'Início', href: '/' }, { name: 'Blog', href: '/blog' }]} />
          <h1>{TITLE}</h1>
          <p className="mk-lead">{DESCRIPTION}</p>
          <div className="mk-grid" style={{ gridTemplateColumns: '1fr' }}>
            {posts.map(p => (
              <Link key={p.slug} href={`/blog/${p.slug}`} className="mk-card">
                <p style={{ fontSize: 13, marginBottom: 6 }}>{fmtDate(p.datePublished)} · {p.readingMinutes} min de leitura</p>
                <h2 style={{ fontSize: '1.25rem', fontWeight: 800, margin: '0 0 6px' }}>{p.title}</h2>
                <p>{p.description}</p>
              </Link>
            ))}
          </div>
        </div>
      </section>
    </MarketingShell>
  )
}
