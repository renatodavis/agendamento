import type { Metadata } from 'next'
import Link from 'next/link'
import { Check, X } from 'lucide-react'
import MarketingShell, { Breadcrumbs, DemoButton, JsonLd } from '@/components/marketing/MarketingShell'
import { NICHE_GROUPS, NOT_A_FIT } from '@/lib/niches'
import { SITE_URL, SITE_NAME, openGraphFor } from '@/lib/site'

const TITLE = 'Agendamento pelo WhatsApp para cada tipo de negócio'
const DESCRIPTION =
  'Clínicas, consultórios, salões, barbearias, personal trainers e outros negócios com hora marcada: veja como o assistente de agendamento com IA se adapta ao seu.'

export const metadata: Metadata = {
  title: TITLE,
  description: DESCRIPTION,
  alternates: { canonical: '/segmentos' },
  openGraph: openGraphFor('/segmentos', TITLE, DESCRIPTION),
}

const FIT = [
  'Atendimento individual com hora marcada',
  'Um ou mais profissionais, cada um com sua agenda',
  'Serviços com duração definida',
  'Clientes que já procuram o negócio pelo WhatsApp',
]

const linked = NICHE_GROUPS.flatMap(g => g.niches).filter(n => n.href)

const jsonLd = {
  '@context': 'https://schema.org',
  '@graph': [
    {
      '@type': 'CollectionPage',
      '@id': `${SITE_URL}/segmentos#page`,
      url: `${SITE_URL}/segmentos`,
      name: TITLE,
      description: DESCRIPTION,
      inLanguage: 'pt-BR',
      isPartOf: { '@id': `${SITE_URL}/#website` },
      mainEntity: {
        '@type': 'ItemList',
        itemListElement: linked.map((n, i) => ({ '@type': 'ListItem', position: i + 1, name: n.name, url: `${SITE_URL}${n.href}` })),
      },
    },
    {
      '@type': 'BreadcrumbList',
      itemListElement: [
        { '@type': 'ListItem', position: 1, name: SITE_NAME, item: SITE_URL },
        { '@type': 'ListItem', position: 2, name: 'Segmentos', item: `${SITE_URL}/segmentos` },
      ],
    },
  ],
}

export default function SegmentosPage() {
  return (
    <MarketingShell>
      <JsonLd data={jsonLd} />

      <section className="mk-hero">
        <div className="mk-wrap">
          <Breadcrumbs items={[{ name: 'Início', href: '/' }, { name: 'Segmentos', href: '/segmentos' }]} />
          <span className="mk-kicker">Segmentos</span>
          <h1 style={{ maxWidth: '20ch' }}>{TITLE}</h1>
          <p className="mk-lead">
            O AgendaAgentic atende qualquer negócio que trabalha com hora marcada. O vocabulário se adapta:
            paciente ou cliente, consulta ou atendimento. Os serviços, profissionais e horários são os seus.
          </p>
        </div>
      </section>

      {NICHE_GROUPS.map(g => (
        <section key={g.id} className="mk-section" id={g.id}>
          <div className="mk-wrap">
            <h2>{g.title}</h2>
            <p className="mk-section-sub">{g.intro}</p>
            <div className="mk-grid">
              {g.niches.map(n => n.href ? (
                <Link key={n.name} href={n.href} className="mk-card sg-card">
                  <h3>{n.name}</h3>
                  <p>{n.text}</p>
                  <span className="sg-more">Ver a página do segmento →</span>
                </Link>
              ) : (
                <div key={n.name} className="mk-card sg-card">
                  <h3>{n.name}</h3>
                  <p>{n.text}</p>
                </div>
              ))}
            </div>
          </div>
        </section>
      ))}

      <section className="mk-section">
        <div className="mk-wrap">
          <h2>O assistente se encaixa no seu negócio?</h2>
          <p className="mk-section-sub">Um checklist rápido para saber antes de conversar com a gente.</p>
          <div className="mk-grid">
            <div className="mk-card">
              <h3>Funciona bem quando há</h3>
              <ul className="sg-list">
                {FIT.map(t => <li key={t}><Check size={16} className="sg-yes" aria-hidden="true" /> {t}</li>)}
              </ul>
            </div>
            <div className="mk-card">
              <h3>Ainda não atende</h3>
              <ul className="sg-list">
                {NOT_A_FIT.map(t => <li key={t}><X size={16} className="sg-no" aria-hidden="true" /> {t}</li>)}
              </ul>
            </div>
          </div>
        </div>
      </section>

      <div className="mk-wrap">
        <div className="mk-cta">
          <h2>Não encontrou o seu segmento?</h2>
          <p>Se você atende com hora marcada, provavelmente funciona. Fale com a gente e veja uma demonstração.</p>
          <div className="mk-actions" style={{ justifyContent: 'center' }}>
            <DemoButton />
          </div>
        </div>
      </div>

      <style>{`
        .sg-card { display: flex; flex-direction: column; gap: 4px; }
        .sg-more { margin-top: auto; padding-top: 10px; font-weight: 700; font-size: 14px; color: var(--brand); }
        .sg-list { list-style: none; padding: 0; margin: 10px 0 0; display: flex; flex-direction: column; gap: 10px; }
        .sg-list li { display: flex; gap: 10px; align-items: flex-start; color: var(--ink); font-size: 15px; }
        .sg-list svg { flex-shrink: 0; margin-top: 3px; }
        .sg-yes { color: var(--brand); }
        .sg-no { color: var(--danger); }
      `}</style>
    </MarketingShell>
  )
}
