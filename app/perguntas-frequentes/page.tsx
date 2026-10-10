import type { Metadata } from 'next'
import Link from 'next/link'
import MarketingShell, { Breadcrumbs, DemoButton, JsonLd } from '@/components/marketing/MarketingShell'
import { SITE_URL, SITE_NAME, openGraphFor } from '@/lib/site'

const TITLE = 'Perguntas frequentes sobre agendamento pelo WhatsApp'
const DESCRIPTION =
  'Como funciona o AgendaAgentic: agendamento pelo WhatsApp com IA, lembretes, fila de espera, cancelamentos, número da clínica, LGPD e planos.'

export const metadata: Metadata = {
  title: TITLE,
  description: DESCRIPTION,
  alternates: { canonical: '/perguntas-frequentes' },
  openGraph: openGraphFor('/perguntas-frequentes', TITLE, DESCRIPTION),
}

const GROUPS: { title: string; items: { q: string; a: string }[] }[] = [
  {
    title: 'Como funciona',
    items: [
      { q: 'Como o AgendaAgentic funciona?', a: 'O paciente manda mensagem no WhatsApp da clínica. A inteligência artificial entende o pedido, consulta a agenda de cada profissional, oferece os horários livres e prepara o agendamento. Ele só é registrado quando o paciente responde SIM. A equipe acompanha tudo em um painel web.' },
      { q: 'O paciente precisa instalar algum aplicativo?', a: 'Não. O paciente usa o WhatsApp que já tem. A equipe acessa o painel pelo navegador, no computador ou no celular.' },
      { q: 'O assistente atende fora do horário comercial?', a: 'Sim. Ele responde 24 horas por dia, inclusive à noite e no fim de semana, mas só oferece horários que estão dentro da agenda configurada.' },
      { q: 'Ele entende mensagens de áudio?', a: 'Sim. Os áudios do WhatsApp são transcritos e respondidos normalmente.' },
      { q: 'O que acontece quando o horário desejado está ocupado?', a: 'O assistente oferece outros horários ou coloca o paciente na fila de espera daquele horário.' },
      { q: 'O paciente pode cancelar ou remarcar pelo WhatsApp?', a: 'Pode pedir. O pedido chega ao painel e a equipe aprova o cancelamento ou o novo horário antes de qualquer mudança na agenda.' },
      { q: 'O sistema envia lembretes?', a: 'Sim. O paciente recebe um lembrete na véspera e pode responder confirmando ou pedindo para remarcar.' },
      { q: 'Funciona com vários profissionais?', a: 'Sim. Cada profissional tem os próprios dias, horários, bloqueios e especialidade.' },
      { q: 'A equipe também pode agendar manualmente?', a: 'Sim. O painel tem a opção de novo agendamento para pacientes que ligam ou chegam ao balcão.' },
    ],
  },
  {
    title: 'WhatsApp',
    items: [
      { q: 'Qual número de WhatsApp é usado?', a: 'Um número de WhatsApp Business da própria clínica, conectado à API oficial da Meta. O número continua sendo da clínica. Ajudamos na configuração durante a implantação.' },
      { q: 'A equipe consegue acompanhar as conversas?', a: 'Sim. O painel mostra as conversas em andamento, e pedidos de falar com um atendente chegam à equipe.' },
      { q: 'A Meta cobra pelas mensagens?', a: 'Alguns tipos de mensagem, como lembretes enviados fora da janela de atendimento, são tarifados pela Meta e cobrados diretamente na conta de WhatsApp Business da clínica.' },
    ],
  },
  {
    title: 'Inteligência artificial e segurança',
    items: [
      { q: 'E se a inteligência artificial errar?', a: 'A IA não decide sozinha: o agendamento só é registrado depois que o paciente confirma, e cancelamentos e remarcações passam pela aprovação da equipe.' },
      { q: 'O assistente dá orientação médica?', a: 'Não. Ele cuida apenas do agendamento. Em urgência aparente, orienta o paciente a procurar atendimento de emergência.' },
      { q: 'Alguém pode enganar o assistente para cancelar agendamentos de outras pessoas?', a: 'Não. O assistente identifica o paciente pelo número do WhatsApp, atua só nos agendamentos dessa pessoa e recusa pedidos em massa e tentativas de alterar suas instruções.' },
      { q: 'Como fica a LGPD?', a: 'A clínica é a controladora dos dados dos pacientes e o AgendaAgentic atua como operador. Dados de saúde são tratados como sensíveis. Os detalhes estão na Política de Privacidade.' },
    ],
  },
  {
    title: 'Planos',
    items: [
      { q: 'Quanto custa?', a: 'O valor depende do número de profissionais e do volume de atendimentos. Fale com a gente para receber uma proposta para a sua clínica.' },
      { q: 'Tem fidelidade?', a: 'Não há contrato de longo prazo. É possível cancelar quando quiser.' },
      { q: 'Funciona para negócios que não são clínicas?', a: 'Sim. Barbearias, salões, estúdios e outros serviços com agenda também usam. O vocabulário se adapta: cliente em vez de paciente, atendimento em vez de consulta.' },
    ],
  },
]

const jsonLd = {
  '@context': 'https://schema.org',
  '@graph': [
    {
      '@type': 'FAQPage',
      '@id': `${SITE_URL}/perguntas-frequentes#faq`,
      inLanguage: 'pt-BR',
      mainEntity: GROUPS.flatMap(g => g.items).map(i => ({
        '@type': 'Question',
        name: i.q,
        acceptedAnswer: { '@type': 'Answer', text: i.a },
      })),
    },
    {
      '@type': 'BreadcrumbList',
      itemListElement: [
        { '@type': 'ListItem', position: 1, name: SITE_NAME, item: SITE_URL },
        { '@type': 'ListItem', position: 2, name: 'Perguntas frequentes', item: `${SITE_URL}/perguntas-frequentes` },
      ],
    },
  ],
}

export default function FaqPage() {
  return (
    <MarketingShell>
      <JsonLd data={jsonLd} />
      <section className="mk-hero">
        <div className="mk-narrow">
          <Breadcrumbs items={[{ name: 'Início', href: '/' }, { name: 'Perguntas frequentes', href: '/perguntas-frequentes' }]} />
          <h1>{TITLE}</h1>
          <p className="mk-lead">
            Tudo sobre o assistente que agenda pelo WhatsApp da sua clínica. Veja também as páginas para{' '}
            <Link href="/dentistas">dentistas</Link>, <Link href="/clinicas-de-estetica">clínicas de estética</Link> e{' '}
            <Link href="/consultorios-medicos">consultórios médicos</Link>.
          </p>

          {GROUPS.map(g => (
            <div key={g.title}>
              <h2 className="mk-faq-group">{g.title}</h2>
              <div className="mk-faq">
                {g.items.map(i => (
                  <details key={i.q}><summary>{i.q}</summary><p>{i.a}</p></details>
                ))}
              </div>
            </div>
          ))}

          <div className="mk-cta" style={{ marginTop: 48 }}>
            <h2>Não encontrou sua dúvida?</h2>
            <p>Converse com a gente e veja o assistente funcionando.</p>
            <DemoButton />
          </div>
        </div>
      </section>
    </MarketingShell>
  )
}
