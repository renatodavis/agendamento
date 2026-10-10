export type Block =
  | { type: 'p'; text: string }
  | { type: 'h2'; text: string }
  | { type: 'ul'; items: string[] }

export type Post = {
  slug: string
  title: string
  description: string
  datePublished: string
  dateModified: string
  readingMinutes: number
  related: { href: string; label: string }[]
  body: Block[]
}

export const POSTS: Post[] = [
  {
    slug: 'como-reduzir-faltas-de-pacientes',
    title: 'Como reduzir faltas de pacientes: 7 práticas para clínicas e consultórios',
    description:
      'Confirmação no ato, lembrete na véspera, remarcação fácil e fila de espera: práticas simples para diminuir faltas e aproveitar melhor a agenda da clínica.',
    datePublished: '2026-10-10',
    dateModified: '2026-10-10',
    readingMinutes: 6,
    related: [
      { href: '/dentistas', label: 'Agendamento pelo WhatsApp para dentistas' },
      { href: '/consultorios-medicos', label: 'Agendamento pelo WhatsApp para consultórios médicos' },
    ],
    body: [
      { type: 'p', text: 'Toda falta tem dois custos: o horário que ficou vazio e o paciente que queria aquele horário e não conseguiu. Na maior parte das vezes a falta não é má vontade. O paciente esqueceu, teve um imprevisto e não achou fácil avisar, ou marcou sem ter certeza. As práticas abaixo atacam exatamente essas causas.' },

      { type: 'h2', text: '1. Confirme no momento em que agenda' },
      { type: 'p', text: 'Um agendamento feito com pressa, sem que o paciente repita data e horário, tem mais chance de virar falta. Ao final da conversa, apresente um resumo claro (procedimento, profissional, dia e hora) e peça uma confirmação explícita, como responder "SIM". Isso evita mal-entendidos e faz o paciente assumir o compromisso.' },

      { type: 'h2', text: '2. Envie lembrete na véspera' },
      { type: 'p', text: 'O lembrete é a prática mais conhecida, e com razão: grande parte das faltas é simples esquecimento. Envie a mensagem no dia anterior, pelo mesmo canal em que o paciente agendou, com data, horário, endereço e o nome do profissional.' },
      { type: 'p', text: 'O lembrete funciona melhor quando permite resposta. Peça para o paciente confirmar ou avisar se não puder ir. Quem avisa com um dia de antecedência libera o horário para outra pessoa.' },

      { type: 'h2', text: '3. Facilite remarcar' },
      { type: 'p', text: 'Muitos pacientes faltam porque remarcar dá trabalho: ligar em horário comercial, esperar na linha, explicar tudo de novo. Se pedir outro horário for tão fácil quanto mandar uma mensagem, o paciente avisa em vez de simplesmente não aparecer.' },

      { type: 'h2', text: '4. Mantenha uma fila de espera' },
      { type: 'p', text: 'Horários disputados lotam rápido, e as desistências de última hora deixam buracos que poderiam ser preenchidos. Registre quem queria aquele horário e não conseguiu. Quando alguém cancela, a equipe já sabe para quem oferecer a vaga.' },

      { type: 'h2', text: '5. Responda rápido quem quer agendar' },
      { type: 'p', text: 'Quem agenda no momento em que decidiu cuidar da saúde tende a comparecer. Quem espera horas por uma resposta esfria, procura outro lugar ou marca sem convicção. Responder rápido, inclusive à noite e no fim de semana, aumenta os agendamentos e a qualidade deles.' },

      { type: 'h2', text: '6. Meça a taxa de comparecimento' },
      { type: 'p', text: 'O que não é medido não melhora. Registre as faltas na agenda e acompanhe semanalmente a proporção entre atendimentos realizados e faltas. Observe se as faltas se concentram em algum dia da semana, horário, profissional ou tipo de procedimento.' },
      { type: 'ul', items: [
        'Faltas concentradas na segunda de manhã podem indicar lembrete enviado tarde demais, na sexta à noite.',
        'Faltas em primeiras consultas podem indicar agendamentos feitos sem confirmação.',
        'Faltas em retornos podem indicar que o paciente não entendeu a importância do retorno.',
      ] },

      { type: 'h2', text: '7. Tenha uma política de faltas clara e gentil' },
      { type: 'p', text: 'Explique, no agendamento e no lembrete, com quanta antecedência o paciente deve avisar se não puder ir. Em vez de punir, deixe claro que avisar ajuda outro paciente a ser atendido. Para faltas repetidas, a equipe pode conversar com o paciente e combinar uma forma de confirmação mais próxima da data.' },

      { type: 'h2', text: 'Como automatizar essas práticas' },
      { type: 'p', text: 'Confirmar, lembrar, remarcar e organizar a fila de espera tomam muito tempo da recepção quando feitos à mão. O AgendaAgentic faz isso pelo WhatsApp da clínica: o assistente com inteligência artificial agenda com confirmação do paciente, envia lembrete na véspera, recebe pedidos de remarcação e mantém a fila de espera. A equipe aprova as exceções e acompanha comparecimento e faltas no painel.' },
    ],
  },
  {
    slug: 'agendamento-pelo-whatsapp-como-funciona',
    title: 'Agendamento pelo WhatsApp: como funciona e o que avaliar antes de contratar',
    description:
      'Chatbot de menu ou inteligência artificial, API oficial da Meta, agenda em tempo real, controle humano e LGPD: o que avaliar em uma ferramenta de agendamento pelo WhatsApp.',
    datePublished: '2026-10-10',
    dateModified: '2026-10-10',
    readingMinutes: 7,
    related: [
      { href: '/clinicas-de-estetica', label: 'Agendamento pelo WhatsApp para clínicas de estética' },
      { href: '/perguntas-frequentes', label: 'Perguntas frequentes sobre o AgendaAgentic' },
    ],
    body: [
      { type: 'p', text: 'O WhatsApp virou o principal canal de contato entre pacientes e clínicas no Brasil. Isso é ótimo para o paciente e difícil para a recepção, que precisa responder mensagens, atender telefone e receber quem chega ao mesmo tempo. Automatizar o agendamento pelo WhatsApp resolve boa parte disso, desde que a ferramenta seja bem escolhida.' },

      { type: 'h2', text: 'Chatbot de menu ou inteligência artificial?' },
      { type: 'p', text: 'Os chatbots tradicionais funcionam por menus: "digite 1 para agendar, 2 para cancelar". Eles são previsíveis, mas cansam o paciente e travam diante de qualquer mensagem fora do roteiro, como "tem horário quinta depois das 18h?".' },
      { type: 'p', text: 'Assistentes com inteligência artificial entendem linguagem natural, inclusive áudios transcritos, e conduzem a conversa como uma pessoa faria. O cuidado está em garantir que a IA trabalhe com dados reais da agenda e que as decisões importantes continuem com a equipe.' },

      { type: 'h2', text: 'API oficial da Meta ou WhatsApp comum?' },
      { type: 'p', text: 'Algumas soluções automatizam o aplicativo comum do WhatsApp por meios não oficiais. Isso viola os termos do WhatsApp e coloca o número da clínica em risco de bloqueio. Prefira ferramentas que usam a API oficial do WhatsApp Business, da Meta, com o número da própria clínica.' },
      { type: 'p', text: 'Na API oficial, alguns tipos de mensagem, como lembretes enviados fora da janela de atendimento, são tarifados pela Meta. Considere esse custo na comparação entre ferramentas.' },

      { type: 'h2', text: 'O que avaliar em uma ferramenta' },
      { type: 'ul', items: [
        'Agenda em tempo real: a ferramenta consulta a agenda de cada profissional antes de oferecer um horário, sem risco de marcar dois pacientes no mesmo horário?',
        'Confirmação explícita: o agendamento só é registrado depois que o paciente confirma?',
        'Controle humano: cancelamentos e remarcações passam pela equipe antes de mudar a agenda?',
        'Lembretes: a ferramenta envia lembrete na véspera e permite que o paciente responda?',
        'Fila de espera: quem não conseguiu horário pode entrar em uma fila?',
        'Áudios: o assistente entende mensagens de voz?',
        'Limites de escopo: o assistente recusa pedidos fora do agendamento e não dá orientação de saúde?',
        'Segurança: o paciente só consegue mexer nos próprios agendamentos?',
        'LGPD: o fornecedor explica como trata dados de saúde, quais empresas recebem esses dados e onde eles ficam?',
        'Painel: a equipe enxerga a agenda, as conversas e os pedidos pendentes em um só lugar?',
      ] },

      { type: 'h2', text: 'Cuidados específicos com dados de saúde' },
      { type: 'p', text: 'Mensagens de pacientes podem conter dados de saúde, que a LGPD trata como sensíveis. A clínica continua sendo a controladora desses dados e o fornecedor atua como operador. Peça ao fornecedor a política de privacidade, a lista de empresas que processam os dados e informações sobre segurança e retenção.' },

      { type: 'h2', text: 'Como começar' },
      { type: 'ul', items: [
        'Liste os serviços, profissionais e horários de atendimento da clínica.',
        'Defina o que o assistente pode resolver sozinho e o que vai para a equipe.',
        'Configure o número de WhatsApp Business da clínica na API oficial.',
        'Teste com pedidos reais antes de divulgar o canal aos pacientes.',
      ] },
      { type: 'p', text: 'O AgendaAgentic foi criado com esses critérios: usa a API oficial do WhatsApp, consulta a agenda real de cada profissional, só registra o agendamento quando o paciente confirma e deixa cancelamentos e remarcações para aprovação da equipe.' },
    ],
  },
]

export const getPost = (slug: string) => POSTS.find(p => p.slug === slug)

export const fmtDate = (iso: string) =>
  new Date(`${iso}T12:00:00Z`).toLocaleDateString('pt-BR', { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'UTC' })
