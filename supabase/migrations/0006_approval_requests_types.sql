-- Extend approval_requests to support multiple request types
ALTER TABLE approval_requests
  ADD COLUMN IF NOT EXISTS request_type text NOT NULL DEFAULT 'disponibilidade'
    CHECK (request_type IN ('disponibilidade','cancelamento','atendente','alteracao_horario')),
  ADD COLUMN IF NOT EXISTS details jsonb,
  ADD COLUMN IF NOT EXISTS message_to_receptionist text;

-- Make suggested_at nullable (non-scheduling requests don't have a slot)
ALTER TABLE approval_requests
  ALTER COLUMN suggested_at DROP NOT NULL;

-- Make message_to_patient nullable (some requests don't pre-fill patient message)
ALTER TABLE approval_requests
  ALTER COLUMN message_to_patient DROP NOT NULL;

-- Extend status to include 'resolved' (for atendente/alteracao) and 'attended'
ALTER TABLE approval_requests
  DROP CONSTRAINT IF EXISTS approval_requests_status_check;
ALTER TABLE approval_requests
  ADD CONSTRAINT approval_requests_status_check
  CHECK (status IN ('pending','approved','confirmed','rejected','resolved'));

-- Index for dashboard query (pending by type)
CREATE INDEX IF NOT EXISTS idx_approval_requests_status_type
  ON approval_requests(status, request_type, created_at);
