-- ============================================================
-- MOCK: Barbearia
-- ============================================================

-- 1. Ativa o perfil
UPDATE profiles SET is_active = false;
UPDATE profiles SET is_active = true WHERE domain_type = 'barbearia';

-- 2. Atualiza clinic_config
INSERT INTO clinic_config (key, value) VALUES
  ('clinic_name',   '"Barbearia Kings Cut"'),
  ('working_hours', '"Terça a Sábado, 9h às 20h — Domingo, 9h às 15h — Segunda fechado"'),
  ('services', '[
    {"name": "Corte Masculino",     "description": "Corte e estilo"},
    {"name": "Barba",               "description": "Aparação e design de barba"},
    {"name": "Corte + Barba",       "description": "Combo completo"},
    {"name": "Degradê",             "description": "Corte progressivo e fade"},
    {"name": "Coloração Masculina", "description": "Coloração e retoques"},
    {"name": "Hidratação Capilar",  "description": "Nutrição e recuperação dos fios"}
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
-- Remove todos os médicos (seed + outros perfis) e insere apenas barbeiros
DELETE FROM doctors WHERE id::text LIKE 'f000%' OR id::text LIKE '11111111%';

-- 5. Barbeiros — UUID: f0000600-0000-0000-0000-00000000000N
INSERT INTO doctors (id, name, specialty, crm) VALUES
  ('f0000600-0000-0000-0000-000000000001', 'Eduardo Santos', 'Corte Masculino e Barba', 'BARBER-SP 60001'),
  ('f0000600-0000-0000-0000-000000000002', 'Vinícius Rocha', 'Degradê e Navalha',       'BARBER-SP 60002'),
  ('f0000600-0000-0000-0000-000000000003', 'Ricardo Mendes', 'Coloração e Tratamento',  'BARBER-SP 60003')
ON CONFLICT (id) DO NOTHING;

-- 6. Clientes — UUID: f0000601-0000-0000-0000-00000000000N
INSERT INTO patients (id, name, phone, convenio, photo_emoji, lgpd_consent_at) VALUES
  ('f0000601-0000-0000-0000-000000000001', 'Bruno Carvalho',   '+5511000060001', 'Avulso',       '👨',   now()),
  ('f0000601-0000-0000-0000-000000000002', 'Mateus Oliveira',  '+5511000060002', 'Plano Mensal', '👦',   now()),
  ('f0000601-0000-0000-0000-000000000003', 'André Lima',       '+5511000060003', 'Avulso',       '👴',   now()),
  ('f0000601-0000-0000-0000-000000000004', 'Lucas Ferreira',   '+5511000060004', 'Plano Mensal', '👨‍🦱', now()),
  ('f0000601-0000-0000-0000-000000000005', 'Gabriel Alves',    '+5511000060005', 'Avulso',       '👶',   now()),
  ('f0000601-0000-0000-0000-000000000006', 'Rodrigo Monteiro', '+5511000060006', 'Plano Mensal', '👨‍🦳', now())
ON CONFLICT (id) DO NOTHING;

-- 7. Atendimentos mock
INSERT INTO appointments (patient_id, doctor_id, scheduled_at, status, type) VALUES
  ('f0000601-0000-0000-0000-000000000001', 'f0000600-0000-0000-0000-000000000001', NOW() + INTERVAL '1 hour',   'confirmada', 'Corte + Barba'),
  ('f0000601-0000-0000-0000-000000000002', 'f0000600-0000-0000-0000-000000000002', NOW() + INTERVAL '2 hours',  'agendada',   'Corte Degradê'),
  ('f0000601-0000-0000-0000-000000000003', 'f0000600-0000-0000-0000-000000000001', NOW() + INTERVAL '4 hours',  'agendada',   'Barba na Navalha'),
  ('f0000601-0000-0000-0000-000000000005', 'f0000600-0000-0000-0000-000000000002', NOW() + INTERVAL '25 hours', 'agendada',   'Corte Infantil'),
  ('f0000601-0000-0000-0000-000000000004', 'f0000600-0000-0000-0000-000000000003', NOW() + INTERVAL '2 days',   'agendada',   'Hidratação Capilar Masculina'),
  ('f0000601-0000-0000-0000-000000000006', 'f0000600-0000-0000-0000-000000000001', NOW() + INTERVAL '3 days',   'agendada',   'Corte + Barba'),
  ('f0000601-0000-0000-0000-000000000004', 'f0000600-0000-0000-0000-000000000003', NOW() + INTERVAL '5 days',   'agendada',   'Coloração Masculina'),
  ('f0000601-0000-0000-0000-000000000001', 'f0000600-0000-0000-0000-000000000001', NOW() - INTERVAL '1 day',    'atendida',   'Corte + Barba'),
  ('f0000601-0000-0000-0000-000000000002', 'f0000600-0000-0000-0000-000000000002', NOW() - INTERVAL '3 days',   'atendida',   'Corte Degradê')
ON CONFLICT DO NOTHING;

-- Verificação
SELECT 'Perfil ativo:'  AS info, name          FROM profiles WHERE is_active = true;
SELECT 'Barbeiros:'     AS info, COUNT(*)::text FROM doctors;
SELECT 'Clientes mock:' AS info, COUNT(*)::text FROM patients WHERE id::text LIKE 'f000%';
SELECT 'Atendimentos:'  AS info, status, COUNT(*) FROM appointments GROUP BY status ORDER BY status;
