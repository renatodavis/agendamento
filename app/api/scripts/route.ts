import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase'
import { requireAuth } from '@/lib/auth'
import { invalidateClinicBasicConfigCache } from '@/lib/clinic-config-server'

export type ScriptKey = 'barbearia' | 'clinica' | 'odontologia' | 'veterinaria' | 'personal' | 'salao' | 'reset'

function addMs(ms: number) { return new Date(Date.now() + ms).toISOString() }
const h = (n: number) => addMs(n * 3_600_000)
const d = (n: number) => addMs(n * 86_400_000)

// ── Seed definitions ──────────────────────────────────────────────────────────
const SEEDS = {
  barbearia: {
    domain_type: 'barbearia',
    clinic_name: 'Barbearia Kings Cut',
    working_hours: 'Terça a Sábado, 9h às 20h — Domingo, 9h às 15h — Segunda fechado',
    services: [
      { name: 'Corte Masculino', description: 'Corte e estilo' },
      { name: 'Barba', description: 'Aparação e design de barba' },
      { name: 'Corte + Barba', description: 'Combo completo' },
      { name: 'Degradê', description: 'Corte progressivo e fade' },
      { name: 'Coloração Masculina', description: 'Coloração e retoques' },
      { name: 'Hidratação Capilar', description: 'Nutrição e recuperação dos fios' },
    ],
    doctors: [
      { id: 'f0000600-0000-0000-0000-000000000001', name: 'Eduardo Santos', specialty: 'Corte Masculino e Barba', crm: 'BARBER-SP 60001' },
      { id: 'f0000600-0000-0000-0000-000000000002', name: 'Vinícius Rocha', specialty: 'Degradê e Navalha', crm: 'BARBER-SP 60002' },
      { id: 'f0000600-0000-0000-0000-000000000003', name: 'Ricardo Mendes', specialty: 'Coloração e Tratamento', crm: 'BARBER-SP 60003' },
    ],
    patients: [
      { id: 'f0000601-0000-0000-0000-000000000001', name: 'Bruno Carvalho', phone: '+5511000060001', convenio: 'Avulso', photo_emoji: '👨' },
      { id: 'f0000601-0000-0000-0000-000000000002', name: 'Mateus Oliveira', phone: '+5511000060002', convenio: 'Plano Mensal', photo_emoji: '👦' },
      { id: 'f0000601-0000-0000-0000-000000000003', name: 'André Lima', phone: '+5511000060003', convenio: 'Avulso', photo_emoji: '👴' },
      { id: 'f0000601-0000-0000-0000-000000000004', name: 'Lucas Ferreira', phone: '+5511000060004', convenio: 'Plano Mensal', photo_emoji: '👨‍🦱' },
      { id: 'f0000601-0000-0000-0000-000000000005', name: 'Gabriel Alves', phone: '+5511000060005', convenio: 'Avulso', photo_emoji: '👶' },
      { id: 'f0000601-0000-0000-0000-000000000006', name: 'Rodrigo Monteiro', phone: '+5511000060006', convenio: 'Plano Mensal', photo_emoji: '👨‍🦳' },
    ],
    appointments: () => [
      { patient_id: 'f0000601-0000-0000-0000-000000000001', doctor_id: 'f0000600-0000-0000-0000-000000000001', scheduled_at: h(1),  status: 'confirmada', type: 'Corte + Barba' },
      { patient_id: 'f0000601-0000-0000-0000-000000000002', doctor_id: 'f0000600-0000-0000-0000-000000000002', scheduled_at: h(2),  status: 'agendada',   type: 'Corte Degradê' },
      { patient_id: 'f0000601-0000-0000-0000-000000000003', doctor_id: 'f0000600-0000-0000-0000-000000000001', scheduled_at: h(4),  status: 'agendada',   type: 'Barba na Navalha' },
      { patient_id: 'f0000601-0000-0000-0000-000000000005', doctor_id: 'f0000600-0000-0000-0000-000000000002', scheduled_at: h(25), status: 'agendada',   type: 'Corte Infantil' },
      { patient_id: 'f0000601-0000-0000-0000-000000000004', doctor_id: 'f0000600-0000-0000-0000-000000000003', scheduled_at: d(2),  status: 'agendada',   type: 'Hidratação Capilar Masculina' },
      { patient_id: 'f0000601-0000-0000-0000-000000000006', doctor_id: 'f0000600-0000-0000-0000-000000000001', scheduled_at: d(3),  status: 'agendada',   type: 'Corte + Barba' },
      { patient_id: 'f0000601-0000-0000-0000-000000000004', doctor_id: 'f0000600-0000-0000-0000-000000000003', scheduled_at: d(5),  status: 'agendada',   type: 'Coloração Masculina' },
      { patient_id: 'f0000601-0000-0000-0000-000000000001', doctor_id: 'f0000600-0000-0000-0000-000000000001', scheduled_at: d(-1), status: 'atendida',   type: 'Corte + Barba' },
      { patient_id: 'f0000601-0000-0000-0000-000000000002', doctor_id: 'f0000600-0000-0000-0000-000000000002', scheduled_at: d(-3), status: 'atendida',   type: 'Corte Degradê' },
    ],
  },

  clinica: {
    domain_type: 'clinica',
    clinic_name: 'Clínica São Lucas',
    working_hours: 'Segunda a Sexta, 8h às 18h — Sábado, 8h às 12h',
    services: [
      { name: 'Clínico Geral', description: 'Consultas gerais, check-up, atestados' },
      { name: 'Cardiologia', description: 'Coração e sistema cardiovascular' },
      { name: 'Dermatologia', description: 'Pele, cabelo e unhas' },
      { name: 'Pediatria', description: 'Crianças e adolescentes' },
      { name: 'Ortopedia', description: 'Ossos, articulações e coluna' },
      { name: 'Neurologia', description: 'Sistema nervoso e cérebro' },
    ],
    doctors: [
      { id: '11111111-0000-0000-0000-000000000001', name: 'Dr. Cardoso',   specialty: 'Clínica Geral', crm: 'CRM-SP 12345' },
      { id: '11111111-0000-0000-0000-000000000002', name: 'Dra. Lima',     specialty: 'Cardiologia',   crm: 'CRM-SP 23456' },
      { id: '11111111-0000-0000-0000-000000000003', name: 'Dr. Fernandes', specialty: 'Dermatologia',  crm: 'CRM-SP 34567' },
      { id: '11111111-0000-0000-0000-000000000004', name: 'Dra. Costa',    specialty: 'Ortopedia',     crm: 'CRM-SP 45678' },
      { id: '11111111-0000-0000-0000-000000000005', name: 'Dr. Alves',     specialty: 'Pediatria',     crm: 'CRM-SP 56789' },
      { id: '11111111-0000-0000-0000-000000000006', name: 'Dr. Santos',    specialty: 'Neurologia',    crm: 'CRM-SP 67890' },
    ],
    patients: [
      { id: 'f0000101-0000-0000-0000-000000000001', name: 'Beatriz Nunes',    phone: '+5511000010001', convenio: 'Unimed',         photo_emoji: '👩'   },
      { id: 'f0000101-0000-0000-0000-000000000002', name: 'Henrique Soares',  phone: '+5511000010002', convenio: 'Bradesco Saúde', photo_emoji: '👨'   },
      { id: 'f0000101-0000-0000-0000-000000000003', name: 'Larissa Moraes',   phone: '+5511000010003', convenio: 'Particular',     photo_emoji: '👩‍🦱' },
      { id: 'f0000101-0000-0000-0000-000000000004', name: 'Antônio Ferreira', phone: '+5511000010004', convenio: 'Amil',           photo_emoji: '👴'   },
      { id: 'f0000101-0000-0000-0000-000000000005', name: 'Camila Dias',      phone: '+5511000010005', convenio: 'SulAmérica',     photo_emoji: '👧'   },
    ],
    appointments: () => [
      { patient_id: 'f0000101-0000-0000-0000-000000000001', doctor_id: '11111111-0000-0000-0000-000000000001', scheduled_at: h(2),  status: 'agendada',   type: 'Consulta' },
      { patient_id: 'f0000101-0000-0000-0000-000000000002', doctor_id: '11111111-0000-0000-0000-000000000002', scheduled_at: h(26), status: 'confirmada', type: 'Consulta' },
      { patient_id: 'f0000101-0000-0000-0000-000000000003', doctor_id: '11111111-0000-0000-0000-000000000003', scheduled_at: d(3),  status: 'agendada',   type: 'Retorno' },
      { patient_id: 'f0000101-0000-0000-0000-000000000004', doctor_id: '11111111-0000-0000-0000-000000000004', scheduled_at: d(5),  status: 'agendada',   type: 'Consulta' },
      { patient_id: 'f0000101-0000-0000-0000-000000000005', doctor_id: '11111111-0000-0000-0000-000000000001', scheduled_at: d(-1), status: 'atendida',   type: 'Consulta' },
      { patient_id: 'f0000101-0000-0000-0000-000000000001', doctor_id: '11111111-0000-0000-0000-000000000005', scheduled_at: d(-6), status: 'atendida',   type: 'Consulta' },
      { patient_id: 'f0000101-0000-0000-0000-000000000002', doctor_id: '11111111-0000-0000-0000-000000000006', scheduled_at: d(7),  status: 'cancelada',  type: 'Consulta' },
    ],
  },

  odontologia: {
    domain_type: 'odontologia',
    clinic_name: 'OdontoClin',
    working_hours: 'Segunda a Sexta, 8h às 19h — Sábado, 8h às 14h',
    services: [
      { name: 'Consulta Odontológica', description: 'Avaliação e diagnóstico' },
      { name: 'Limpeza e Profilaxia',  description: 'Higiene e prevenção' },
      { name: 'Tratamento de Canal',   description: 'Endodontia' },
      { name: 'Aparelho Ortodôntico',  description: 'Correção do alinhamento' },
      { name: 'Implante Dentário',     description: 'Reposição de dentes' },
      { name: 'Clareamento Dental',    description: 'Estética e branqueamento' },
    ],
    doctors: [
      { id: 'f0000200-0000-0000-0000-000000000001', name: 'Dr. Marcos Alves',    specialty: 'Ortodontia',      crm: 'CRO-SP 10001' },
      { id: 'f0000200-0000-0000-0000-000000000002', name: 'Dra. Patrícia Rocha', specialty: 'Implantodontia',  crm: 'CRO-SP 10002' },
      { id: 'f0000200-0000-0000-0000-000000000003', name: 'Dr. Eduardo Braga',   specialty: 'Endodontia',      crm: 'CRO-SP 10003' },
      { id: 'f0000200-0000-0000-0000-000000000004', name: 'Dra. Renata Melo',    specialty: 'Estética Dental', crm: 'CRO-SP 10004' },
    ],
    patients: [
      { id: 'f0000201-0000-0000-0000-000000000001', name: 'Thiago Pires',   phone: '+5511000020001', convenio: 'Odontoprev',      photo_emoji: '👨'   },
      { id: 'f0000201-0000-0000-0000-000000000002', name: 'Amanda Torres',  phone: '+5511000020002', convenio: 'Amil Dental',     photo_emoji: '👩'   },
      { id: 'f0000201-0000-0000-0000-000000000003', name: 'Lucas Gomes',    phone: '+5511000020003', convenio: 'Particular',      photo_emoji: '👦'   },
      { id: 'f0000201-0000-0000-0000-000000000004', name: 'Isabela Castro', phone: '+5511000020004', convenio: 'Bradesco Dental', photo_emoji: '👩‍🦱' },
      { id: 'f0000201-0000-0000-0000-000000000005', name: 'Roberto Faria',  phone: '+5511000020005', convenio: 'Particular',      photo_emoji: '👴'   },
    ],
    appointments: () => [
      { patient_id: 'f0000201-0000-0000-0000-000000000001', doctor_id: 'f0000200-0000-0000-0000-000000000001', scheduled_at: h(3),  status: 'agendada',   type: 'Consulta Odontológica' },
      { patient_id: 'f0000201-0000-0000-0000-000000000002', doctor_id: 'f0000200-0000-0000-0000-000000000003', scheduled_at: h(25), status: 'confirmada', type: 'Tratamento de Canal' },
      { patient_id: 'f0000201-0000-0000-0000-000000000003', doctor_id: 'f0000200-0000-0000-0000-000000000001', scheduled_at: d(2),  status: 'agendada',   type: 'Manutenção de Aparelho' },
      { patient_id: 'f0000201-0000-0000-0000-000000000004', doctor_id: 'f0000200-0000-0000-0000-000000000002', scheduled_at: d(4),  status: 'agendada',   type: 'Avaliação para Implante' },
      { patient_id: 'f0000201-0000-0000-0000-000000000005', doctor_id: 'f0000200-0000-0000-0000-000000000004', scheduled_at: d(7),  status: 'agendada',   type: 'Clareamento Dental' },
      { patient_id: 'f0000201-0000-0000-0000-000000000001', doctor_id: 'f0000200-0000-0000-0000-000000000004', scheduled_at: d(-1), status: 'atendida',   type: 'Consulta Odontológica' },
      { patient_id: 'f0000201-0000-0000-0000-000000000002', doctor_id: 'f0000200-0000-0000-0000-000000000002', scheduled_at: d(-5), status: 'atendida',   type: 'Avaliação de Implante' },
    ],
  },

  veterinaria: {
    domain_type: 'veterinaria',
    clinic_name: 'PetCare Veterinária',
    working_hours: 'Segunda a Sábado, 8h às 20h — Domingo emergências, 9h às 18h',
    services: [
      { name: 'Consulta Veterinária', description: 'Avaliação e diagnóstico animal' },
      { name: 'Vacinação',            description: 'Imunização e prevenção' },
      { name: 'Cirurgia Veterinária', description: 'Procedimentos cirúrgicos' },
      { name: 'Banho e Tosa',         description: 'Higiene e estética pet' },
      { name: 'Dermatologia Animal',  description: 'Pele e pelagem' },
      { name: 'Retorno Pós-Cirurgia', description: 'Acompanhamento pós-operatório' },
    ],
    doctors: [
      { id: 'f0000300-0000-0000-0000-000000000001', name: 'Dr. Bruno Ferreira', specialty: 'Clínico Geral Veterinário', crm: 'CRMV-SP 20001' },
      { id: 'f0000300-0000-0000-0000-000000000002', name: 'Dra. Camila Nunes',  specialty: 'Dermatologia Veterinária',  crm: 'CRMV-SP 20002' },
      { id: 'f0000300-0000-0000-0000-000000000003', name: 'Dr. Felipe Assis',   specialty: 'Cirurgia Veterinária',      crm: 'CRMV-SP 20003' },
    ],
    patients: [
      { id: 'f0000301-0000-0000-0000-000000000001', name: 'Carlos Silva (Bolinha - Labrador)',    phone: '+5511000030001', convenio: 'Pet Society',   photo_emoji: '🐕' },
      { id: 'f0000301-0000-0000-0000-000000000002', name: 'Mariana Lopes (Mimi - Gato Persa)',    phone: '+5511000030002', convenio: 'Anclivepa',     photo_emoji: '🐈' },
      { id: 'f0000301-0000-0000-0000-000000000003', name: 'Paulo Ramos (Thor - Bulldog Francês)', phone: '+5511000030003', convenio: 'Particular',    photo_emoji: '🐶' },
      { id: 'f0000301-0000-0000-0000-000000000004', name: 'Juliana Vieira (Mel - Golden)',         phone: '+5511000030004', convenio: 'Particular',    photo_emoji: '🦮' },
      { id: 'f0000301-0000-0000-0000-000000000005', name: 'Rodrigo Barros (Luna - Gata SRD)',     phone: '+5511000030005', convenio: 'Petlove Saúde', photo_emoji: '🐱' },
    ],
    appointments: () => [
      { patient_id: 'f0000301-0000-0000-0000-000000000001', doctor_id: 'f0000300-0000-0000-0000-000000000001', scheduled_at: h(1),  status: 'agendada',   type: 'Vacinação' },
      { patient_id: 'f0000301-0000-0000-0000-000000000002', doctor_id: 'f0000300-0000-0000-0000-000000000002', scheduled_at: h(4),  status: 'confirmada', type: 'Consulta Veterinária' },
      { patient_id: 'f0000301-0000-0000-0000-000000000003', doctor_id: 'f0000300-0000-0000-0000-000000000003', scheduled_at: h(28), status: 'agendada',   type: 'Cirurgia de Castração' },
      { patient_id: 'f0000301-0000-0000-0000-000000000004', doctor_id: 'f0000300-0000-0000-0000-000000000001', scheduled_at: d(3),  status: 'agendada',   type: 'Banho e Tosa' },
      { patient_id: 'f0000301-0000-0000-0000-000000000003', doctor_id: 'f0000300-0000-0000-0000-000000000003', scheduled_at: d(6),  status: 'agendada',   type: 'Retorno Pós-Cirurgia' },
      { patient_id: 'f0000301-0000-0000-0000-000000000005', doctor_id: 'f0000300-0000-0000-0000-000000000001', scheduled_at: d(-1), status: 'atendida',   type: 'Consulta Veterinária' },
      { patient_id: 'f0000301-0000-0000-0000-000000000001', doctor_id: 'f0000300-0000-0000-0000-000000000001', scheduled_at: d(-3), status: 'atendida',   type: 'Vacinação' },
    ],
  },

  personal: {
    domain_type: 'personal',
    clinic_name: 'FitLife Academia',
    working_hours: 'Segunda a Sexta, 6h às 22h — Sábado, 7h às 18h — Domingo, 8h às 14h',
    services: [
      { name: 'Personal Training',         description: 'Treino personalizado individual' },
      { name: 'Pilates',                   description: 'Condicionamento e flexibilidade' },
      { name: 'Treino Funcional',          description: 'Exercícios funcionais' },
      { name: 'Avaliação Física',          description: 'Composição corporal e performance' },
      { name: 'Cardio e Emagrecimento',    description: 'Queima de gordura e resistência' },
      { name: 'Personal Training — Força', description: 'Musculação e hipertrofia' },
    ],
    doctors: [
      { id: 'f0000400-0000-0000-0000-000000000001', name: 'João Andrade',    specialty: 'Musculação e Hipertrofia', crm: 'CREF-SP 40001' },
      { id: 'f0000400-0000-0000-0000-000000000002', name: 'Fernanda Lopes',  specialty: 'Pilates e Funcional',      crm: 'CREF-SP 40002' },
      { id: 'f0000400-0000-0000-0000-000000000003', name: 'Gustavo Ribeiro', specialty: 'Cardio e Emagrecimento',   crm: 'CREF-SP 40003' },
    ],
    patients: [
      { id: 'f0000401-0000-0000-0000-000000000001', name: 'Marina Azevedo', phone: '+5511000040001', convenio: 'Plano Mensal',     photo_emoji: '👩'   },
      { id: 'f0000401-0000-0000-0000-000000000002', name: 'Rafael Cunha',   phone: '+5511000040002', convenio: 'Plano Trimestral', photo_emoji: '👨'   },
      { id: 'f0000401-0000-0000-0000-000000000003', name: 'Sophia Lima',    phone: '+5511000040003', convenio: 'Plano Anual',      photo_emoji: '👩‍🦱' },
      { id: 'f0000401-0000-0000-0000-000000000004', name: 'Diego Santos',   phone: '+5511000040004', convenio: 'Avulso',           photo_emoji: '👦'   },
      { id: 'f0000401-0000-0000-0000-000000000005', name: 'Tatiana Moura',  phone: '+5511000040005', convenio: 'Plano Mensal',     photo_emoji: '👩‍🦳' },
      { id: 'f0000401-0000-0000-0000-000000000006', name: 'Felipe Borges',  phone: '+5511000040006', convenio: 'Plano Trimestral', photo_emoji: '👴'   },
    ],
    appointments: () => [
      { patient_id: 'f0000401-0000-0000-0000-000000000001', doctor_id: 'f0000400-0000-0000-0000-000000000001', scheduled_at: h(1),  status: 'confirmada', type: 'Personal Training — Musculação' },
      { patient_id: 'f0000401-0000-0000-0000-000000000002', doctor_id: 'f0000400-0000-0000-0000-000000000002', scheduled_at: h(5),  status: 'agendada',   type: 'Sessão de Pilates' },
      { patient_id: 'f0000401-0000-0000-0000-000000000003', doctor_id: 'f0000400-0000-0000-0000-000000000002', scheduled_at: h(22), status: 'agendada',   type: 'Treino Funcional' },
      { patient_id: 'f0000401-0000-0000-0000-000000000004', doctor_id: 'f0000400-0000-0000-0000-000000000003', scheduled_at: h(29), status: 'agendada',   type: 'Sessão Cardio e Emagrecimento' },
      { patient_id: 'f0000401-0000-0000-0000-000000000005', doctor_id: 'f0000400-0000-0000-0000-000000000001', scheduled_at: d(2),  status: 'agendada',   type: 'Avaliação Física' },
      { patient_id: 'f0000401-0000-0000-0000-000000000006', doctor_id: 'f0000400-0000-0000-0000-000000000001', scheduled_at: d(3),  status: 'agendada',   type: 'Personal Training — Força' },
      { patient_id: 'f0000401-0000-0000-0000-000000000001', doctor_id: 'f0000400-0000-0000-0000-000000000001', scheduled_at: d(-1), status: 'atendida',   type: 'Personal Training — Musculação' },
      { patient_id: 'f0000401-0000-0000-0000-000000000002', doctor_id: 'f0000400-0000-0000-0000-000000000002', scheduled_at: d(-2), status: 'atendida',   type: 'Sessão de Pilates' },
      { patient_id: 'f0000401-0000-0000-0000-000000000003', doctor_id: 'f0000400-0000-0000-0000-000000000003', scheduled_at: d(8),  status: 'cancelada',  type: 'Sessão Cardio' },
    ],
  },

  salao: {
    domain_type: 'salao',
    clinic_name: 'Salão Bella Arte',
    working_hours: 'Terça a Sábado, 9h às 19h — Segunda fechado',
    services: [
      { name: 'Corte Feminino',        description: 'Corte e modelagem' },
      { name: 'Coloração',             description: 'Mechas, luzes e coloração' },
      { name: 'Escova Progressiva',    description: 'Alisamento e modelagem' },
      { name: 'Hidratação Capilar',    description: 'Nutrição e recuperação dos fios' },
      { name: 'Manicure e Pedicure',   description: 'Cuidados com unhas' },
      { name: 'Design de Sobrancelha', description: 'Modelagem e micropigmentação' },
    ],
    doctors: [
      { id: 'f0000500-0000-0000-0000-000000000001', name: 'Carla Vieira',    specialty: 'Coloração e Tratamento',         crm: 'SALAO-SP 50001' },
      { id: 'f0000500-0000-0000-0000-000000000002', name: 'Roberta Melo',    specialty: 'Corte e Penteado',               crm: 'SALAO-SP 50002' },
      { id: 'f0000500-0000-0000-0000-000000000003', name: 'Patrícia Duarte', specialty: 'Manicure e Pedicure',            crm: 'SALAO-SP 50003' },
      { id: 'f0000500-0000-0000-0000-000000000004', name: 'Aline Teixeira',  specialty: 'Sobrancelha e Micropigmentação', crm: 'SALAO-SP 50004' },
    ],
    patients: [
      { id: 'f0000501-0000-0000-0000-000000000001', name: 'Priscila Barros',    phone: '+5511000050001', convenio: 'Particular',           photo_emoji: '👩'   },
      { id: 'f0000501-0000-0000-0000-000000000002', name: 'Sandra Oliveira',    phone: '+5511000050002', convenio: 'Cartão de Benefícios', photo_emoji: '👩‍🦱' },
      { id: 'f0000501-0000-0000-0000-000000000003', name: 'Claudia Ramos',      phone: '+5511000050003', convenio: 'Particular',           photo_emoji: '👩‍🦳' },
      { id: 'f0000501-0000-0000-0000-000000000004', name: 'Ana Paula Ferreira', phone: '+5511000050004', convenio: 'Particular',           photo_emoji: '👧'   },
      { id: 'f0000501-0000-0000-0000-000000000005', name: 'Letícia Costa',      phone: '+5511000050005', convenio: 'Cartão de Benefícios', photo_emoji: '👩'   },
      { id: 'f0000501-0000-0000-0000-000000000006', name: 'Renata Almeida',     phone: '+5511000050006', convenio: 'Particular',           photo_emoji: '👩‍🦰' },
    ],
    appointments: () => [
      { patient_id: 'f0000501-0000-0000-0000-000000000001', doctor_id: 'f0000500-0000-0000-0000-000000000001', scheduled_at: h(1),  status: 'confirmada', type: 'Coloração — Mechas' },
      { patient_id: 'f0000501-0000-0000-0000-000000000002', doctor_id: 'f0000500-0000-0000-0000-000000000002', scheduled_at: h(3),  status: 'agendada',   type: 'Corte Feminino' },
      { patient_id: 'f0000501-0000-0000-0000-000000000003', doctor_id: 'f0000500-0000-0000-0000-000000000003', scheduled_at: h(5),  status: 'agendada',   type: 'Manicure e Pedicure' },
      { patient_id: 'f0000501-0000-0000-0000-000000000004', doctor_id: 'f0000500-0000-0000-0000-000000000001', scheduled_at: h(24), status: 'agendada',   type: 'Hidratação Capilar' },
      { patient_id: 'f0000501-0000-0000-0000-000000000005', doctor_id: 'f0000500-0000-0000-0000-000000000002', scheduled_at: d(2),  status: 'agendada',   type: 'Escova Progressiva' },
      { patient_id: 'f0000501-0000-0000-0000-000000000006', doctor_id: 'f0000500-0000-0000-0000-000000000004', scheduled_at: d(3),  status: 'agendada',   type: 'Design de Sobrancelha' },
      { patient_id: 'f0000501-0000-0000-0000-000000000001', doctor_id: 'f0000500-0000-0000-0000-000000000002', scheduled_at: d(5),  status: 'agendada',   type: 'Penteado para Evento' },
      { patient_id: 'f0000501-0000-0000-0000-000000000002', doctor_id: 'f0000500-0000-0000-0000-000000000003', scheduled_at: d(-1), status: 'atendida',   type: 'Manicure' },
      { patient_id: 'f0000501-0000-0000-0000-000000000001', doctor_id: 'f0000500-0000-0000-0000-000000000001', scheduled_at: d(-4), status: 'atendida',   type: 'Coloração — Retoque' },
    ],
  },

  reset: {
    domain_type: 'clinica',
    clinic_name: 'Clínica São Lucas',
    working_hours: 'Segunda a Sexta, 8h às 18h',
    services: [
      { name: 'Clínico Geral', description: 'Consultas gerais, check-up, atestados' },
      { name: 'Cardiologia',   description: 'Coração e sistema cardiovascular' },
      { name: 'Dermatologia',  description: 'Pele, cabelo e unhas' },
      { name: 'Pediatria',     description: 'Crianças e adolescentes' },
      { name: 'Ortopedia',     description: 'Ossos, articulações e coluna' },
      { name: 'Neurologia',    description: 'Sistema nervoso e cérebro' },
    ],
    doctors: [
      { id: '11111111-0000-0000-0000-000000000001', name: 'Dr. Cardoso',   specialty: 'Clínica Geral', crm: 'CRM-SP 12345' },
      { id: '11111111-0000-0000-0000-000000000002', name: 'Dra. Lima',     specialty: 'Cardiologia',   crm: 'CRM-SP 23456' },
      { id: '11111111-0000-0000-0000-000000000003', name: 'Dr. Fernandes', specialty: 'Dermatologia',  crm: 'CRM-SP 34567' },
      { id: '11111111-0000-0000-0000-000000000004', name: 'Dra. Costa',    specialty: 'Ortopedia',     crm: 'CRM-SP 45678' },
      { id: '11111111-0000-0000-0000-000000000005', name: 'Dr. Alves',     specialty: 'Pediatria',     crm: 'CRM-SP 56789' },
      { id: '11111111-0000-0000-0000-000000000006', name: 'Dr. Santos',    specialty: 'Neurologia',    crm: 'CRM-SP 67890' },
    ],
    patients: [],
    appointments: () => [],
  },
} satisfies Record<ScriptKey, {
  domain_type: string; clinic_name: string; working_hours: string
  services: { name: string; description: string }[]
  doctors: { id: string; name: string; specialty: string; crm: string }[]
  patients: { id: string; name: string; phone: string; convenio: string; photo_emoji: string }[]
  appointments: () => { patient_id: string; doctor_id: string; scheduled_at: string; status: string; type: string }[]
}>

// ── GET: list available scripts ───────────────────────────────────────────────
export async function GET() {
  const auth = await requireAuth()
  if (auth instanceof NextResponse) return auth

  const list: { key: ScriptKey; label: string; description: string; icon: string }[] = [
    { key: 'barbearia',   icon: '✂️', label: 'Barbearia',          description: '3 barbeiros · 6 clientes · 9 atendimentos' },
    { key: 'clinica',     icon: '🏥', label: 'Clínica Médica',      description: '6 médicos · 5 pacientes · 7 consultas' },
    { key: 'odontologia', icon: '🦷', label: 'Odontologia',         description: '4 dentistas · 5 pacientes · 7 consultas' },
    { key: 'veterinaria', icon: '🐾', label: 'Veterinária',         description: '3 veterinários · 5 tutores · 7 consultas' },
    { key: 'personal',    icon: '💪', label: 'Academia / Personal', description: '3 trainers · 6 alunos · 9 sessões' },
    { key: 'salao',       icon: '💇', label: 'Salão de Beleza',     description: '4 profissionais · 6 clientes · 9 atendimentos' },
    { key: 'reset',       icon: '🔄', label: 'Reset (Clínica base)',description: 'Remove todos os dados de teste, restaura clínica médica' },
  ]
  return NextResponse.json(list)
}

// ── POST: run a script ────────────────────────────────────────────────────────
export async function POST(req: NextRequest) {
  const auth = await requireAuth()
  if (auth instanceof NextResponse) return auth

  const { script }: { script: ScriptKey } = await req.json()
  if (!script || !(script in SEEDS)) {
    return NextResponse.json({ error: 'Script inválido' }, { status: 400 })
  }

  const db   = createServerClient()
  const seed = SEEDS[script]
  const steps: string[] = []
  const errors: string[] = []

  try {
    // 1. Activate target profile
    await db.from('profiles').update({ is_active: false }).neq('id', '00000000-0000-0000-0000-000000000000')
    await db.from('profiles').update({ is_active: true }).eq('domain_type', seed.domain_type)
    steps.push(`Perfil "${seed.domain_type}" ativado`)

    // 2. Update clinic_config
    await db.from('clinic_config').upsert(
      [
        { key: 'clinic_name',   value: seed.clinic_name },
        { key: 'working_hours', value: seed.working_hours },
        { key: 'services',      value: seed.services },
      ],
      { onConflict: 'key' }
    )
    steps.push('clinic_config atualizado')

    // 3. Clear WhatsApp & approval data
    await db.from('wa_messages').delete().neq('id', '00000000-0000-0000-0000-000000000000')
    await db.from('approval_requests').delete().neq('id', '00000000-0000-0000-0000-000000000000')
    await db.from('wa_sessions').delete().neq('id', '00000000-0000-0000-0000-000000000000')
    steps.push('Dados de WhatsApp e aprovações limpos')

    // 4. Wipe all appointments, patients and doctors — all data is mock/test
    await db.from('appointment_history').delete().neq('id', '00000000-0000-0000-0000-000000000000')
    await db.from('appointments').delete().neq('id', '00000000-0000-0000-0000-000000000000')
    await db.from('patients').delete().neq('id', '00000000-0000-0000-0000-000000000000')
    await db.from('doctors').delete().neq('id', '00000000-0000-0000-0000-000000000000')
    steps.push('Agendamentos e profissionais de teste removidos')

    // 5. Insert doctors
    if (seed.doctors.length) {
      const { error } = await db.from('doctors').upsert(seed.doctors, { onConflict: 'id', ignoreDuplicates: true })
      if (error) errors.push(`doctors: ${error.message}`)
      else steps.push(`${seed.doctors.length} profissional(is) inserido(s)`)
    }

    // 6. Insert patients/clients
    if (seed.patients.length) {
      const now  = new Date().toISOString()
      const rows = seed.patients.map(p => ({ ...p, lgpd_consent_at: now }))
      const { error } = await db.from('patients').upsert(rows, { onConflict: 'id', ignoreDuplicates: true })
      if (error) errors.push(`patients: ${error.message}`)
      else steps.push(`${seed.patients.length} cliente(s)/paciente(s) inserido(s)`)
    }

    // 7. Insert appointments
    const appts = seed.appointments()
    if (appts.length) {
      const { error } = await db.from('appointments').insert(appts)
      if (error) errors.push(`appointments: ${error.message}`)
      else steps.push(`${appts.length} agendamento(s) inserido(s)`)
    }

    // 8. Invalidate server cache
    invalidateClinicBasicConfigCache()

    return NextResponse.json({ ok: errors.length === 0, steps, errors })

  } catch (e: unknown) {
    return NextResponse.json(
      { ok: false, steps, errors: [...errors, e instanceof Error ? e.message : String(e)] },
      { status: 500 }
    )
  }
}
