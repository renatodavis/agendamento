import Link from 'next/link'
import MarketingShell, { Breadcrumbs, DemoButton, JsonLd } from './MarketingShell'
import type { Segment } from '@/lib/segments'
import { SEGMENTS } from '@/lib/segments'
import { SITE_URL, SITE_NAME } from '@/lib/site'

export default function SegmentPage({ segment: s }: { segment: Segment }) {
  const url = `${SITE_URL}/${s.slug}`
  const others = SEGMENTS.filter(o => o.slug !== s.slug)

  const jsonLd = {
    '@context': 'https://schema.org',
    '@graph': [
      {
        '@type': 'WebPage',
        '@id': `${url}#webpage`,
        url,
        name: s.title,
        description: s.description,
        inLanguage: 'pt-BR',
        isPartOf: { '@id': `${SITE_URL}/#website` },
        about: { '@id': `${SITE_URL}/#software` },
        dateModified: s.lastModified,
      },
      {
        '@type': 'BreadcrumbList',
        itemListElement: [
          { '@type': 'ListItem', position: 1, name: SITE_NAME, item: SITE_URL },
          { '@type': 'ListItem', position: 2, name: s.kicker, item: url },
        ],
      },
    ],
  }

  return (
    <MarketingShell>
      <JsonLd data={jsonLd} />

      <section className="mk-hero">
        <div className="mk-wrap mk-hero-grid">
          <div>
            <Breadcrumbs items={[{ name: 'Início', href: '/' }, { name: s.kicker, href: `/${s.slug}` }]} />
            <span className="mk-kicker">{s.kicker}</span>
            <h1>{s.h1}</h1>
            <p className="mk-lead">{s.lead}</p>
            <div className="mk-actions">
              <DemoButton />
              <Link href="/perguntas-frequentes" className="mk-btn mk-btn-ghost">Perguntas frequentes</Link>
            </div>
          </div>
          <div className="mk-chat" aria-label={s.chatTitle}>
            <div className="mk-chat-title">{s.chatTitle}</div>
            {s.chat.map((m, i) => (
              <div key={i} className={`mk-bubble ${m.from === 'paciente' ? 'out' : 'in'}`}>{m.text}</div>
            ))}
          </div>
        </div>
      </section>

      <section className="mk-section">
        <div className="mk-wrap">
          <h2>O que trava a agenda hoje</h2>
          <p className="mk-section-sub">Problemas que o assistente resolve no dia a dia da recepção.</p>
          <div className="mk-grid">
            {s.pains.map(p => (
              <div key={p.title} className="mk-card"><h3>{p.title}</h3><p>{p.text}</p></div>
            ))}
          </div>
        </div>
      </section>

      <section className="mk-section">
        <div className="mk-wrap">
          <h2>Como o AgendaAgentic ajuda</h2>
          <p className="mk-section-sub">
            A inteligência artificial cuida das conversas de agendamento. A equipe decide as exceções pelo painel.
          </p>
          <div className="mk-grid">
            {s.features.map(f => (
              <div key={f.title} className="mk-card"><h3>{f.title}</h3><p>{f.text}</p></div>
            ))}
          </div>
        </div>
      </section>

      <section className="mk-section">
        <div className="mk-narrow">
          <h2>Perguntas comuns</h2>
          <div className="mk-faq">
            {s.faq.map(f => (
              <details key={f.q}><summary>{f.q}</summary><p>{f.a}</p></details>
            ))}
          </div>
          <p className="mk-section-sub" style={{ marginTop: 20 }}>
            Tem outra dúvida? Veja todas as <Link href="/perguntas-frequentes">perguntas frequentes</Link>.
          </p>
        </div>
      </section>

      <section className="mk-section">
        <div className="mk-wrap">
          <h2>Também atendemos</h2>
          <div className="mk-grid">
            {others.map(o => (
              <Link key={o.slug} href={`/${o.slug}`} className="mk-card">
                <h3>{o.kicker}</h3>
                <p>{o.description}</p>
              </Link>
            ))}
          </div>
        </div>
      </section>

      <div className="mk-wrap">
        <div className="mk-cta">
          <h2>Veja o assistente atendendo no WhatsApp</h2>
          <p>{s.ctaText}</p>
          <DemoButton />
        </div>
      </div>
    </MarketingShell>
  )
}
