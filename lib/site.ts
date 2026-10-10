export const SITE_URL = 'https://www.agendaagentic.app'
export const SITE_NAME = 'AgendaAgentic'

export const HOME_TITLE = 'Agendamento automático pelo WhatsApp com IA | AgendaAgentic'
export const HOME_DESCRIPTION =
  'IA que agenda pelo WhatsApp 24h: consulta a agenda real, confirma com o cliente e lembra na véspera. Para clínicas, salões, barbearias e todo negócio com agenda.'

// openGraph de uma página substitui o do layout por inteiro, então cada página monta o objeto completo
export function openGraphFor(path: string, title: string, description: string, extra: Record<string, unknown> = {}) {
  return {
    type: 'website' as const,
    siteName: SITE_NAME,
    locale: 'pt_BR',
    url: path,
    title,
    description,
    images: [{ url: '/opengraph-image', width: 1200, height: 630, alt: `${SITE_NAME} — agendamento pelo WhatsApp com IA` }],
    ...extra,
  }
}

// Número no formato internacional, só dígitos (ex.: '5511999999999').
// Vazio: os botões de demonstração levam ao login, como antes.
export const CONTACT = {
  whatsappNumber: '',
  demoMessage: 'Olá! Quero conhecer o AgendaAgentic e agendar uma demonstração.',
}

export const DEMO_CTA = CONTACT.whatsappNumber
  ? {
      href: `https://wa.me/${CONTACT.whatsappNumber}?text=${encodeURIComponent(CONTACT.demoMessage)}`,
      label: 'Quero uma demonstração',
      external: true,
    }
  : { href: '/login', label: 'Acessar o sistema', external: false }

export const SEGMENT_LINKS = [
  { href: '/dentistas', label: 'Dentistas' },
  { href: '/clinicas-de-estetica', label: 'Clínicas de estética' },
  { href: '/consultorios-medicos', label: 'Consultórios médicos' },
]

export const NAV_LINKS = [
  { href: '/segmentos', label: 'Segmentos' },
  { href: '/perguntas-frequentes', label: 'Perguntas frequentes' },
  { href: '/blog', label: 'Blog' },
]

export const CONTENT_LINKS = [
  { href: '/perguntas-frequentes', label: 'Perguntas frequentes' },
  { href: '/blog', label: 'Blog' },
]

// Preencha os campos e troque `ready` para true para publicar privacidade e termos
// (entram no rodapé, no sitemap e deixam de ter noindex).
export const LEGAL = {
  ready: false,
  razaoSocial: '[RAZÃO SOCIAL]',
  cnpj: '[CNPJ]',
  endereco: '[ENDEREÇO COMPLETO]',
  emailContato: '[E-MAIL DE CONTATO]',
  encarregadoNome: '[NOME DO ENCARREGADO PELO TRATAMENTO DE DADOS]',
  encarregadoEmail: '[E-MAIL DO ENCARREGADO]',
  foro: '[CIDADE/UF]',
  atualizadoEm: '10 de outubro de 2026',
  atualizadoEmISO: '2026-10-10',
}
