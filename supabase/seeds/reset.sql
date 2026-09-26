-- ============================================================
-- RESET: Remove todos os dados de teste e volta para
--        Clínica Médica com dados iniciais
-- ============================================================

-- Limpa agendamentos de teste (prefixo f000-*)
DELETE FROM appointment_history
WHERE appointment_id IN (
  SELECT id FROM appointments
  WHERE patient_id::text LIKE 'f000%'
);
DELETE FROM appointments WHERE patient_id::text LIKE 'f000%';

-- Limpa pacientes/clientes de teste
DELETE FROM wa_sessions WHERE phone LIKE '+5511000%';
DELETE FROM patients WHERE id::text LIKE 'f000%';

-- Limpa profissionais de teste (preserva seed inicial 11111111-*)
DELETE FROM doctors WHERE id::text LIKE 'f000%';

-- Volta perfil clínica médica como ativo
UPDATE profiles SET is_active = false;
UPDATE profiles SET is_active = true WHERE domain_type = 'clinica';

-- Restaura clinic_config original
UPDATE clinic_config SET value = '"Clínica São Lucas"'             WHERE key = 'clinic_name';
UPDATE clinic_config SET value = '"Segunda a Sexta, 8h às 18h"'   WHERE key = 'working_hours';

-- Verificação
SELECT 'Perfil ativo:' AS info, name FROM profiles WHERE is_active = true;
SELECT 'Agendamentos restantes:' AS info, COUNT(*)::text FROM appointments;
