-- ============================================================
-- Seed de dados para testes — execute no SQL Editor do Supabase
-- ============================================================

-- 1. Apagar histórico dos appointments não-fixture (FK constraint)
DELETE FROM appointment_history
WHERE appointment_id::text NOT LIKE 'cccccccc-0000-0000-0000-%';

-- 2. Limpar appointments criados manualmente (mantém fixtures cccccccc-*)
DELETE FROM appointments
WHERE id::text NOT LIKE 'cccccccc-0000-0000-0000-%';

-- 3. Appointment para teste do lembrete 24h
--    Paciente com sessão WhatsApp ativa (session 39655f87)
INSERT INTO appointments (patient_id, doctor_id, scheduled_at, status, reminder_sent_at)
SELECT
  p.id,
  '11111111-0000-0000-0000-000000000001',   -- Dr. Cardoso
  NOW() + INTERVAL '24 hours',
  'agendada',
  NULL
FROM wa_sessions s
JOIN patients p ON p.id = s.patient_id
WHERE s.id = '39655f87-28e8-4b8d-9a17-c46b33133c7d'
  AND s.patient_id IS NOT NULL
LIMIT 1;

-- 4. Consulta futura +48h
INSERT INTO appointments (patient_id, doctor_id, scheduled_at, status)
SELECT p.id, '11111111-0000-0000-0000-000000000002', NOW() + INTERVAL '48 hours', 'agendada'
FROM wa_sessions s JOIN patients p ON p.id = s.patient_id
WHERE s.id = 'd3d2c55a-a413-4ce6-b859-ddcb8e3120ca' AND s.patient_id IS NOT NULL LIMIT 1;

-- 5. Consulta futura +72h
INSERT INTO appointments (patient_id, doctor_id, scheduled_at, status)
SELECT p.id, '11111111-0000-0000-0000-000000000003', NOW() + INTERVAL '72 hours', 'agendada'
FROM wa_sessions s JOIN patients p ON p.id = s.patient_id
WHERE s.id = '63588c9f-b81d-4d45-9039-34f775963623' AND s.patient_id IS NOT NULL LIMIT 1;

-- 6. Histórico passado (atendida)
INSERT INTO appointments (patient_id, doctor_id, scheduled_at, status, reminder_sent_at)
SELECT p.id, '11111111-0000-0000-0000-000000000001', NOW() - INTERVAL '7 days', 'atendida', NOW() - INTERVAL '8 days'
FROM wa_sessions s JOIN patients p ON p.id = s.patient_id
WHERE s.id = '39655f87-28e8-4b8d-9a17-c46b33133c7d' AND s.patient_id IS NOT NULL LIMIT 1;

-- 7. Linkar sessões órfãs ao paciente correspondente
UPDATE wa_sessions s
SET patient_id = p.id
FROM patients p
WHERE s.phone = p.phone
  AND s.patient_id IS NULL
  AND p.phone IS NOT NULL;

-- ============================================================
-- Verificação
SELECT status, COUNT(*) FROM appointments GROUP BY status ORDER BY status;
