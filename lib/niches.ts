export type Niche = { name: string; text: string; href?: string }
export type NicheGroup = { id: string; title: string; intro: string; niches: Niche[] }

// `href` só para nichos que já têm página própria
export const NICHE_GROUPS: NicheGroup[] = [
  {
    id: 'saude',
    title: 'Saúde',
    intro: 'Consultas, avaliações e retornos com confirmação do paciente e cuidado com dados de saúde.',
    niches: [
      { name: 'Dentistas e clínicas odontológicas', text: 'Avaliações, procedimentos e retornos por dentista e especialidade.', href: '/dentistas' },
      { name: 'Clínicas de estética', text: 'Procedimentos por profissional, fila de espera para horários disputados.', href: '/clinicas-de-estetica' },
      { name: 'Consultórios e clínicas médicas', text: 'Consultas por especialidade, com convênio registrado no agendamento.', href: '/consultorios-medicos' },
      { name: 'Psicólogos e terapeutas', text: 'Sessões com o mesmo profissional, lembrete na véspera e remarcação pela equipe.' },
      { name: 'Fisioterapia', text: 'Sessões recorrentes por fisioterapeuta, com controle de faltas.' },
      { name: 'Nutricionistas', text: 'Primeira consulta e retornos agendados pelo WhatsApp.' },
      { name: 'Clínicas veterinárias', text: 'Consultas e vacinas, com o tutor agendando pelo WhatsApp.' },
    ],
  },
  {
    id: 'beleza-e-bem-estar',
    title: 'Beleza e bem-estar',
    intro: 'Horários por profissional e por serviço, com resposta imediata para quem quer marcar agora.',
    niches: [
      { name: 'Salões de beleza', text: 'Corte, escova, coloração e outros serviços, cada um com seu profissional.' },
      { name: 'Barbearias', text: 'Corte e barba com o barbeiro preferido, inclusive no fim de semana.' },
      { name: 'Manicure e design de sobrancelhas', text: 'Atendimentos curtos com agenda cheia e muitas remarcações.' },
      { name: 'Massoterapia e spas', text: 'Sessões por terapeuta, com lembrete e confirmação.' },
    ],
  },
  {
    id: 'aulas-e-servicos',
    title: 'Aulas e serviços',
    intro: 'Qualquer atendimento individual que precise de horário marcado.',
    niches: [
      { name: 'Personal trainers', text: 'Sessões individuais com o aluno agendando pelo WhatsApp.' },
      { name: 'Aulas particulares', text: 'Aulas individuais de idiomas, música e reforço escolar.' },
      { name: 'Consultorias e escritórios', text: 'Reuniões e atendimentos com hora marcada por profissional.' },
    ],
  },
]

export const NOT_A_FIT = [
  'Aulas ou eventos em grupo com várias vagas no mesmo horário',
  'Reserva de mesas, quartos ou espaços',
  'Venda de produtos ou cobrança de pagamentos pelo WhatsApp',
]
