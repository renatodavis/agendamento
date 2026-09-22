import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

// Endpoint temporário de migration — remover após uso
const SECRET = process.env.CRON_SECRET ?? ''

export async function POST(req: NextRequest) {
  if (!SECRET || req.headers.get('x-migrate-secret') !== SECRET) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false } }
  )

  const results: Record<string, unknown> = {}

  // 1. Verificar tabelas existentes
  const { data: tables } = await supabase
    .from('information_schema.tables')
    .select('table_name')
    .eq('table_schema', 'public')
  results.tables = tables?.map((t: { table_name: string }) => t.table_name) ?? []

  // 2. Criar appointment_history se não existir
  if (!(results.tables as string[]).includes('appointment_history')) {
    const { error } = await supabase.rpc('exec_migration', {
      sql: `
        CREATE TABLE IF NOT EXISTS appointment_history (
          id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
          appointment_id uuid NOT NULL REFERENCES appointments(id),
          event          text NOT NULL,
          kind           text NOT NULL DEFAULT 'schedule',
          actor          text NOT NULL DEFAULT 'system',
          created_at     timestamptz NOT NULL DEFAULT now()
        );
        CREATE INDEX IF NOT EXISTS ah_appt_idx ON appointment_history(appointment_id);
      `
    })
    results.create_history = error ? `error: ${error.message}` : 'created'
  } else {
    results.create_history = 'already_exists'
  }

  // 3. Truncate via deletes ordenados (service role bypassa RLS)
  const deletes = [
    'audit_log', 'wa_messages', 'appointments',
    'doctor_blocked_slots', 'doctor_schedules',
    'approval_requests', 'lgpd_consents', 'wa_sessions', 'patients', 'doctors'
  ]

  for (const table of deletes) {
    const { error } = await supabase.from(table).delete().gte('created_at', '1900-01-01')
    results[`delete_${table}`] = error ? `error: ${error.message}` : 'ok'
  }

  // appointment_history separado (sem created_at filter padrão)
  {
    const { error } = await supabase.from('appointment_history').delete().gte('created_at', '1900-01-01')
    results.delete_appointment_history = error ? `error: ${error.message}` : 'ok'
  }

  // 4. Inserir médicos
  const { error: docErr } = await supabase.from('doctors').insert([
    { id: '11111111-0000-0000-0000-000000000001', name: 'Dr. Cardoso',   specialty: 'Clínica Geral', crm: 'CRM-SP 12345' },
    { id: '11111111-0000-0000-0000-000000000002', name: 'Dra. Lima',     specialty: 'Cardiologia',   crm: 'CRM-SP 23456' },
    { id: '11111111-0000-0000-0000-000000000003', name: 'Dr. Fernandes', specialty: 'Dermatologia',  crm: 'CRM-SP 34567' },
    { id: '11111111-0000-0000-0000-000000000004', name: 'Dra. Costa',    specialty: 'Ortopedia',     crm: 'CRM-SP 45678' },
    { id: '11111111-0000-0000-0000-000000000005', name: 'Dr. Alves',     specialty: 'Pediatria',     crm: 'CRM-SP 56789' },
    { id: '11111111-0000-0000-0000-000000000006', name: 'Dr. Santos',    specialty: 'Neurologia',    crm: 'CRM-SP 67890' },
  ])
  results.insert_doctors = docErr ? `error: ${docErr.message}` : 'ok'

  // 5. Inserir agendas seg-sex 08h-17h 30min
  if (!docErr) {
    const schedules = []
    const docIds = [
      '11111111-0000-0000-0000-000000000001',
      '11111111-0000-0000-0000-000000000002',
      '11111111-0000-0000-0000-000000000003',
      '11111111-0000-0000-0000-000000000004',
      '11111111-0000-0000-0000-000000000005',
      '11111111-0000-0000-0000-000000000006',
    ]
    for (const docId of docIds) {
      for (let dow = 1; dow <= 5; dow++) {
        schedules.push({ doctor_id: docId, day_of_week: dow, start_time: '08:00', end_time: '17:00', slot_duration_minutes: 30 })
      }
    }
    const { error: schErr } = await supabase.from('doctor_schedules').insert(schedules)
    results.insert_schedules = schErr ? `error: ${schErr.message}` : `ok (${schedules.length} rows)`
  }

  return NextResponse.json({ ok: true, results })
}
