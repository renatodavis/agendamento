-- ============================================================
-- RESET: Remove todos os dados de teste e volta para
--        Clínica Médica com dados iniciais
-- ============================================================

-- Limpa agendamentos de teste (por paciente e por médico de outros perfis)
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
DELETE FROM approval_requests
WHERE doctor_id::text LIKE 'f000%'
   OR doctor_id::text LIKE '11111111%';

-- Limpa pacientes/clientes de teste
DELETE FROM wa_sessions WHERE phone LIKE '+5511000%';
DELETE FROM patients WHERE id::text LIKE 'f000%';

-- Remove médicos de outros perfis e restaura os originais da clínica
DELETE FROM doctors WHERE id::text LIKE 'f000%' OR id::text LIKE '11111111%';
INSERT INTO doctors (id, name, specialty, crm) VALUES
  ('11111111-0000-0000-0000-000000000001', 'Dr. Cardoso',   'Clínica Geral', 'CRM-SP 12345'),
  ('11111111-0000-0000-0000-000000000002', 'Dra. Lima',     'Cardiologia',   'CRM-SP 23456'),
  ('11111111-0000-0000-0000-000000000003', 'Dr. Fernandes', 'Dermatologia',  'CRM-SP 34567'),
  ('11111111-0000-0000-0000-000000000004', 'Dra. Costa',    'Ortopedia',     'CRM-SP 45678'),
  ('11111111-0000-0000-0000-000000000005', 'Dr. Alves',     'Pediatria',     'CRM-SP 56789'),
  ('11111111-0000-0000-0000-000000000006', 'Dr. Santos',    'Neurologia',    'CRM-SP 67890')
ON CONFLICT (id) DO NOTHING;

-- Volta perfil clínica médica como ativo
UPDATE profiles SET is_active = false;
UPDATE profiles SET is_active = true WHERE domain_type = 'clinica';

-- Restaura clinic_config original
UPDATE clinic_config SET value = '"Clínica São Lucas"'                    WHERE key = 'clinic_name';
UPDATE clinic_config SET value = '"Segunda a Sexta, 8h às 18h"'          WHERE key = 'working_hours';
UPDATE clinic_config SET value = '[
  {"name": "Clínico Geral",  "description": "Consultas gerais, check-up, atestados"},
  {"name": "Cardiologia",    "description": "Coração e sistema cardiovascular"},
  {"name": "Dermatologia",   "description": "Pele, cabelo e unhas"},
  {"name": "Pediatria",      "description": "Crianças e adolescentes"},
  {"name": "Ortopedia",      "description": "Ossos, articulações e coluna"},
  {"name": "Neurologia",     "description": "Sistema nervoso e cérebro"}
]'                                                                         WHERE key = 'services';

-- Verificação
SELECT 'Perfil ativo:'         AS info, name          FROM profiles WHERE is_active = true;
SELECT 'Médicos restaurados:'  AS info, COUNT(*)::text FROM doctors;
SELECT 'Agendamentos restantes:'AS info, COUNT(*)::text FROM appointments;
