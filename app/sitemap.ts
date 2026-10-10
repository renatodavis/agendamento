import type { MetadataRoute } from 'next'
import { SITE_URL, LEGAL } from '@/lib/site'

// lastModified = data real da última alteração de cada página (não use new Date())
export default function sitemap(): MetadataRoute.Sitemap {
  return [
    { url: SITE_URL, lastModified: '2026-10-10' },
    ...(LEGAL.ready
      ? [
          { url: `${SITE_URL}/privacidade`, lastModified: LEGAL.atualizadoEmISO },
          { url: `${SITE_URL}/termos`, lastModified: LEGAL.atualizadoEmISO },
        ]
      : []),
  ]
}
