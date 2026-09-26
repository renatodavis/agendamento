-- ============================================================
-- MOCK: Clínica Médica
-- Ativa o perfil e carrega dados de consultas médicas
-- ============================================================

-- 1. Ativa o perfil
UPDATE profiles SET is_active = false;
UPDATE profiles SET is_active = true WHERE domain_type = 'clinica';

-- 2. Atualiza nome e horário
INSERT INTO clinic_config (key, value) VALUES
  ('clinic_name',   '"Clínica São Lucas"'),
  ('working_hours', '"Segunda a Sexta, 8h às 18h — Sábado, 8h às 12h"')
ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value;

-- 3. Limpa dados de teste anteriores
DELETE FROM appointment_history WHERE appointment_id IN (
  SELECT id FROM appointments WHERE patient_id::text LIKE 'f000%'
);
DELETE FROM appointments WHERE patient_id::text LIKE 'f000%';
DELETE FROM wa_sessions  WHERE phone LIKE '+5511000%';
DELETE FROM patients     WHERE id::text LIKE 'f000%';
DELETE FROM doctors      WHERE id::text LIKE 'f000%';

-- 4. Profissionais (usa seed inicial — doctors 11111111-*)
-- (já existem Dr. Cardoso, Dra. Lima, Dr. Fernandes, Dra. Costa, Dr. Alves, Dr. Santos)

-- 5. Pacientes / clientes mock
-- UUID: f0000101-0000-0000-0000-00000000000N
INSERT INTO patients (id, name, phone, convenio, photo_emoji, lgpd_consent_at) VALUES
  ('f0000101-0000-0000-0000-000000000001', 'Beatriz Nunes',    '+5511000010001', 'Unimed',         '👩',   now()),
  ('f0000101-0000-0000-0000-000000000002', 'Henrique Soares',  '+5511000010002', 'Bradesco Saúde', '👨',   now()),
  ('f0000101-0000-0000-0000-000000000003', 'Larissa Moraes',   '+5511000010003', 'Particular',     '👩‍🦱', now()),
  ('f0000101-0000-0000-0000-000000000004', 'Antônio Ferreira', '+5511000010004', 'Amil',           '👴',   now()),
  ('f0000101-0000-0000-0000-000000000005', 'Camila Dias',      '+5511000010005', 'SulAmérica',     '👧',   now())
ON CONFLICT (id) DO NOTHING;

-- 6. Agendamentos mock
INSERT INTO appointments (patient_id, doctor_id, scheduled_at, status, type) VALUES
  ('f0000101-0000-0000-0000-000000000001', '11111111-0000-0000-0000-000000000001', NOW() + INTERVAL '2 hours',  'agendada',   'Consulta'),
  ('f0000101-0000-0000-0000-000000000002', '11111111-0000-0000-0000-000000000002', NOW() + INTERVAL '26 hours', 'confirmada', 'Consulta'),
  ('f0000101-0000-0000-0000-000000000003', '11111111-0000-0000-0000-000000000003', NOW() + INTERVAL '3 days',   'agendada',   'Retorno'),
  ('f0000101-0000-0000-0000-000000000004', '11111111-0000-0000-0000-000000000004', NOW() + INTERVAL '5 days',   'agendada',   'Consulta'),
  ('f0000101-0000-0000-0000-000000000005', '11111111-0000-0000-0000-000000000001', NOW() - INTERVAL '1 day',    'atendida',   'Consulta'),
  ('f0000101-0000-0000-0000-000000000001', '11111111-0000-0000-0000-000000000005', NOW() - INTERVAL '6 days',   'atendida',   'Consulta'),
  ('f0000101-0000-0000-0000-000000000002', '11111111-0000-0000-0000-000000000006', NOW() + INTERVAL '7 days',   'cancelada',  'Consulta')
ON CONFLICT DO NOTHING;

-- Verificação
SELECT 'Perfil ativo:'   AS info, name          FROM profiles WHERE is_active = true;
SELECT 'Profissionais:'  AS info, COUNT(*)::text FROM doctors;
SELECT 'Clientes mock:'  AS info, COUNT(*)::text FROM patients WHERE id::text LIKE 'f000%';
SELECT 'Agendamentos:'   AS info, status, COUNT(*) FROM appointments GROUP BY status ORDER BY status;
