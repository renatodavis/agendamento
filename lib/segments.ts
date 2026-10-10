export type Segment = {
  slug: string
  title: string
  description: string
  kicker: string
  h1: string
  lead: string
  pains: { title: string; text: string }[]
  chatTitle: string
  chat: { from: 'paciente' | 'assistente'; text: string }[]
  features: { title: string; text: string }[]
  faq: { q: string; a: string }[]
  ctaText: string
  lastModified: string
}

export const SEGMENTS: Segment[] = [
  {
    slug: 'dentistas',
    title: 'Agendamento pelo WhatsApp para dentistas',
    description:
      'Assistente com IA que agenda avaliações, consultas e retornos pelo WhatsApp da clínica odontológica, 24h, com confirmação do paciente e lembrete na véspera.',
    kicker: 'Para clínicas odontológicas',
    h1: 'Agendamento pelo WhatsApp para dentistas',
    lead:
      'Paciente perguntando horário às 22h, recepção dividida entre telefone e balcão, cadeira vazia por causa de falta. O AgendaAgentic responde no WhatsApp da clínica, mostra os horários livres de cada dentista e só marca quando o paciente confirma.',
    pains: [
      { title: 'Mensagens fora do horário', text: 'Quem decide tratar o dente costuma escrever à noite ou no fim de semana. Sem resposta, procura outra clínica.' },
      { title: 'Recepção sobrecarregada', text: 'Agendar, confirmar e remarcar pelo WhatsApp toma o tempo de quem deveria receber o paciente no balcão.' },
      { title: 'Faltas e horários vagos', text: 'Sem confirmação e lembrete, a consulta esquecida vira cadeira parada e um horário que outro paciente queria.' },
    ],
    chatTitle: 'Exemplo de conversa',
    chat: [
      { from: 'paciente', text: 'Boa noite! Queria marcar uma avaliação para clareamento.' },
      { from: 'assistente', text: 'Boa noite! Para avaliação de clareamento, temos quinta-feira às 9h, 11h ou 15h30. Qual fica melhor?' },
      { from: 'paciente', text: '11h' },
      { from: 'assistente', text: 'Ótimo. Me informe seu nome completo e se será por convênio ou particular, por favor.' },
      { from: 'paciente', text: 'Mariana Alves, particular' },
      { from: 'assistente', text: 'Avaliação de clareamento na quinta às 11h, particular. Responda SIM para confirmar.' },
    ],
    features: [
      { title: 'Agenda por dentista', text: 'Cada profissional tem seus dias, horários e bloqueios. O assistente só oferece o que está livre de verdade.' },
      { title: 'Convênio ou particular', text: 'O assistente pergunta o convênio antes de marcar e registra junto ao agendamento.' },
      { title: 'Confirmação e lembrete', text: 'A consulta só entra na agenda quando o paciente responde SIM, e ele recebe lembrete na véspera.' },
      { title: 'Fila de espera', text: 'Horário disputado? O paciente entra na fila e a clínica vê quem quer aquele horário se ele liberar.' },
      { title: 'Cancelamentos com aprovação', text: 'Pedidos de cancelar ou remarcar chegam à recepção, que aprova com um toque no painel.' },
      { title: 'Entende áudios', text: 'O paciente pode mandar áudio. O assistente transcreve e responde normalmente.' },
    ],
    faq: [
      { q: 'O assistente passa orçamento de tratamento?', a: 'Não. Ele informa os serviços cadastrados pela clínica e agenda a avaliação. Valores e planos de tratamento continuam com a equipe, que recebe o pedido quando o paciente quiser falar com alguém.' },
      { q: 'Funciona com vários dentistas e especialidades?', a: 'Sim. Cada dentista tem a própria agenda e especialidade, e o assistente oferece horários de acordo com o serviço que o paciente pediu.' },
      { q: 'E se o paciente estiver com dor ou em urgência?', a: 'O assistente não dá orientação clínica. Em urgência aparente, ele orienta o paciente a buscar atendimento imediato.' },
      { q: 'Preciso trocar o número de WhatsApp da clínica?', a: 'O assistente funciona com um número de WhatsApp Business da própria clínica conectado à API oficial da Meta. Ajudamos na configuração durante a implantação.' },
    ],
    ctaText: 'Uma demonstração com a agenda da sua clínica odontológica.',
    lastModified: '2026-10-10',
  },
  {
    slug: 'clinicas-de-estetica',
    title: 'Agendamento pelo WhatsApp para clínicas de estética',
    description:
      'Agende procedimentos e avaliações pelo WhatsApp 24h, com horários por profissional, fila de espera para horários disputados e lembrete automático. Para clínicas de estética.',
    kicker: 'Para clínicas de estética',
    h1: 'Agendamento pelo WhatsApp para clínicas de estética',
    lead:
      'Quem procura um procedimento estético costuma mandar mensagem depois do trabalho e fecha com quem responde primeiro. O AgendaAgentic responde na hora, oferece os horários livres de cada profissional e coloca na fila de espera quando a agenda está cheia.',
    pains: [
      { title: 'Resposta lenta perde a cliente', text: 'A cliente pesquisa várias clínicas ao mesmo tempo. Quem demora a responder perde o agendamento.' },
      { title: 'Horários nobres disputados', text: 'Sábado e fim de tarde lotam rápido, e as desistências de última hora deixam buracos na agenda.' },
      { title: 'Muitas sessões para organizar', text: 'Procedimentos em várias sessões geram muitas mensagens de agendamento e remarcação.' },
    ],
    chatTitle: 'Exemplo de conversa',
    chat: [
      { from: 'paciente', text: 'Oi! Vocês fazem limpeza de pele? Tem horário no sábado à tarde?' },
      { from: 'assistente', text: 'Fazemos sim! O sábado à tarde está completo. Posso colocar você na fila de espera para as 14h ou mostrar horários de sexta à tarde. O que prefere?' },
      { from: 'paciente', text: 'Me mostra sexta' },
      { from: 'assistente', text: 'Na sexta temos 16h e 17h30. Qual fica melhor?' },
      { from: 'paciente', text: '17h30' },
      { from: 'assistente', text: 'Limpeza de pele na sexta às 17h30. Responda SIM para confirmar.' },
    ],
    features: [
      { title: 'Serviços por profissional', text: 'Cada profissional tem sua agenda e seus procedimentos. O assistente oferece só os horários de quem faz o serviço pedido.' },
      { title: 'Fila de espera', text: 'Quando o horário desejado está ocupado, a cliente entra na fila em vez de desistir.' },
      { title: 'Resposta imediata, 24h', text: 'A cliente recebe horários na hora, inclusive à noite e no fim de semana.' },
      { title: 'Lembrete na véspera', text: 'Lembrete automático no dia anterior, com a opção de confirmar ou pedir remarcação.' },
      { title: 'Remarcação com aprovação', text: 'Pedidos de remarcar ou cancelar vão para a equipe aprovar no painel.' },
      { title: 'Entende áudios', text: 'A cliente pode mandar áudio. O assistente transcreve e responde normalmente.' },
    ],
    faq: [
      { q: 'Funciona para procedimentos em várias sessões?', a: 'Cada sessão é agendada como um atendimento. A cliente pode marcar a próxima sessão pelo WhatsApp quando quiser, e a equipe acompanha tudo no painel.' },
      { q: 'O assistente informa preços dos procedimentos?', a: 'Ele responde com base nas informações que a clínica cadastrar, como a descrição dos serviços. O que não estiver cadastrado ele encaminha para a equipe.' },
      { q: 'Serve também para salão de beleza?', a: 'Sim. O vocabulário se adapta ao negócio: cliente em vez de paciente, atendimento em vez de consulta.' },
      { q: 'Preciso de um aplicativo novo?', a: 'Não. A cliente usa o WhatsApp de sempre, e a equipe acessa o painel pelo navegador, no computador ou no celular.' },
    ],
    ctaText: 'Uma demonstração com a agenda da sua clínica de estética.',
    lastModified: '2026-10-10',
  },
  {
    slug: 'consultorios-medicos',
    title: 'Agendamento pelo WhatsApp para consultórios médicos',
    description:
      'Secretária virtual com IA no WhatsApp para consultórios e clínicas médicas: agenda consultas 24h, registra o convênio e encaminha cancelamentos para a recepção.',
    kicker: 'Para consultórios e clínicas médicas',
    h1: 'Agendamento pelo WhatsApp para consultórios médicos',
    lead:
      'Telefone ocupado, WhatsApp acumulado e paciente que esquece a consulta. O AgendaAgentic atende no WhatsApp do consultório a qualquer hora, consulta a agenda de cada médico e confirma a consulta com o paciente, sem dar orientação clínica.',
    pains: [
      { title: 'Telefone e WhatsApp ao mesmo tempo', text: 'A secretária não consegue atender ligação, mensagem e paciente no balcão ao mesmo tempo.' },
      { title: 'Pacientes que não confirmam', text: 'Sem confirmação e lembrete, a consulta esquecida vira um horário perdido.' },
      { title: 'Dados sensíveis no celular', text: 'Agendar pelo celular pessoal da recepção mistura dados de saúde com conversas particulares.' },
    ],
    chatTitle: 'Exemplo de conversa',
    chat: [
      { from: 'paciente', text: 'Bom dia, preciso marcar consulta com cardiologista pelo convênio.' },
      { from: 'assistente', text: 'Bom dia! Com cardiologia temos amanhã às 8h ou 10h, ou sexta às 14h. Qual prefere?' },
      { from: 'paciente', text: 'Sexta 14h' },
      { from: 'assistente', text: 'Certo. Qual o seu nome completo e o nome do convênio?' },
      { from: 'paciente', text: 'Carlos Pereira, Unimed' },
      { from: 'assistente', text: 'Consulta de cardiologia na sexta às 14h, Unimed. Responda SIM para confirmar.' },
    ],
    features: [
      { title: 'Secretária virtual 24h', text: 'Atende, mostra horários e agenda a qualquer hora, inclusive quando o consultório está fechado.' },
      { title: 'Convênio registrado', text: 'O convênio é perguntado antes de marcar e fica salvo no cadastro do paciente.' },
      { title: 'Sem orientação clínica', text: 'O assistente não diagnostica nem orienta tratamento. Em urgência aparente, orienta procurar o SAMU (192) ou um pronto-socorro.' },
      { title: 'Cada um marca a sua consulta', text: 'Pedidos para terceiros, como filhos ou familiares, são encaminhados para a recepção.' },
      { title: 'Cancelamentos com aprovação', text: 'Cancelamentos e remarcações chegam à recepção, que aprova no painel.' },
      { title: 'LGPD para dados de saúde', text: 'Dados de saúde tratados como sensíveis, com acesso pelo painel e conexão criptografada.' },
    ],
    faq: [
      { q: 'A IA dá orientação médica?', a: 'Não. O assistente cuida apenas do agendamento. Ele não diagnostica nem orienta tratamento e, em urgência aparente, orienta o paciente a procurar o SAMU (192) ou um pronto-socorro.' },
      { q: 'Um paciente pode marcar consulta para o filho?', a: 'Pelo WhatsApp, cada pessoa agenda apenas as próprias consultas. Pedidos para terceiros são encaminhados para a recepção, que conclui o agendamento.' },
      { q: 'Integra com o sistema de prontuário que eu já uso?', a: 'Ainda não. Hoje a agenda fica no painel do AgendaAgentic, que a recepção acessa pelo navegador.' },
      { q: 'Como ficam os dados dos pacientes?', a: 'O consultório é o controlador dos dados e o AgendaAgentic atua como operador, seguindo a LGPD. Os detalhes estão na Política de Privacidade.' },
    ],
    ctaText: 'Uma demonstração com a agenda do seu consultório.',
    lastModified: '2026-10-10',
  },
]

export const getSegment = (slug: string) => SEGMENTS.find(s => s.slug === slug)
