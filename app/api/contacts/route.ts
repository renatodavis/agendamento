import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase'

export async function GET(req: NextRequest) {
  const db = createServerClient()
  const { searchParams } = new URL(req.url)
  const search = searchParams.get('q')?.trim().toLowerCase()

  const { data, error } = await db
    .from('wa_sessions')
    .select(`
      id,
      phone,
      name,
      opt_in,
      opt_out_at,
      lgpd_consent_at,
      last_inbound_at,
      patient:patients(id, name, phone)
    `)
    .order('last_inbound_at', { ascending: false })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  // Enriquecer com contagem de consultas por paciente
  const patientIds = (data ?? [])
    .map(s => (s.patient as unknown as { id: string } | null)?.id)
    .filter(Boolean) as string[]

  let apptCounts: Record<string, number> = {}
  if (patientIds.length > 0) {
    const { data: appts } = await db
      .from('appointments')
      .select('patient_id')
      .in('patient_id', patientIds)
      .not('status', 'in', '("cancelada")')

    for (const a of appts ?? []) {
      apptCounts[a.patient_id] = (apptCounts[a.patient_id] ?? 0) + 1
    }
  }

  let contacts = (data ?? []).map(s => {
    const patient = s.patient as unknown as { id: string; name: string; phone: string } | null
    return {
      id: s.id,
      phone: s.phone,
      name: s.name || patient?.name || 'Desconhecido',
      patient_id: patient?.id ?? null,
      patient_name: patient?.name ?? null,
      opt_in: s.opt_in,
      opt_out_at: s.opt_out_at,
      lgpd_consent_at: s.lgpd_consent_at,
      last_inbound_at: s.last_inbound_at,
      appointment_count: patient?.id ? (apptCounts[patient.id] ?? 0) : 0,
    }
  })

  if (search) {
    contacts = contacts.filter(c =>
      c.name.toLowerCase().includes(search) ||
      c.phone.includes(search) ||
      (c.patient_name ?? '').toLowerCase().includes(search)
    )
  }

  return NextResponse.json(contacts)
}
