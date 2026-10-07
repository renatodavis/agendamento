import { createServerClient } from '@/lib/supabase'

export interface WhatsAppConfig {
  apiToken: string
  phoneNumberId: string
  verifyToken: string
  appSecret: string
}

const WA_SECRET_KEYS = [
  'whatsapp_api_token',
  'whatsapp_phone_number_id',
  'whatsapp_verify_token',
  'whatsapp_app_secret',
] as const

let _cache: { config: Partial<WhatsAppConfig>; ts: number } | null = null
const CACHE_TTL_MS = 60_000

export async function getWhatsAppConfig(): Promise<Partial<WhatsAppConfig>> {
  if (_cache && Date.now() - _cache.ts < CACHE_TTL_MS) return _cache.config

  const db = createServerClient()
  const { data } = await db
    .from('clinic_secrets')
    .select('key, value')
    .in('key', [...WA_SECRET_KEYS])

  const secrets = Object.fromEntries((data ?? []).map(r => [r.key as string, r.value as string]))

  const config: Partial<WhatsAppConfig> = {
    apiToken:      secrets.whatsapp_api_token      || process.env.WHATSAPP_API_TOKEN,
    phoneNumberId: secrets.whatsapp_phone_number_id || process.env.WHATSAPP_PHONE_NUMBER_ID,
    verifyToken:   secrets.whatsapp_verify_token   || process.env.WHATSAPP_VERIFY_TOKEN,
    appSecret:     secrets.whatsapp_app_secret     || process.env.WHATSAPP_APP_SECRET,
  }

  _cache = { config, ts: Date.now() }
  return config
}

export function invalidateWhatsAppConfigCache() {
  _cache = null
}
