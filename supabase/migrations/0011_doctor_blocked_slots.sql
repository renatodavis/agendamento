-- Bloqueios de data/horário por médico (férias, feriados, almoço, etc.)
CREATE TABLE IF NOT EXISTS doctor_blocked_slots (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  doctor_id   uuid NOT NULL REFERENCES doctors(id) ON DELETE CASCADE,
  blocked_date date NOT NULL,
  start_time  time,          -- null = dia inteiro bloqueado
  end_time    time,          -- null = dia inteiro bloqueado
  reason      text,
  created_at  timestamptz DEFAULT now()
);
CREATE INDEX IF NOT EXISTS doctor_blocked_slots_doctor_date
  ON doctor_blocked_slots (doctor_id, blocked_date);

-- RLS
ALTER TABLE doctor_blocked_slots ENABLE ROW LEVEL SECURITY;
CREATE POLICY "authenticated_full_access" ON doctor_blocked_slots
  FOR ALL TO authenticated USING (true) WITH CHECK (true);
