-- Rastreia quando o lembrete de 24h foi enviado para evitar duplicatas
ALTER TABLE appointments ADD COLUMN IF NOT EXISTS reminder_sent_at timestamptz;
