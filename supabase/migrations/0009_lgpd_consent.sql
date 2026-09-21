-- S12: Campo de consentimento LGPD na sessão WhatsApp
-- Registra quando o paciente aceitou a política de privacidade (LGPD Art.11)
ALTER TABLE wa_sessions ADD COLUMN IF NOT EXISTS lgpd_consent_at timestamptz;
