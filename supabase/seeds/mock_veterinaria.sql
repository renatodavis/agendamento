-- ============================================================
-- MOCK: Veterinária
-- Ativa o perfil e carrega dados de consultas veterinárias
-- (pacientes = tutores, nome inclui o animal para contexto)
-- ============================================================

-- 1. Ativa o perfil
UPDATE profiles SET is_active = false;
UPDATE profiles SET is_active = true WHERE domain_type = 'veterinaria';

-- 2. Atualiza nome e horário
INSERT INTO clinic_config (key, value) VALUES
  ('clinic_name',   '"PetCare Veterinária"'),
  ('working_hours', '"Segunda a Sábado, 8h às 20h — Domingo emergências, 9h às 18h"')
ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value;

-- 3. Limpa dados de teste anteriores
DELETE FROM appointment_history WHERE appointment_id IN (
  SELECT id FROM appointments WHERE patient_id::text LIKE 'mock%'
);
DELETE FROM appointments WHERE patient_id::text LIKE 'mock%';
DELETE FROM wa_sessions  WHERE phone LIKE '+5511000%';
DELETE FROM patients     WHERE id::text LIKE 'mock%';
DELETE FROM doctors      WHERE id::text LIKE 'mock%';

-- 4. Veterinários (campo "crm" usado para CRMV)
INSERT INTO doctors (id, name, specialty, crm) VALUES
  ('mock0300-0000-0000-0000-000000000001', 'Dr. Bruno Ferreira',  'Clínico Geral Veterinário', 'CRMV-SP 20001'),
  ('mock0300-0000-0000-0000-000000000002', 'Dra. Camila Nunes',   'Dermatologia Veterinária',  'CRMV-SP 20002'),
  ('mock0300-0000-0000-0000-000000000003', 'Dr. Felipe Assis',    'Cirurgia Veterinária',      'CRMV-SP 20003')
ON CONFLICT (id) DO NOTHING;

-- 5. Tutores (nome = Tutor + animal para facilitar o teste)
INSERT INTO patients (id, name, phone, convenio, photo_emoji, lgpd_consent_at) VALUES
  ('mock0301-0000-0000-0000-000000000001', 'Carlos Silva (Bolinha - Labrador)',   '+5511000030001', 'Pet Society',    '🐕', now()),
  ('mock0301-0000-0000-0000-000000000002', 'Mariana Lopes (Mimi - Gato Persa)',   '+5511000030002', 'Anclivepa',      '🐈', now()),
  ('mock0301-0000-0000-0000-000000000003', 'Paulo Ramos (Thor - Bulldog Francês)','+5511000030003', 'Particular',     '🐶', now()),
  ('mock0301-0000-0000-0000-000000000004', 'Juliana Vieira (Mel - Golden)',        '+5511000030004', 'Particular',     '🦮', now()),
  ('mock0301-0000-0000-0000-000000000005', 'Rodrigo Barros (Luna - Gata SRD)',    '+5511000030005', 'Petlove Saúde',  '🐱', now())
ON CONFLICT (id) DO NOTHING;

-- 6. Consultas mock
INSERT INTO appointments (patient_id, doctor_id, scheduled_at, status, type) VALUES
  -- Hoje +1h (vacinação)
  ('mock0301-0000-0000-0000-000000000001', 'mock0300-0000-0000-0000-000000000001', NOW() + INTERVAL '1 hour',   'agendada',   'Vacinação'),
  -- Hoje +4h (consulta geral)
  ('mock0301-0000-0000-0000-000000000002', 'mock0300-0000-0000-0000-000000000002', NOW() + INTERVAL '4 hours',  'confirmada', 'Consulta Veterinária'),
  -- Amanhã (cirurgia)
  ('mock0301-0000-0000-0000-000000000003', 'mock0300-0000-0000-0000-000000000003', NOW() + INTERVAL '28 hours', 'agendada',   'Cirurgia de Castração'),
  -- +3 dias (banho e tosa)
  ('mock0301-0000-0000-0000-000000000004', 'mock0300-0000-0000-0000-000000000001', NOW() + INTERVAL '3 days',   'agendada',   'Banho e Tosa'),
  -- +6 dias (retorno pós-cirurgia)
  ('mock0301-0000-0000-0000-000000000003', 'mock0300-0000-0000-0000-000000000003', NOW() + INTERVAL '6 days',   'agendada',   'Retorno Pós-Cirurgia'),
  -- Ontem (atendida)
  ('mock0301-0000-0000-0000-000000000005', 'mock0300-0000-0000-0000-000000000001', NOW() - INTERVAL '1 day',    'atendida',   'Consulta Veterinária'),
  -- 3 dias atrás (atendida — vacinação)
  ('mock0301-0000-0000-0000-000000000001', 'mock0300-0000-0000-0000-000000000001', NOW() - INTERVAL '3 days',   'atendida',   'Vacinação')
ON CONFLICT DO NOTHING;

-- Verificação
SELECT 'Perfil ativo:'   AS info, name       FROM profiles  WHERE is_active = true;
SELECT 'Veterinários:'   AS info, COUNT(*)::text FROM doctors WHERE id::text LIKE 'mock03%';
SELECT 'Tutores mock:'   AS info, COUNT(*)::text FROM patients WHERE id::text LIKE 'mock%';
SELECT 'Agendamentos:'   AS info, status, COUNT(*) FROM appointments GROUP BY status ORDER BY status;
