-- Configuração dinâmica da clínica
CREATE TABLE IF NOT EXISTS clinic_config (
  id         UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  key        TEXT UNIQUE NOT NULL,
  value      JSONB NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Trigger para atualizar updated_at automaticamente
CREATE OR REPLACE FUNCTION update_clinic_config_ts()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN NEW.updated_at = NOW(); RETURN NEW; END;
$$;

CREATE TRIGGER trg_clinic_config_ts
  BEFORE UPDATE ON clinic_config
  FOR EACH ROW EXECUTE FUNCTION update_clinic_config_ts();

-- Seed: configurações iniciais
INSERT INTO clinic_config (key, value) VALUES
  ('clinic_name',   '"Clínica São Lucas"'),
  ('working_hours', '"Segunda a Sexta, das 8h às 18h"'),
  ('services', '[
    {"name": "Clínico Geral",  "description": "Consultas gerais, check-up, atestados"},
    {"name": "Cardiologia",    "description": "Doenças do coração e sistema cardiovascular"},
    {"name": "Dermatologia",   "description": "Pele, cabelo e unhas"},
    {"name": "Pediatria",      "description": "Atendimento infantil de 0 a 12 anos"},
    {"name": "Ginecologia",    "description": "Saúde da mulher, pré-natal, prevenção"},
    {"name": "Ortopedia",      "description": "Ossos, articulações, lesões musculares"}
  ]'),
  ('out_of_scope_response', '"Lamento, mas a especialidade solicitada não faz parte dos serviços da {clinic_name}. 🏥\n\nAtendemos as seguintes especialidades:\n{services_list}\n\nPosso ajudar com alguma delas? Será um prazer agendar a consulta para você!"')
ON CONFLICT (key) DO NOTHING;
