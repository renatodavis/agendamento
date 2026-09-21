-- ═══════════════════════════════════════════════════════════════════
-- Migration 0007 — Security hardening
-- DB1: enum lista_espera | DB2: audit_log actor_type | S7: wamid dedup
-- ═══════════════════════════════════════════════════════════════════

-- ── DB1: Adiciona 'lista_espera' ao enum appointment_status ──────────
-- ALTER TYPE ... ADD VALUE não pode rodar dentro de uma transação,
-- por isso esta migration deve ser executada diretamente no SQL Editor.
ALTER TYPE appointment_status ADD VALUE IF NOT EXISTS 'lista_espera';

-- ── DB2: Corrige constraint actor_type no audit_log ──────────────────
-- Inclui 'receptionist' que é usado por approval/route.ts
ALTER TABLE audit_log DROP CONSTRAINT IF EXISTS audit_log_actor_type_check;
ALTER TABLE audit_log ADD CONSTRAINT audit_log_actor_type_check
  CHECK (actor_type IN ('agent', 'user', 'system', 'receptionist'));

-- ── S7: Coluna wamid para deduplicação de mensagens Meta ─────────────
-- Meta reenvia o mesmo wamid em retentativas (até 72h).
-- Index único garante processamento exatamente-uma-vez por mensagem.
ALTER TABLE wa_messages ADD COLUMN IF NOT EXISTS wamid text;
CREATE UNIQUE INDEX IF NOT EXISTS wa_messages_wamid_key
  ON wa_messages (wamid)
  WHERE wamid IS NOT NULL;
