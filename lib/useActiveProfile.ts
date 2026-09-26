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

// Convênio só se aplica a perfis de saúde (business_noun contém "clínica")
export function profileHasConvenio(profile: ActiveProfile): boolean {
  const noun = profile?.vocabulary?.business_noun?.toLowerCase() ?? ''
  return noun.includes('clínica') || noun.includes('consultório')
}
