-- Habilita RLS em appointment_history (estava ausente, expondo a tabela via PostgREST)
ALTER TABLE public.appointment_history ENABLE ROW LEVEL SECURITY;

-- Usuários autenticados (painel) têm acesso total; anon é bloqueado por padrão
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename  = 'appointment_history'
      AND policyname = 'authenticated_full_access'
  ) THEN
    CREATE POLICY "authenticated_full_access" ON public.appointment_history
      FOR ALL TO authenticated USING (true) WITH CHECK (true);
  END IF;
END $$;
