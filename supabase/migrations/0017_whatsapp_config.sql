-- Segredos de integração — inacessíveis ao client-side.
-- O service_role (createServerClient) bypassa RLS automaticamente.
-- Nenhuma política de SELECT para authenticated/anon: browser jamais lê diretamente.
CREATE TABLE IF NOT EXISTS clinic_secrets (
  key        TEXT PRIMARY KEY,
  value      TEXT NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE OR REPLACE FUNCTION update_clinic_secrets_ts()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN NEW.updated_at = NOW(); RETURN NEW; END;
$$;

CREATE TRIGGER trg_clinic_secrets_ts
  BEFORE UPDATE ON clinic_secrets
  FOR EACH ROW EXECUTE FUNCTION update_clinic_secrets_ts();

ALTER TABLE clinic_secrets ENABLE ROW LEVEL SECURITY;
-- Sem política de SELECT: qualquer tentativa direta do browser é bloqueada.
-- Escrita via API routes que validam sessão antes de chamar service_role.
