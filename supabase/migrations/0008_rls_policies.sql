-- S10: Row Level Security — bloqueia acesso anônimo direto ao banco
-- Service role (usado pelas API routes) contorna RLS automaticamente no Supabase.
-- Usuários autenticados (recepcionistas logados) têm acesso total via política abaixo.

-- Habilitar RLS em todas as tabelas
ALTER TABLE patients              ENABLE ROW LEVEL SECURITY;
ALTER TABLE doctors               ENABLE ROW LEVEL SECURITY;
ALTER TABLE appointments          ENABLE ROW LEVEL SECURITY;
ALTER TABLE doctor_schedules      ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_log             ENABLE ROW LEVEL SECURITY;
ALTER TABLE wa_sessions           ENABLE ROW LEVEL SECURITY;
ALTER TABLE wa_messages           ENABLE ROW LEVEL SECURITY;
ALTER TABLE approval_requests     ENABLE ROW LEVEL SECURITY;
ALTER TABLE clinic_config         ENABLE ROW LEVEL SECURITY;
ALTER TABLE appointment_history   ENABLE ROW LEVEL SECURITY;

-- Políticas: usuários autenticados (recepcionistas) têm acesso total
CREATE POLICY "authenticated_full_access" ON patients
  FOR ALL TO authenticated USING (true) WITH CHECK (true);

CREATE POLICY "authenticated_full_access" ON doctors
  FOR ALL TO authenticated USING (true) WITH CHECK (true);

CREATE POLICY "authenticated_full_access" ON appointments
  FOR ALL TO authenticated USING (true) WITH CHECK (true);

CREATE POLICY "authenticated_full_access" ON doctor_schedules
  FOR ALL TO authenticated USING (true) WITH CHECK (true);

CREATE POLICY "authenticated_full_access" ON audit_log
  FOR ALL TO authenticated USING (true) WITH CHECK (true);

CREATE POLICY "authenticated_full_access" ON wa_sessions
  FOR ALL TO authenticated USING (true) WITH CHECK (true);

CREATE POLICY "authenticated_full_access" ON wa_messages
  FOR ALL TO authenticated USING (true) WITH CHECK (true);

CREATE POLICY "authenticated_full_access" ON approval_requests
  FOR ALL TO authenticated USING (true) WITH CHECK (true);

CREATE POLICY "authenticated_full_access" ON clinic_config
  FOR ALL TO authenticated USING (true) WITH CHECK (true);

CREATE POLICY "authenticated_full_access" ON appointment_history
  FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- Nota: não há políticas para anon — acesso negado por padrão (RLS ativo sem política = bloqueado).
-- Nota: realtime subscriptions usarão a sessão autenticada do usuário logado.
