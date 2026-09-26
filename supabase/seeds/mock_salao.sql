-- ============================================================
-- MOCK: Salão de Beleza
-- Ativa o perfil e carrega dados de atendimentos do salão
-- ============================================================

-- 1. Ativa o perfil
UPDATE profiles SET is_active = false;
UPDATE profiles SET is_active = true WHERE domain_type = 'salao';

-- 2. Atualiza nome e horário
INSERT INTO clinic_config (key, value) VALUES
  ('clinic_name',   '"Salão Bella Arte"'),
  ('working_hours', '"Terça a Sábado, 9h às 19h — Segunda fechado"')
ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value;

-- 3. Limpa dados de teste anteriores
DELETE FROM appointment_history WHERE appointment_id IN (
  SELECT id FROM appointments WHERE patient_id::text LIKE 'mock%'
);
DELETE FROM appointments WHERE patient_id::text LIKE 'mock%';
DELETE FROM wa_sessions  WHERE phone LIKE '+5511000%';
DELETE FROM patients     WHERE id::text LIKE 'mock%';
DELETE FROM doctors      WHERE id::text LIKE 'mock%';

-- 4. Profissionais do salão (campo "crm" usado para registro SENAC/livre)
INSERT INTO doctors (id, name, specialty, crm) VALUES
  ('mock0500-0000-0000-0000-000000000001', 'Carla Vieira',    'Coloração e Tratamento',       'SALAO-SP 50001'),
  ('mock0500-0000-0000-0000-000000000002', 'Roberta Melo',    'Corte e Penteado',             'SALAO-SP 50002'),
  ('mock0500-0000-0000-0000-000000000003', 'Patrícia Duarte', 'Manicure e Pedicure',          'SALAO-SP 50003'),
  ('mock0500-0000-0000-0000-000000000004', 'Aline Teixeira',  'Sobrancelha e Micropigmentação','SALAO-SP 50004')
ON CONFLICT (id) DO NOTHING;

-- 5. Clientes
INSERT INTO patients (id, name, phone, convenio, photo_emoji, lgpd_consent_at) VALUES
  ('mock0501-0000-0000-0000-000000000001', 'Priscila Barros',  '+5511000050001', 'Particular',           '👩',   now()),
  ('mock0501-0000-0000-0000-000000000002', 'Sandra Oliveira',  '+5511000050002', 'Cartão de Benefícios', '👩‍🦱', now()),
  ('mock0501-0000-0000-0000-000000000003', 'Claudia Ramos',    '+5511000050003', 'Particular',           '👩‍🦳', now()),
  ('mock0501-0000-0000-0000-000000000004', 'Ana Paula Ferreira','+5511000050004','Particular',           '👧',   now()),
  ('mock0501-0000-0000-0000-000000000005', 'Letícia Costa',    '+5511000050005', 'Cartão de Benefícios', '👩',   now()),
  ('mock0501-0000-0000-0000-000000000006', 'Renata Almeida',   '+5511000050006', 'Particular',           '👩‍🦰', now())
ON CONFLICT (id) DO NOTHING;

-- 6. Atendimentos mock
INSERT INTO appointments (patient_id, doctor_id, scheduled_at, status, type) VALUES
  -- Hoje +1h (coloração)
  ('mock0501-0000-0000-0000-000000000001', 'mock0500-0000-0000-0000-000000000001', NOW() + INTERVAL '1 hour',   'confirmada', 'Coloração — Mechas'),
  -- Hoje +3h (corte)
  ('mock0501-0000-0000-0000-000000000002', 'mock0500-0000-0000-0000-000000000002', NOW() + INTERVAL '3 hours',  'agendada',   'Corte Feminino'),
  -- Hoje +5h (manicure)
  ('mock0501-0000-0000-0000-000000000003', 'mock0500-0000-0000-0000-000000000003', NOW() + INTERVAL '5 hours',  'agendada',   'Manicure e Pedicure'),
  -- Amanhã (hidratação)
  ('mock0501-0000-0000-0000-000000000004', 'mock0500-0000-0000-0000-000000000001', NOW() + INTERVAL '24 hours', 'agendada',   'Hidratação Capilar'),
  -- +2 dias (progressiva)
  ('mock0501-0000-0000-0000-000000000005', 'mock0500-0000-0000-0000-000000000002', NOW() + INTERVAL '2 days',   'agendada',   'Escova Progressiva'),
  -- +3 dias (design sobrancelha)
  ('mock0501-0000-0000-0000-000000000006', 'mock0500-0000-0000-0000-000000000004', NOW() + INTERVAL '3 days',   'agendada',   'Design de Sobrancelha'),
  -- +5 dias (penteado evento)
  ('mock0501-0000-0000-0000-000000000001', 'mock0500-0000-0000-0000-000000000002', NOW() + INTERVAL '5 days',   'agendada',   'Penteado para Evento'),
  -- Ontem (atendida)
  ('mock0501-0000-0000-0000-000000000002', 'mock0500-0000-0000-0000-000000000003', NOW() - INTERVAL '1 day',    'atendida',   'Manicure'),
  -- 4 dias atrás (atendida)
  ('mock0501-0000-0000-0000-000000000001', 'mock0500-0000-0000-0000-000000000001', NOW() - INTERVAL '4 days',   'atendida',   'Coloração — Retoque')
ON CONFLICT DO NOTHING;

-- Verificação
SELECT 'Perfil ativo:'      AS info, name        FROM profiles WHERE is_active = true;
SELECT 'Profissionais:'     AS info, COUNT(*)::text FROM doctors WHERE id::text LIKE 'mock05%';
SELECT 'Clientes mock:'     AS info, COUNT(*)::text FROM patients WHERE id::text LIKE 'mock%';
SELECT 'Atendimentos:'      AS info, status, COUNT(*) FROM appointments GROUP BY status ORDER BY status;
