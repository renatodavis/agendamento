import { createServerClient } from '@/lib/supabase'

export interface ClinicVocabulary {
  client: string
  professional: string
  appointment: string
  business_noun: string
  emoji: string
}

export interface ClinicBasicConfig {
  clinicName: string
  workingHours: string
  vocabulary: ClinicVocabulary
}

const DEFAULT_VOC: ClinicVocabulary = {
  client:      'paciente',
  professional:'médico',
  appointment: 'consulta',
  business_noun:'clínica',
  emoji:       '🏥',
}

let _cache: { data: ClinicBasicConfig; ts: number } | null = null
const CACHE_TTL_MS = 60_000

export async function getClinicBasicConfig(): Promise<ClinicBasicConfig> {
  if (_cache && Date.now() - _cache.ts < CACHE_TTL_MS) return _cache.data

  const db = createServerClient()
  const [{ data: cfgRows }, { data: activeProfile }] = await Promise.all([
    db.from('clinic_config').select('key, value'),
    db.from('profiles').select('vocabulary').eq('is_active', true).maybeSingle(),
  ])
  const cfg = Object.fromEntries((cfgRows ?? []).map(r => [r.key, r.value]))

  const profileVoc = (activeProfile?.vocabulary ?? {}) as Partial<ClinicVocabulary> & { business_name?: string }
  const vocabulary: ClinicVocabulary = { ...DEFAULT_VOC, ...profileVoc }

  const businessNameFromProfile = profileVoc.business_name
  const clinicName = (businessNameFromProfile && businessNameFromProfile.trim())
    ? businessNameFromProfile.trim()
    : (typeof cfg.clinic_name === 'string' ? cfg.clinic_name : 'Clínica São Lucas')

  const result: ClinicBasicConfig = {
    clinicName,
    workingHours: typeof cfg.working_hours === 'string' ? cfg.working_hours : 'Segunda a Sexta, 8h às 18h',
    vocabulary,
  }

  _cache = { data: result, ts: Date.now() }
  return result
}

export function invalidateClinicBasicConfigCache() {
  _cache = null
}
