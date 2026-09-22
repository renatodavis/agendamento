import { createServerClient } from '@/lib/supabase'

export interface ClinicBasicConfig {
  clinicName: string
  workingHours: string
}

let _cache: { data: ClinicBasicConfig; ts: number } | null = null
const CACHE_TTL_MS = 60_000

export async function getClinicBasicConfig(): Promise<ClinicBasicConfig> {
  if (_cache && Date.now() - _cache.ts < CACHE_TTL_MS) return _cache.data

  const db = createServerClient()
  const { data } = await db.from('clinic_config').select('key, value')
  const cfg = Object.fromEntries((data ?? []).map(r => [r.key, r.value]))

  const result: ClinicBasicConfig = {
    clinicName:   typeof cfg.clinic_name === 'string'    ? cfg.clinic_name    : 'Clínica São Lucas',
    workingHours: typeof cfg.working_hours === 'string'  ? cfg.working_hours  : 'Segunda a Sexta, 8h às 18h',
  }

  _cache = { data: result, ts: Date.now() }
  return result
}
