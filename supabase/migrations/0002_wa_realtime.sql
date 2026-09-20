-- Adiciona nome do contato WhatsApp à sessão
ALTER TABLE wa_sessions ADD COLUMN IF NOT EXISTS name text;

-- Habilita Realtime para as tabelas de WhatsApp
ALTER PUBLICATION supabase_realtime ADD TABLE wa_sessions;
ALTER PUBLICATION supabase_realtime ADD TABLE wa_messages;
