-- ============================================================
-- MOCK: Academia / Personal Trainer
-- ============================================================

-- 1. Ativa o perfil
UPDATE profiles SET is_active = false;
UPDATE profiles SET is_active = true WHERE domain_type = 'personal';

-- 2. Atualiza clinic_config
INSERT INTO clinic_config (key, value) VALUES
  ('clinic_name',   '"FitLife Academia"'),
  ('working_hours', '"Segunda a Sexta, 6h às 22h — Sábado, 7h às 18h — Domingo, 8h às 14h"'),
  ('services', '[
    {"name": "Personal Training",        "description": "Treino personalizado individual"},
    {"name": "Pilates",                  "description": "Condicionamento e flexibilidade"},
    {"name": "Treino Funcional",         "description": "Exercícios funcionais"},
    {"name": "Avaliação Física",         "description": "Composição corporal e performance"},
    {"name": "Cardio e Emagrecimento",   "description": "Queima de gordura e resistência"},
    {"name": "Personal Training — Força","description": "Musculação e hipertrofia"}
  ]')
ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value;

-- 3. Limpa dados de teste anteriores
DELETE FROM appointment_history WHERE appointment_id IN (
  SELECT id FROM appointments WHERE patient_id::text LIKE 'f000%'
);
DELETE FROM appointments WHERE patient_id::text LIKE 'f000%';
DELETE FROM wa_sessions  WHERE phone LIKE '+5511000%';
DELETE FROM patients     WHERE id::text LIKE 'f000%';
-- Remove todos os médicos (seed + outros perfis) e insere apenas personal trainers
DELETE FROM doctors WHERE id::text LIKE 'f000%' OR id::text LIKE '11111111%';

-- 4. Personal trainers — UUID: f0000400-0000-0000-0000-00000000000N
INSERT INTO doctors (id, name, specialty, crm) VALUES
  ('f0000400-0000-0000-0000-000000000001', 'João Andrade',    'Musculação e Hipertrofia', 'CREF-SP 40001'),
  ('f0000400-0000-0000-0000-000000000002', 'Fernanda Lopes',  'Pilates e Funcional',      'CREF-SP 40002'),
  ('f0000400-0000-0000-0000-000000000003', 'Gustavo Ribeiro', 'Cardio e Emagrecimento',   'CREF-SP 40003')
ON CONFLICT (id) DO NOTHING;

-- 5. Alunos — UUID: f0000401-0000-0000-0000-00000000000N
INSERT INTO patients (id, name, phone, convenio, photo_emoji, lgpd_consent_at) VALUES
  ('f0000401-0000-0000-0000-000000000001', 'Marina Azevedo', '+5511000040001', 'Plano Mensal',     '👩',   now()),
  ('f0000401-0000-0000-0000-000000000002', 'Rafael Cunha',   '+5511000040002', 'Plano Trimestral', '👨',   now()),
  ('f0000401-0000-0000-0000-000000000003', 'Sophia Lima',    '+5511000040003', 'Plano Anual',      '👩‍🦱', now()),
  ('f0000401-0000-0000-0000-000000000004', 'Diego Santos',   '+5511000040004', 'Avulso',           '👦',   now()),
  ('f0000401-0000-0000-0000-000000000005', 'Tatiana Moura',  '+5511000040005', 'Plano Mensal',     '👩‍🦳', now()),
  ('f0000401-0000-0000-0000-000000000006', 'Felipe Borges',  '+5511000040006', 'Plano Trimestral', '👴',   now())
ON CONFLICT (id) DO NOTHING;

-- 6. Sessões de treino mock
INSERT INTO appointments (patient_id, doctor_id, scheduled_at, status, type) VALUES
  ('f0000401-0000-0000-0000-000000000001', 'f0000400-0000-0000-0000-000000000001', NOW() + INTERVAL '1 hour',   'confirmada', 'Personal Training — Musculação'),
  ('f0000401-0000-0000-0000-000000000002', 'f0000400-0000-0000-0000-000000000002', NOW() + INTERVAL '5 hours',  'agendada',   'Sessão de Pilates'),
  ('f0000401-0000-0000-0000-000000000003', 'f0000400-0000-0000-0000-000000000002', NOW() + INTERVAL '22 hours', 'agendada',   'Treino Funcional'),
  ('f0000401-0000-0000-0000-000000000004', 'f0000400-0000-0000-0000-000000000003', NOW() + INTERVAL '29 hours', 'agendada',   'Sessão Cardio e Emagrecimento'),
  ('f0000401-0000-0000-0000-000000000005', 'f0000400-0000-0000-0000-000000000001', NOW() + INTERVAL '2 days',   'agendada',   'Avaliação Física'),
  ('f0000401-0000-0000-0000-000000000006', 'f0000400-0000-0000-0000-000000000001', NOW() + INTERVAL '3 days',   'agendada',   'Personal Training — Força'),
  ('f0000401-0000-0000-0000-000000000001', 'f0000400-0000-0000-0000-000000000001', NOW() - INTERVAL '1 day',    'atendida',   'Personal Training — Musculação'),
  ('f0000401-0000-0000-0000-000000000002', 'f0000400-0000-0000-0000-000000000002', NOW() - INTERVAL '2 days',   'atendida',   'Sessão de Pilates'),
  ('f0000401-0000-0000-0000-000000000003', 'f0000400-0000-0000-0000-000000000003', NOW() + INTERVAL '8 days',   'cancelada',  'Sessão Cardio')
ON CONFLICT DO NOTHING;

-- Verificação
SELECT 'Perfil ativo:'      AS info, name          FROM profiles WHERE is_active = true;
SELECT 'Personal trainers:' AS info, COUNT(*)::text FROM doctors;
SELECT 'Alunos mock:'       AS info, COUNT(*)::text FROM patients WHERE id::text LIKE 'f000%';
SELECT 'Sessões:'           AS info, status, COUNT(*) FROM appointments GROUP BY status ORDER BY status;
