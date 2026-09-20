-- ═══════════════════════════════════════════════════════════════════
-- Clínica São Lucas — Schema inicial
-- LGPD Art.11 + CFM 2.314/2022 + WhatsApp Business API
-- ═══════════════════════════════════════════════════════════════════

-- Habilitar extensões
create extension if not exists "uuid-ossp";
create extension if not exists "pgcrypto";

-- ── Pacientes ────────────────────────────────────────────────────────
create table patients (
  id              uuid primary key default uuid_generate_v4(),
  name            text not null,
  phone           text,                        -- armazenado criptografado em prod
  cpf_hash        text,                        -- SHA-256 do CPF, nunca o valor real
  convenio        text not null default 'Particular',
  photo_emoji     text not null default '👤',
  lgpd_consent_at timestamptz,                 -- null = não coletado ainda
  created_at      timestamptz not null default now()
);

-- ── Médicos ──────────────────────────────────────────────────────────
create table doctors (
  id         uuid primary key default uuid_generate_v4(),
  name       text not null,
  specialty  text not null,
  crm        text not null unique,
  created_at timestamptz not null default now()
);

-- ── Consultas ────────────────────────────────────────────────────────
create type appointment_status as enum (
  'agendada', 'confirmada', 'pendente', 'atendida', 'cancelada'
);

create table appointments (
  id            uuid primary key default uuid_generate_v4(),
  patient_id    uuid not null references patients(id),
  doctor_id     uuid not null references doctors(id),
  scheduled_at  timestamptz not null,
  status        appointment_status not null default 'agendada',
  type          text not null default 'Consulta',
  cancel_reason text,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

-- trigger para updated_at automático
create or replace function set_updated_at()
returns trigger language plpgsql as $$
begin new.updated_at = now(); return new; end;
$$;
create trigger appointments_updated_at
  before update on appointments
  for each row execute function set_updated_at();

-- ── Histórico de consultas (imutável — sem UPDATE nem DELETE) ────────
create type history_kind as enum (
  'schedule', 'confirm', 'attend', 'cancel', 'reschedule'
);

create table appointment_history (
  id             uuid primary key default uuid_generate_v4(),
  appointment_id uuid not null references appointments(id),
  event          text not null,
  kind           history_kind not null,
  actor          text not null default 'system',
  created_at     timestamptz not null default now()
);

-- Proteção: somente INSERT permitido (sem UPDATE/DELETE)
create rule appointment_history_no_update as
  on update to appointment_history do instead nothing;
create rule appointment_history_no_delete as
  on delete to appointment_history do instead nothing;

-- ── Consentimentos LGPD ──────────────────────────────────────────────
create table lgpd_consents (
  id          uuid primary key default uuid_generate_v4(),
  patient_id  uuid not null references patients(id),
  version     text not null default '1.0',
  consented_at timestamptz not null default now(),
  revoked_at  timestamptz
);

-- ── Log de auditoria (imutável) ──────────────────────────────────────
create table audit_log (
  id          uuid primary key default uuid_generate_v4(),
  actor_type  text not null check (actor_type in ('agent','user','system')),
  actor_id    text not null,
  action      text not null,
  record_type text not null,
  record_id   text not null,
  created_at  timestamptz not null default now()
);

create rule audit_log_no_update as
  on update to audit_log do instead nothing;
create rule audit_log_no_delete as
  on delete to audit_log do instead nothing;

-- ── WhatsApp sessions ────────────────────────────────────────────────
create table wa_sessions (
  id              uuid primary key default uuid_generate_v4(),
  patient_id      uuid references patients(id),
  phone           text not null unique,
  last_inbound_at timestamptz,
  opt_in          boolean not null default false,
  opt_out_at      timestamptz
);

create table wa_messages (
  id          uuid primary key default uuid_generate_v4(),
  session_id  uuid not null references wa_sessions(id),
  direction   text not null check (direction in ('inbound','outbound')),
  template_id text,
  body        text not null,
  status      text not null default 'sent'
            check (status in ('sent','delivered','read','failed')),
  sent_at     timestamptz not null default now()
);

-- ── Índices ──────────────────────────────────────────────────────────
create index appointments_patient_id_idx on appointments(patient_id);
create index appointments_doctor_id_idx  on appointments(doctor_id);
create index appointments_scheduled_at_idx on appointments(scheduled_at);
create index appointment_history_appt_id_idx on appointment_history(appointment_id);
create index wa_messages_session_id_idx on wa_messages(session_id);

-- ── Seed: médicos ────────────────────────────────────────────────────
insert into doctors (id, name, specialty, crm) values
  ('11111111-0000-0000-0000-000000000001', 'Dr. Cardoso',   'Clínica Geral',  'CRM-SP 12345'),
  ('11111111-0000-0000-0000-000000000002', 'Dra. Lima',     'Cardiologia',    'CRM-SP 23456'),
  ('11111111-0000-0000-0000-000000000003', 'Dr. Fernandes', 'Dermatologia',   'CRM-SP 34567'),
  ('11111111-0000-0000-0000-000000000004', 'Dra. Costa',    'Ortopedia',      'CRM-SP 45678'),
  ('11111111-0000-0000-0000-000000000005', 'Dr. Alves',     'Pediatria',      'CRM-SP 56789'),
  ('11111111-0000-0000-0000-000000000006', 'Dr. Santos',    'Neurologia',     'CRM-SP 67890');

-- ── Seed: pacientes ──────────────────────────────────────────────────
insert into patients (id, name, phone, convenio, photo_emoji, lgpd_consent_at) values
  ('22222222-0000-0000-0000-000000000001', 'Ana Silva',       '+5511999990001', 'Unimed',          '👩',   now()),
  ('22222222-0000-0000-0000-000000000002', 'Carlos Mendes',   '+5511999990002', 'Bradesco Saúde',  '👨',   now()),
  ('22222222-0000-0000-0000-000000000003', 'Maria Santos',    '+5511999990003', 'Particular',      '👩‍🦱', now()),
  ('22222222-0000-0000-0000-000000000004', 'João Oliveira',   '+5511999990004', 'Amil',            '👴',   now()),
  ('22222222-0000-0000-0000-000000000005', 'Paula Rocha',     '+5511999990005', 'Unimed',          '👩‍🦳', now()),
  ('22222222-0000-0000-0000-000000000006', 'Ricardo Lima',    '+5511999990006', 'SulAmérica',      '👨‍🦱', now()),
  ('22222222-0000-0000-0000-000000000007', 'Fernanda Costa',  '+5511999990007', 'Bradesco Saúde',  '👧',   now());
