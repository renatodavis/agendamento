-- ============================================================
-- MOCK: Barbearia
-- Ativa o perfil e carrega dados de atendimentos da barbearia
-- ============================================================

-- 1. Ativa o perfil
UPDATE profiles SET is_active = false;
UPDATE profiles SET is_active = true WHERE domain_type = 'barbearia';

-- 2. Atualiza nome e horário
INSERT INTO clinic_config (key, value) VALUES
  ('clinic_name',   'Barbearia Kings Cut'),
  ('working_hours', 'Terça a Sábado, 9h às 20h — Domingo, 9h às 15h — Segunda fechado')
ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value;

-- 3. Limpa dados de teste anteriores
DELETE FROM appointment_history WHERE appointment_id IN (
  SELECT id FROM appointments WHERE patient_id::text LIKE 'mock%'
);
DELETE FROM appointments WHERE patient_id::text LIKE 'mock%';
DELETE FROM wa_sessions  WHERE phone LIKE '+5511000%';
DELETE FROM patients     WHERE id::text LIKE 'mock%';
DELETE FROM doctors      WHERE id::text LIKE 'mock%';

-- 4. Barbeiros (campo "crm" usado para registro livre/SENAC)
INSERT INTO doctors (id, name, specialty, crm) VALUES
  ('mock0600-0000-0000-0000-000000000001', 'Eduardo Santos',  'Corte Masculino e Barba',    'BARBER-SP 60001'),
  ('mock0600-0000-0000-0000-000000000002', 'Vinícius Rocha',  'Degradê e Navalha',          'BARBER-SP 60002'),
  ('mock0600-0000-0000-0000-000000000003', 'Ricardo Mendes',  'Coloração e Tratamento',     'BARBER-SP 60003')
ON CONFLICT (id) DO NOTHING;

-- 5. Clientes
INSERT INTO patients (id, name, phone, convenio, photo_emoji, lgpd_consent_at) VALUES
  ('mock0601-0000-0000-0000-000000000001', 'Bruno Carvalho',    '+5511000060001', 'Avulso',          '👨',   now()),
  ('mock0601-0000-0000-0000-000000000002', 'Mateus Oliveira',   '+5511000060002', 'Plano Mensal',    '👦',   now()),
  ('mock0601-0000-0000-0000-000000000003', 'André Lima',        '+5511000060003', 'Avulso',          '👴',   now()),
  ('mock0601-0000-0000-0000-000000000004', 'Lucas Ferreira',    '+5511000060004', 'Plano Mensal',    '👨‍🦱', now()),
  ('mock0601-0000-0000-0000-000000000005', 'Gabriel Alves',     '+5511000060005', 'Avulso',          '👶',   now()),
  ('mock0601-0000-0000-0000-000000000006', 'Rodrigo Monteiro',  '+5511000060006', 'Plano Mensal',    '👨‍🦳', now())
ON CONFLICT (id) DO NOTHING;

-- 6. Atendimentos mock
INSERT INTO appointments (patient_id, doctor_id, scheduled_at, status, type) VALUES
  -- Hoje +1h (corte + barba)
  ('mock0601-0000-0000-0000-000000000001', 'mock0600-0000-0000-0000-000000000001', NOW() + INTERVAL '1 hour',   'confirmada', 'Corte + Barba'),
  -- Hoje +2h (só corte)
  ('mock0601-0000-0000-0000-000000000002', 'mock0600-0000-0000-0000-000000000002', NOW() + INTERVAL '2 hours',  'agendada',   'Corte Degradê'),
  -- Hoje +4h (barba na navalha)
  ('mock0601-0000-0000-0000-000000000003', 'mock0600-0000-0000-0000-000000000001', NOW() + INTERVAL '4 hours',  'agendada',   'Barba na Navalha'),
  -- Amanhã (corte infantil)
  ('mock0601-0000-0000-0000-000000000005', 'mock0600-0000-0000-0000-000000000002', NOW() + INTERVAL '25 hours', 'agendada',   'Corte Infantil'),
  -- +2 dias (hidratação capilar)
  ('mock0601-0000-0000-0000-000000000004', 'mock0600-0000-0000-0000-000000000003', NOW() + INTERVAL '2 days',   'agendada',   'Hidratação Capilar Masculina'),
  -- +3 dias (corte + barba plano)
  ('mock0601-0000-0000-0000-000000000006', 'mock0600-0000-0000-0000-000000000001', NOW() + INTERVAL '3 days',   'agendada',   'Corte + Barba'),
  -- +5 dias (coloração)
  ('mock0601-0000-0000-0000-000000000004', 'mock0600-0000-0000-0000-000000000003', NOW() + INTERVAL '5 days',   'agendada',   'Coloração Masculina'),
  -- Ontem (atendido)
  ('mock0601-0000-0000-0000-000000000001', 'mock0600-0000-0000-0000-000000000001', NOW() - INTERVAL '1 day',    'atendida',   'Corte + Barba'),
  -- 3 dias atrás (atendido)
  ('mock0601-0000-0000-0000-000000000002', 'mock0600-0000-0000-0000-000000000002', NOW() - INTERVAL '3 days',   'atendida',   'Corte Degradê')
ON CONFLICT DO NOTHING;

-- Verificação
SELECT 'Perfil ativo:'    AS info, name        FROM profiles WHERE is_active = true;
SELECT 'Barbeiros:'       AS info, COUNT(*)::text FROM doctors WHERE id::text LIKE 'mock06%';
SELECT 'Clientes mock:'   AS info, COUNT(*)::text FROM patients WHERE id::text LIKE 'mock%';
SELECT 'Atendimentos:'    AS info, status, COUNT(*) FROM appointments GROUP BY status ORDER BY status;
