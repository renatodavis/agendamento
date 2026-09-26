-- ============================================================
-- MOCK: Odontologia
-- ============================================================

-- 1. Ativa o perfil
UPDATE profiles SET is_active = false;
UPDATE profiles SET is_active = true WHERE domain_type = 'odontologia';

-- 2. Atualiza clinic_config
INSERT INTO clinic_config (key, value) VALUES
  ('clinic_name',   '"OdontoClin"'),
  ('working_hours', '"Segunda a Sexta, 8h às 19h — Sábado, 8h às 14h"'),
  ('services', '[
    {"name": "Consulta Odontológica", "description": "Avaliação e diagnóstico"},
    {"name": "Limpeza e Profilaxia",  "description": "Higiene e prevenção"},
    {"name": "Tratamento de Canal",   "description": "Endodontia"},
    {"name": "Aparelho Ortodôntico",  "description": "Correção do alinhamento"},
    {"name": "Implante Dentário",     "description": "Reposição de dentes"},
    {"name": "Clareamento Dental",    "description": "Estética e branqueamento"}
  ]')
ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value;

-- 3. Limpa dados de teste anteriores
DELETE FROM appointment_history WHERE appointment_id IN (
  SELECT id FROM appointments
  WHERE patient_id::text LIKE 'f000%'
     OR doctor_id::text  LIKE 'f000%'
     OR doctor_id::text  LIKE '11111111%'
);
DELETE FROM appointments
WHERE patient_id::text LIKE 'f000%'
   OR doctor_id::text  LIKE 'f000%'
   OR doctor_id::text  LIKE '11111111%';
DELETE FROM wa_sessions  WHERE phone LIKE '+5511000%';
DELETE FROM patients     WHERE id::text LIKE 'f000%';
-- Remove todos os médicos (seed + outros perfis) e insere apenas dentistas
DELETE FROM doctors WHERE id::text LIKE 'f000%' OR id::text LIKE '11111111%';

-- 4. Dentistas — UUID: f0000200-0000-0000-0000-00000000000N
INSERT INTO doctors (id, name, specialty, crm) VALUES
  ('f0000200-0000-0000-0000-000000000001', 'Dr. Marcos Alves',    'Ortodontia',      'CRO-SP 10001'),
  ('f0000200-0000-0000-0000-000000000002', 'Dra. Patrícia Rocha', 'Implantodontia',  'CRO-SP 10002'),
  ('f0000200-0000-0000-0000-000000000003', 'Dr. Eduardo Braga',   'Endodontia',      'CRO-SP 10003'),
  ('f0000200-0000-0000-0000-000000000004', 'Dra. Renata Melo',    'Estética Dental', 'CRO-SP 10004')
ON CONFLICT (id) DO NOTHING;

-- 5. Pacientes — UUID: f0000201-0000-0000-0000-00000000000N
INSERT INTO patients (id, name, phone, convenio, photo_emoji, lgpd_consent_at) VALUES
  ('f0000201-0000-0000-0000-000000000001', 'Thiago Pires',   '+5511000020001', 'Odontoprev',      '👨',   now()),
  ('f0000201-0000-0000-0000-000000000002', 'Amanda Torres',  '+5511000020002', 'Amil Dental',     '👩',   now()),
  ('f0000201-0000-0000-0000-000000000003', 'Lucas Gomes',    '+5511000020003', 'Particular',      '👦',   now()),
  ('f0000201-0000-0000-0000-000000000004', 'Isabela Castro', '+5511000020004', 'Bradesco Dental', '👩‍🦱', now()),
  ('f0000201-0000-0000-0000-000000000005', 'Roberto Faria',  '+5511000020005', 'Particular',      '👴',   now())
ON CONFLICT (id) DO NOTHING;

-- 6. Agendamentos mock
INSERT INTO appointments (patient_id, doctor_id, scheduled_at, status, type) VALUES
  ('f0000201-0000-0000-0000-000000000001', 'f0000200-0000-0000-0000-000000000001', NOW() + INTERVAL '3 hours',  'agendada',   'Consulta Odontológica'),
  ('f0000201-0000-0000-0000-000000000002', 'f0000200-0000-0000-0000-000000000003', NOW() + INTERVAL '25 hours', 'confirmada', 'Tratamento de Canal'),
  ('f0000201-0000-0000-0000-000000000003', 'f0000200-0000-0000-0000-000000000001', NOW() + INTERVAL '2 days',   'agendada',   'Manutenção de Aparelho'),
  ('f0000201-0000-0000-0000-000000000004', 'f0000200-0000-0000-0000-000000000002', NOW() + INTERVAL '4 days',   'agendada',   'Avaliação para Implante'),
  ('f0000201-0000-0000-0000-000000000005', 'f0000200-0000-0000-0000-000000000004', NOW() + INTERVAL '7 days',   'agendada',   'Clareamento Dental'),
  ('f0000201-0000-0000-0000-000000000001', 'f0000200-0000-0000-0000-000000000004', NOW() - INTERVAL '1 day',    'atendida',   'Consulta Odontológica'),
  ('f0000201-0000-0000-0000-000000000002', 'f0000200-0000-0000-0000-000000000002', NOW() - INTERVAL '5 days',   'atendida',   'Avaliação de Implante')
ON CONFLICT DO NOTHING;

-- Verificação
SELECT 'Perfil ativo:'   AS info, name          FROM profiles  WHERE is_active = true;
SELECT 'Dentistas:'      AS info, COUNT(*)::text FROM doctors;
SELECT 'Pacientes mock:' AS info, COUNT(*)::text FROM patients  WHERE id::text LIKE 'f000%';
SELECT 'Agendamentos:'   AS info, status, COUNT(*) FROM appointments GROUP BY status ORDER BY status;
