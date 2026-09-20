-- Doctor working schedule (which days/hours each doctor sees patients)
CREATE TABLE IF NOT EXISTS doctor_schedules (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  doctor_id    uuid NOT NULL REFERENCES doctors(id) ON DELETE CASCADE,
  day_of_week  smallint NOT NULL CHECK (day_of_week BETWEEN 0 AND 6), -- 0=Dom 1=Seg … 6=Sab
  start_time   time NOT NULL DEFAULT '08:00',
  end_time     time NOT NULL DEFAULT '18:00',
  slot_minutes smallint NOT NULL DEFAULT 60,
  UNIQUE(doctor_id, day_of_week)
);

-- HITL approval requests (human confirms before suggesting a date to patient)
CREATE TABLE IF NOT EXISTS approval_requests (
  id                 uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id         uuid REFERENCES wa_sessions(id),
  patient_id         uuid REFERENCES patients(id),
  patient_name       text,
  doctor_id          uuid REFERENCES doctors(id),
  suggested_at       timestamptz NOT NULL,
  message_to_patient text NOT NULL,
  status             text NOT NULL DEFAULT 'pending'
                     CHECK (status IN ('pending','approved','confirmed','rejected')),
  rejection_reason   text,
  created_at         timestamptz NOT NULL DEFAULT now(),
  reviewed_at        timestamptz,
  reviewed_by        text
);

ALTER TABLE approval_requests REPLICA IDENTITY FULL;
ALTER PUBLICATION supabase_realtime ADD TABLE approval_requests;

-- Seed working hours based on specialty
DO $$
DECLARE v_doc RECORD;
BEGIN
  FOR v_doc IN SELECT id, specialty FROM doctors LOOP
    IF v_doc.specialty ILIKE '%Clínico%' OR v_doc.specialty ILIKE '%Geral%' THEN
      -- Clínico Geral: Seg–Sex 08:00–17:00
      INSERT INTO doctor_schedules(doctor_id, day_of_week, start_time, end_time)
        SELECT v_doc.id, d, '08:00', '17:00' FROM unnest(ARRAY[1,2,3,4,5]::smallint[]) AS d
        ON CONFLICT DO NOTHING;

    ELSIF v_doc.specialty ILIKE '%Cardiolog%' THEN
      -- Cardiologia: Seg e Qua 09:00–17:00
      INSERT INTO doctor_schedules(doctor_id, day_of_week, start_time, end_time)
        SELECT v_doc.id, d, '09:00', '17:00' FROM unnest(ARRAY[1,3]::smallint[]) AS d
        ON CONFLICT DO NOTHING;

    ELSIF v_doc.specialty ILIKE '%Dermatolog%' THEN
      -- Dermatologia: Ter e Qui 08:00–16:00
      INSERT INTO doctor_schedules(doctor_id, day_of_week, start_time, end_time)
        SELECT v_doc.id, d, '08:00', '16:00' FROM unnest(ARRAY[2,4]::smallint[]) AS d
        ON CONFLICT DO NOTHING;

    ELSIF v_doc.specialty ILIKE '%Ortoped%' THEN
      -- Ortopedia: Seg, Qua e Sex 08:00–16:00
      INSERT INTO doctor_schedules(doctor_id, day_of_week, start_time, end_time)
        SELECT v_doc.id, d, '08:00', '16:00' FROM unnest(ARRAY[1,3,5]::smallint[]) AS d
        ON CONFLICT DO NOTHING;

    ELSIF v_doc.specialty ILIKE '%Neurolog%' THEN
      -- Neurologia: Ter, Qui e Sex 10:00–18:00
      INSERT INTO doctor_schedules(doctor_id, day_of_week, start_time, end_time)
        SELECT v_doc.id, d, '10:00', '18:00' FROM unnest(ARRAY[2,4,5]::smallint[]) AS d
        ON CONFLICT DO NOTHING;

    ELSE
      -- Padrão: Seg–Sex 08:00–17:00
      INSERT INTO doctor_schedules(doctor_id, day_of_week, start_time, end_time)
        SELECT v_doc.id, d, '08:00', '17:00' FROM unnest(ARRAY[1,2,3,4,5]::smallint[]) AS d
        ON CONFLICT DO NOTHING;
    END IF;
  END LOOP;
END $$;
