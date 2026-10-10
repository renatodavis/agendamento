import type { Metadata } from 'next'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import MarketingShell, { Breadcrumbs, DemoButton, JsonLd } from '@/components/marketing/MarketingShell'
import { POSTS, getPost, fmtDate } from '@/lib/blog'
import { SITE_URL, SITE_NAME, openGraphFor } from '@/lib/site'

export const dynamicParams = false

export function generateStaticParams() {
  return POSTS.map(p => ({ slug: p.slug }))
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const post = getPost((await params).slug)
  if (!post) return {}
  const path = `/blog/${post.slug}`
  return {
    title: post.title,
    description: post.description,
    alternates: { canonical: path },
    openGraph: openGraphFor(path, post.title, post.description, {
      type: 'article',
      publishedTime: post.datePublished,
      modifiedTime: post.dateModified,
    }),
  }
}

export default async function PostPage({ params }: { params: Promise<{ slug: string }> }) {
  const post = getPost((await params).slug)
  if (!post) notFound()
  const url = `${SITE_URL}/blog/${post.slug}`

  const jsonLd = {
    '@context': 'https://schema.org',
    '@graph': [
      {
        '@type': 'BlogPosting',
        '@id': `${url}#post`,
        headline: post.title,
        description: post.description,
        url,
        mainEntityOfPage: url,
        datePublished: post.datePublished,
        dateModified: post.dateModified,
        inLanguage: 'pt-BR',
        author: { '@id': `${SITE_URL}/#organization` },
        publisher: { '@id': `${SITE_URL}/#organization` },
        image: `${SITE_URL}/opengraph-image`,
      },
      {
        '@type': 'BreadcrumbList',
        itemListElement: [
          { '@type': 'ListItem', position: 1, name: SITE_NAME, item: SITE_URL },
          { '@type': 'ListItem', position: 2, name: 'Blog', item: `${SITE_URL}/blog` },
          { '@type': 'ListItem', position: 3, name: post.title, item: url },
        ],
      },
    ],
  }

  return (
    <MarketingShell>
      <JsonLd data={jsonLd} />
      <article className="mk-hero">
        <div className="mk-narrow">
          <Breadcrumbs items={[{ name: 'Início', href: '/' }, { name: 'Blog', href: '/blog' }, { name: post.title, href: `/blog/${post.slug}` }]} />
          <h1>{post.title}</h1>
          <p className="mk-meta">
            <time dateTime={post.datePublished}>{fmtDate(post.datePublished)}</time> · {post.readingMinutes} min de leitura · Equipe {SITE_NAME}
          </p>

          <div className="mk-prose">
            {post.body.map((b, i) =>
              b.type === 'h2' ? <h2 key={i}>{b.text}</h2>
              : b.type === 'ul' ? <ul key={i}>{b.items.map(it => <li key={it}>{it}</li>)}</ul>
              : <p key={i}>{b.text}</p>,
            )}
          </div>

          <div className="mk-cta" style={{ marginTop: 40 }}>
            <h2>Automatize o agendamento da sua clínica</h2>
            <p>O AgendaAgentic agenda, confirma e lembra pelo WhatsApp da clínica.</p>
            <DemoButton />
          </div>

          <h2 style={{ fontSize: '1.2rem', fontWeight: 800, margin: '0 0 12px' }}>Leia também</h2>
          <div className="mk-grid" style={{ gridTemplateColumns: '1fr', marginBottom: 48 }}>
            {post.related.map(r => (
              <Link key={r.href} href={r.href} className="mk-card"><h3>{r.label}</h3></Link>
            ))}
            {POSTS.filter(p => p.slug !== post.slug).map(p => (
              <Link key={p.slug} href={`/blog/${p.slug}`} className="mk-card"><h3>{p.title}</h3></Link>
            ))}
          </div>
        </div>
      </article>
    </MarketingShell>
  )
}
