-- Adiciona campo de profissionais ao perfil e business_name ao vocabulário
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS professionals jsonb NOT NULL DEFAULT '[]';

-- Atualiza seeds com profissionais exemplo e business_name no vocabulary
UPDATE profiles SET
  professionals = '[
    {"name":"Dr. Carlos Mendes","specialty":"Clínico Geral"},
    {"name":"Dra. Ana Souza","specialty":"Cardiologia"},
    {"name":"Dr. Fábio Lima","specialty":"Dermatologia"},
    {"name":"Dra. Juliana Costa","specialty":"Pediatria"}
  ]',
  vocabulary = vocabulary || '{"business_name":""}'
WHERE domain_type = 'clinica';

UPDATE profiles SET
  professionals = '[
    {"name":"Dr. Marcos Alves","specialty":"Ortodontia e Clínico Geral"},
    {"name":"Dra. Patrícia Rocha","specialty":"Implantodontia e Estética"}
  ]',
  vocabulary = vocabulary || '{"business_name":""}'
WHERE domain_type = 'odontologia';

UPDATE profiles SET
  professionals = '[
    {"name":"Dr. Bruno Ferreira","specialty":"Clínico Geral e Cirurgião"},
    {"name":"Dra. Camila Nunes","specialty":"Dermatologia Veterinária"}
  ]',
  vocabulary = vocabulary || '{"business_name":""}'
WHERE domain_type = 'veterinaria';

UPDATE profiles SET
  professionals = '[
    {"name":"João Andrade","specialty":"Personal Trainer e Musculação"},
    {"name":"Fernanda Lopes","specialty":"Pilates e Funcional"}
  ]',
  vocabulary = vocabulary || '{"business_name":""}'
WHERE domain_type = 'personal';

UPDATE profiles SET
  professionals = '[
    {"name":"Carla Vieira","specialty":"Coloração e Tratamento"},
    {"name":"Roberta Melo","specialty":"Corte e Penteado"}
  ]',
  vocabulary = vocabulary || '{"business_name":""}'
WHERE domain_type = 'salao';

UPDATE profiles SET
  professionals = '[
    {"name":"Rafael Moura","specialty":"Corte e Barba"},
    {"name":"Diego Santos","specialty":"Pigmentação e Acabamento"}
  ]',
  vocabulary = vocabulary || '{"business_name":""}'
WHERE domain_type = 'barbearia';
