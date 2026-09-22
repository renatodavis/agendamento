'use client'
import { useState, useEffect } from 'react'

let cached: string | null = null

export function useClinicName(fallback = 'Clínica São Lucas') {
  const [name, setName] = useState<string>(cached ?? fallback)

  useEffect(() => {
    if (cached) return
    fetch('/api/clinic-config')
      .then(r => r.ok ? r.json() : null)
      .then(cfg => {
        if (cfg?.clinic_name) {
          cached = cfg.clinic_name
          setName(cfg.clinic_name)
        }
      })
      .catch(() => {})
  }, [])

  return name
}
