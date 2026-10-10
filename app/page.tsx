import type { Metadata } from 'next'
import LandingPage from '@/components/landing/LandingPage'
import { SITE_URL, SITE_NAME, HOME_TITLE, HOME_DESCRIPTION } from '@/lib/site'

export const metadata: Metadata = {
  title: { absolute: HOME_TITLE },
  description: HOME_DESCRIPTION,
  alternates: { canonical: '/' },
  openGraph: { url: '/', title: HOME_TITLE, description: HOME_DESCRIPTION },
}

const jsonLd = {
  '@context': 'https://schema.org',
  '@graph': [
    {
      '@type': 'Organization',
      '@id': `${SITE_URL}/#organization`,
      name: SITE_NAME,
      url: SITE_URL,
    },
    {
      '@type': 'WebSite',
      '@id': `${SITE_URL}/#website`,
      name: SITE_NAME,
      url: SITE_URL,
      inLanguage: 'pt-BR',
      publisher: { '@id': `${SITE_URL}/#organization` },
    },
    {
      '@type': 'SoftwareApplication',
      '@id': `${SITE_URL}/#software`,
      name: SITE_NAME,
      url: SITE_URL,
      description: HOME_DESCRIPTION,
      applicationCategory: 'BusinessApplication',
      applicationSubCategory: 'Agendamento online',
      operatingSystem: 'Web',
      inLanguage: 'pt-BR',
      publisher: { '@id': `${SITE_URL}/#organization` },
      featureList: [
        'Agendamento pelo WhatsApp em linguagem natural',
        'Consulta da agenda de cada profissional em tempo real',
        'Confirmação do paciente e lembrete no dia anterior',
        'Fila de espera',
        'Transcrição de áudios do WhatsApp',
        'Aprovação de cancelamentos e remarcações pela recepção',
        'Painel de gestão da agenda',
      ],
    },
  ],
}

export default function Page() {
  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd).replace(/</g, '\\u003c') }}
      />
      <LandingPage />
    </>
  )
}
