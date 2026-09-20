-- Re-seed schedules for doctors added after 0003 ran
DO $$
DECLARE v_doc RECORD;
BEGIN
  FOR v_doc IN
    SELECT id, specialty FROM doctors
    WHERE id NOT IN (SELECT DISTINCT doctor_id FROM doctor_schedules)
  LOOP
    IF v_doc.specialty ILIKE '%Clínico%' OR v_doc.specialty ILIKE '%Geral%' THEN
      INSERT INTO doctor_schedules(doctor_id, day_of_week, start_time, end_time)
        SELECT v_doc.id, d, '08:00', '17:00' FROM unnest(ARRAY[1,2,3,4,5]::smallint[]) AS d
        ON CONFLICT DO NOTHING;
    ELSIF v_doc.specialty ILIKE '%Cardiolog%' THEN
      INSERT INTO doctor_schedules(doctor_id, day_of_week, start_time, end_time)
        SELECT v_doc.id, d, '09:00', '17:00' FROM unnest(ARRAY[1,3]::smallint[]) AS d
        ON CONFLICT DO NOTHING;
    ELSIF v_doc.specialty ILIKE '%Dermatolog%' THEN
      INSERT INTO doctor_schedules(doctor_id, day_of_week, start_time, end_time)
        SELECT v_doc.id, d, '08:00', '16:00' FROM unnest(ARRAY[2,4]::smallint[]) AS d
        ON CONFLICT DO NOTHING;
    ELSIF v_doc.specialty ILIKE '%Ortoped%' THEN
      INSERT INTO doctor_schedules(doctor_id, day_of_week, start_time, end_time)
        SELECT v_doc.id, d, '08:00', '16:00' FROM unnest(ARRAY[1,3,5]::smallint[]) AS d
        ON CONFLICT DO NOTHING;
    ELSIF v_doc.specialty ILIKE '%Neurolog%' THEN
      INSERT INTO doctor_schedules(doctor_id, day_of_week, start_time, end_time)
        SELECT v_doc.id, d, '10:00', '18:00' FROM unnest(ARRAY[2,4,5]::smallint[]) AS d
        ON CONFLICT DO NOTHING;
    ELSIF v_doc.specialty ILIKE '%Ginecolog%' OR v_doc.specialty ILIKE '%Obstet%' THEN
      INSERT INTO doctor_schedules(doctor_id, day_of_week, start_time, end_time)
        SELECT v_doc.id, d, '08:00', '17:00' FROM unnest(ARRAY[1,2,4]::smallint[]) AS d
        ON CONFLICT DO NOTHING;
    ELSIF v_doc.specialty ILIKE '%Pediatri%' THEN
      INSERT INTO doctor_schedules(doctor_id, day_of_week, start_time, end_time)
        SELECT v_doc.id, d, '08:00', '17:00' FROM unnest(ARRAY[1,2,3,4,5]::smallint[]) AS d
        ON CONFLICT DO NOTHING;
    ELSE
      -- Generic default: Mon–Fri 08:00–17:00
      INSERT INTO doctor_schedules(doctor_id, day_of_week, start_time, end_time)
        SELECT v_doc.id, d, '08:00', '17:00' FROM unnest(ARRAY[1,2,3,4,5]::smallint[]) AS d
        ON CONFLICT DO NOTHING;
    END IF;
  END LOOP;
END $$;

-- Auto-seed new doctors on INSERT
CREATE OR REPLACE FUNCTION seed_doctor_schedule()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  IF NEW.specialty ILIKE '%Clínico%' OR NEW.specialty ILIKE '%Geral%' THEN
    INSERT INTO doctor_schedules(doctor_id, day_of_week, start_time, end_time)
      SELECT NEW.id, d, '08:00', '17:00' FROM unnest(ARRAY[1,2,3,4,5]::smallint[]) AS d
      ON CONFLICT DO NOTHING;
  ELSIF NEW.specialty ILIKE '%Cardiolog%' THEN
    INSERT INTO doctor_schedules(doctor_id, day_of_week, start_time, end_time)
      SELECT NEW.id, d, '09:00', '17:00' FROM unnest(ARRAY[1,3]::smallint[]) AS d
      ON CONFLICT DO NOTHING;
  ELSIF NEW.specialty ILIKE '%Dermatolog%' THEN
    INSERT INTO doctor_schedules(doctor_id, day_of_week, start_time, end_time)
      SELECT NEW.id, d, '08:00', '16:00' FROM unnest(ARRAY[2,4]::smallint[]) AS d
      ON CONFLICT DO NOTHING;
  ELSIF NEW.specialty ILIKE '%Ortoped%' THEN
    INSERT INTO doctor_schedules(doctor_id, day_of_week, start_time, end_time)
      SELECT NEW.id, d, '08:00', '16:00' FROM unnest(ARRAY[1,3,5]::smallint[]) AS d
      ON CONFLICT DO NOTHING;
  ELSIF NEW.specialty ILIKE '%Neurolog%' THEN
    INSERT INTO doctor_schedules(doctor_id, day_of_week, start_time, end_time)
      SELECT NEW.id, d, '10:00', '18:00' FROM unnest(ARRAY[2,4,5]::smallint[]) AS d
      ON CONFLICT DO NOTHING;
  ELSIF NEW.specialty ILIKE '%Ginecolog%' OR NEW.specialty ILIKE '%Obstet%' THEN
    INSERT INTO doctor_schedules(doctor_id, day_of_week, start_time, end_time)
      SELECT NEW.id, d, '08:00', '17:00' FROM unnest(ARRAY[1,2,4]::smallint[]) AS d
      ON CONFLICT DO NOTHING;
  ELSIF NEW.specialty ILIKE '%Pediatri%' THEN
    INSERT INTO doctor_schedules(doctor_id, day_of_week, start_time, end_time)
      SELECT NEW.id, d, '08:00', '17:00' FROM unnest(ARRAY[1,2,3,4,5]::smallint[]) AS d
      ON CONFLICT DO NOTHING;
  ELSE
    INSERT INTO doctor_schedules(doctor_id, day_of_week, start_time, end_time)
      SELECT NEW.id, d, '08:00', '17:00' FROM unnest(ARRAY[1,2,3,4,5]::smallint[]) AS d
      ON CONFLICT DO NOTHING;
  END IF;
  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS trg_seed_doctor_schedule ON doctors;
CREATE TRIGGER trg_seed_doctor_schedule
  AFTER INSERT ON doctors
  FOR EACH ROW EXECUTE FUNCTION seed_doctor_schedule();
