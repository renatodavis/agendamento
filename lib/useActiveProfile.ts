'use client'
import { useState, useEffect } from 'react'

export type ActiveProfile = {
  id: string
  name: string
  domain_type: string
  vocabulary: { emoji?: string; business_name?: string; [k: string]: string | undefined }
} | null

let cached: ActiveProfile | undefined = undefined

export function useActiveProfile(): ActiveProfile {
  const [profile, setProfile] = useState<ActiveProfile>(cached ?? null)

  useEffect(() => {
    if (cached !== undefined) return
    fetch('/api/profiles/active')
      .then(r => r.ok ? r.json() : null)
      .then(data => {
        cached = data
        setProfile(data)
      })
      .catch(() => { cached = null })
  }, [])

  return profile
}

export function invalidateActiveProfileCache() {
  cached = undefined
}

const DOMAIN_PATIENT_EMOJI: Record<string, string> = {
  veterinaria: '🐾', personal: '🏃', barbearia: '✂️', salao: '💇', odontologia: '🦷',
}

export function patientFallbackEmoji(profile: ActiveProfile): string {
  return DOMAIN_PATIENT_EMOJI[profile?.domain_type ?? ''] ?? '👤'
}

export type Vocabulary = {
  client: string
  professional: string
  appointment: string
  appointments: string
  business: string
}

const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1)

export function vocabularyOf(profile: ActiveProfile): Vocabulary & { Client: string; Professional: string; Appointment: string } {
  const v = profile?.vocabulary ?? {}
  const appointment = v.appointment || 'consulta'
  const voc = {
    client:       v.client || 'paciente',
    professional: v.professional || 'profissional',
    appointment,
    appointments: appointment.endsWith('ão') ? appointment.slice(0, -2) + 'ões' : appointment + 's',
    business:     v.business_noun || 'clínica',
  }
  return { ...voc, Client: cap(voc.client), Professional: cap(voc.professional), Appointment: cap(voc.appointment) }
}

export function useVocabulary() {
  return vocabularyOf(useActiveProfile())
}

// Convênio só se aplica a perfis de saúde (business_noun contém "clínica")
export function profileHasConvenio(profile: ActiveProfile): boolean {
  const noun = profile?.vocabulary?.business_noun?.toLowerCase() ?? ''
  return noun.includes('clínica') || noun.includes('consultório')
}
