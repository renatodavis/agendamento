-- ============================================================
-- MOCK: Odontologia
-- Ativa o perfil e carrega dados de consultas odontológicas
-- ============================================================

-- 1. Ativa o perfil
UPDATE profiles SET is_active = false;
UPDATE profiles SET is_active = true WHERE domain_type = 'odontologia';

-- 2. Atualiza nome e horário
INSERT INTO clinic_config (key, value) VALUES
  ('clinic_name',   'OdontoClin'),
  ('working_hours', 'Segunda a Sexta, 8h às 19h — Sábado, 8h às 14h')
ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value;

-- 3. Limpa dados de teste anteriores
DELETE FROM appointment_history WHERE appointment_id IN (
  SELECT id FROM appointments WHERE patient_id::text LIKE 'mock%'
);
DELETE FROM appointments WHERE patient_id::text LIKE 'mock%';
DELETE FROM wa_sessions  WHERE phone LIKE '+5511000%';
DELETE FROM patients     WHERE id::text LIKE 'mock%';
DELETE FROM doctors      WHERE id::text LIKE 'mock%';

-- 4. Dentistas (tabela doctors — campo "crm" usado para CRO aqui)
INSERT INTO doctors (id, name, specialty, crm) VALUES
  ('mock0200-0000-0000-0000-000000000001', 'Dr. Marcos Alves',    'Ortodontia',        'CRO-SP 10001'),
  ('mock0200-0000-0000-0000-000000000002', 'Dra. Patrícia Rocha', 'Implantodontia',    'CRO-SP 10002'),
  ('mock0200-0000-0000-0000-000000000003', 'Dr. Eduardo Braga',   'Endodontia',        'CRO-SP 10003'),
  ('mock0200-0000-0000-0000-000000000004', 'Dra. Renata Melo',    'Estética Dental',   'CRO-SP 10004')
ON CONFLICT (id) DO NOTHING;

-- 5. Pacientes / clientes
INSERT INTO patients (id, name, phone, convenio, photo_emoji, lgpd_consent_at) VALUES
  ('mock0201-0000-0000-0000-000000000001', 'Thiago Pires',    '+5511000020001', 'Odontoprev',     '👨',   now()),
  ('mock0201-0000-0000-0000-000000000002', 'Amanda Torres',   '+5511000020002', 'Amil Dental',    '👩',   now()),
  ('mock0201-0000-0000-0000-000000000003', 'Lucas Gomes',     '+5511000020003', 'Particular',     '👦',   now()),
  ('mock0201-0000-0000-0000-000000000004', 'Isabela Castro',  '+5511000020004', 'Bradesco Dental','👩‍🦱', now()),
  ('mock0201-0000-0000-0000-000000000005', 'Roberto Faria',   '+5511000020005', 'Particular',     '👴',   now())
ON CONFLICT (id) DO NOTHING;

-- 6. Agendamentos mock
INSERT INTO appointments (patient_id, doctor_id, scheduled_at, status, type) VALUES
  -- Hoje +3h (agendada — limpeza)
  ('mock0201-0000-0000-0000-000000000001', 'mock0200-0000-0000-0000-000000000001', NOW() + INTERVAL '3 hours',  'agendada',   'Consulta Odontológica'),
  -- Amanhã (confirmada — canal)
  ('mock0201-0000-0000-0000-000000000002', 'mock0200-0000-0000-0000-000000000003', NOW() + INTERVAL '25 hours', 'confirmada', 'Tratamento de Canal'),
  -- +2 dias (aparelho)
  ('mock0201-0000-0000-0000-000000000003', 'mock0200-0000-0000-0000-000000000001', NOW() + INTERVAL '2 days',   'agendada',   'Manutenção de Aparelho'),
  -- +4 dias (implante)
  ('mock0201-0000-0000-0000-000000000004', 'mock0200-0000-0000-0000-000000000002', NOW() + INTERVAL '4 days',   'agendada',   'Avaliação para Implante'),
  -- +7 dias (clareamento)
  ('mock0201-0000-0000-0000-000000000005', 'mock0200-0000-0000-0000-000000000004', NOW() + INTERVAL '7 days',   'agendada',   'Clareamento Dental'),
  -- Ontem (atendida)
  ('mock0201-0000-0000-0000-000000000001', 'mock0200-0000-0000-0000-000000000004', NOW() - INTERVAL '1 day',    'atendida',   'Consulta Odontológica'),
  -- Semana passada (atendida)
  ('mock0201-0000-0000-0000-000000000002', 'mock0200-0000-0000-0000-000000000002', NOW() - INTERVAL '5 days',   'atendida',   'Avaliação de Implante')
ON CONFLICT DO NOTHING;

-- Verificação
SELECT 'Perfil ativo:'   AS info, name       FROM profiles     WHERE is_active = true;
SELECT 'Dentistas:'      AS info, COUNT(*)::text FROM doctors WHERE id::text LIKE 'mock02%';
SELECT 'Pacientes mock:' AS info, COUNT(*)::text FROM patients WHERE id::text LIKE 'mock%';
SELECT 'Agendamentos:'   AS info, status, COUNT(*) FROM appointments GROUP BY status ORDER BY status;
