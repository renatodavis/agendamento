import type { MetadataRoute } from 'next'
import { SITE_URL, LEGAL } from '@/lib/site'
import { SEGMENTS } from '@/lib/segments'
import { POSTS } from '@/lib/blog'

// lastModified = data real da última alteração de cada página (não use new Date())
export default function sitemap(): MetadataRoute.Sitemap {
  const latestPost = POSTS.map(p => p.dateModified).sort().at(-1)
  return [
    { url: SITE_URL, lastModified: '2026-10-10' },
    ...SEGMENTS.map(s => ({ url: `${SITE_URL}/${s.slug}`, lastModified: s.lastModified })),
    { url: `${SITE_URL}/perguntas-frequentes`, lastModified: '2026-10-10' },
    { url: `${SITE_URL}/blog`, lastModified: latestPost },
    ...POSTS.map(p => ({ url: `${SITE_URL}/blog/${p.slug}`, lastModified: p.dateModified })),
    ...(LEGAL.ready
      ? [
          { url: `${SITE_URL}/privacidade`, lastModified: LEGAL.atualizadoEmISO },
          { url: `${SITE_URL}/termos`, lastModified: LEGAL.atualizadoEmISO },
        ]
      : []),
  ]
}
