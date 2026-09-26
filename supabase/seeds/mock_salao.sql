-- ============================================================
-- MOCK: Salão de Beleza
-- ============================================================

-- 1. Ativa o perfil
UPDATE profiles SET is_active = false;
UPDATE profiles SET is_active = true WHERE domain_type = 'salao';

-- 2. Atualiza clinic_config
INSERT INTO clinic_config (key, value) VALUES
  ('clinic_name',   '"Salão Bella Arte"'),
  ('working_hours', '"Terça a Sábado, 9h às 19h — Segunda fechado"'),
  ('services', '[
    {"name": "Corte Feminino",        "description": "Corte e modelagem"},
    {"name": "Coloração",             "description": "Mechas, luzes e coloração"},
    {"name": "Escova Progressiva",    "description": "Alisamento e modelagem"},
    {"name": "Hidratação Capilar",    "description": "Nutrição e recuperação dos fios"},
    {"name": "Manicure e Pedicure",   "description": "Cuidados com unhas"},
    {"name": "Design de Sobrancelha", "description": "Modelagem e micropigmentação"}
  ]')
ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value;

-- 3. Limpa WhatsApp (mensagens antes das sessões por FK)
DELETE FROM wa_messages;
DELETE FROM approval_requests;
DELETE FROM wa_sessions;

-- 4. Limpa agendamentos e profissionais
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
DELETE FROM patients WHERE id::text LIKE 'f000%';
-- Remove todos os médicos (seed + outros perfis) e insere apenas profissionais do salão
DELETE FROM doctors WHERE id::text LIKE 'f000%' OR id::text LIKE '11111111%';

-- 5. Profissionais do salão — UUID: f0000500-0000-0000-0000-00000000000N
INSERT INTO doctors (id, name, specialty, crm) VALUES
  ('f0000500-0000-0000-0000-000000000001', 'Carla Vieira',    'Coloração e Tratamento',        'SALAO-SP 50001'),
  ('f0000500-0000-0000-0000-000000000002', 'Roberta Melo',    'Corte e Penteado',              'SALAO-SP 50002'),
  ('f0000500-0000-0000-0000-000000000003', 'Patrícia Duarte', 'Manicure e Pedicure',           'SALAO-SP 50003'),
  ('f0000500-0000-0000-0000-000000000004', 'Aline Teixeira',  'Sobrancelha e Micropigmentação','SALAO-SP 50004')
ON CONFLICT (id) DO NOTHING;

-- 6. Clientes — UUID: f0000501-0000-0000-0000-00000000000N
INSERT INTO patients (id, name, phone, convenio, photo_emoji, lgpd_consent_at) VALUES
  ('f0000501-0000-0000-0000-000000000001', 'Priscila Barros',   '+5511000050001', 'Particular',           '👩',   now()),
  ('f0000501-0000-0000-0000-000000000002', 'Sandra Oliveira',   '+5511000050002', 'Cartão de Benefícios', '👩‍🦱', now()),
  ('f0000501-0000-0000-0000-000000000003', 'Claudia Ramos',     '+5511000050003', 'Particular',           '👩‍🦳', now()),
  ('f0000501-0000-0000-0000-000000000004', 'Ana Paula Ferreira','+5511000050004', 'Particular',           '👧',   now()),
  ('f0000501-0000-0000-0000-000000000005', 'Letícia Costa',     '+5511000050005', 'Cartão de Benefícios', '👩',   now()),
  ('f0000501-0000-0000-0000-000000000006', 'Renata Almeida',    '+5511000050006', 'Particular',           '👩‍🦰', now())
ON CONFLICT (id) DO NOTHING;

-- 7. Atendimentos mock
INSERT INTO appointments (patient_id, doctor_id, scheduled_at, status, type) VALUES
  ('f0000501-0000-0000-0000-000000000001', 'f0000500-0000-0000-0000-000000000001', NOW() + INTERVAL '1 hour',   'confirmada', 'Coloração — Mechas'),
  ('f0000501-0000-0000-0000-000000000002', 'f0000500-0000-0000-0000-000000000002', NOW() + INTERVAL '3 hours',  'agendada',   'Corte Feminino'),
  ('f0000501-0000-0000-0000-000000000003', 'f0000500-0000-0000-0000-000000000003', NOW() + INTERVAL '5 hours',  'agendada',   'Manicure e Pedicure'),
  ('f0000501-0000-0000-0000-000000000004', 'f0000500-0000-0000-0000-000000000001', NOW() + INTERVAL '24 hours', 'agendada',   'Hidratação Capilar'),
  ('f0000501-0000-0000-0000-000000000005', 'f0000500-0000-0000-0000-000000000002', NOW() + INTERVAL '2 days',   'agendada',   'Escova Progressiva'),
  ('f0000501-0000-0000-0000-000000000006', 'f0000500-0000-0000-0000-000000000004', NOW() + INTERVAL '3 days',   'agendada',   'Design de Sobrancelha'),
  ('f0000501-0000-0000-0000-000000000001', 'f0000500-0000-0000-0000-000000000002', NOW() + INTERVAL '5 days',   'agendada',   'Penteado para Evento'),
  ('f0000501-0000-0000-0000-000000000002', 'f0000500-0000-0000-0000-000000000003', NOW() - INTERVAL '1 day',    'atendida',   'Manicure'),
  ('f0000501-0000-0000-0000-000000000001', 'f0000500-0000-0000-0000-000000000001', NOW() - INTERVAL '4 days',   'atendida',   'Coloração — Retoque')
ON CONFLICT DO NOTHING;

-- Verificação
SELECT 'Perfil ativo:'   AS info, name          FROM profiles WHERE is_active = true;
SELECT 'Profissionais:'  AS info, COUNT(*)::text FROM doctors;
SELECT 'Clientes mock:'  AS info, COUNT(*)::text FROM patients WHERE id::text LIKE 'f000%';
SELECT 'Atendimentos:'   AS info, status, COUNT(*) FROM appointments GROUP BY status ORDER BY status;
