-- Add reagendamento_forcado to approval_requests.request_type
ALTER TABLE approval_requests
  DROP CONSTRAINT IF EXISTS approval_requests_request_type_check;
ALTER TABLE approval_requests
  ADD CONSTRAINT approval_requests_request_type_check
  CHECK (request_type IN (
    'disponibilidade',
    'cancelamento',
    'atendente',
    'alteracao_horario',
    'reagendamento_forcado'
  ));
