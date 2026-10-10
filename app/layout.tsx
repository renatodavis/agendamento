import type { Metadata } from 'next'
import { Bricolage_Grotesque, Figtree, DM_Mono } from 'next/font/google'
import { SITE_URL, SITE_NAME, HOME_TITLE, HOME_DESCRIPTION, openGraphFor } from '@/lib/site'
import './globals.css'

const bricolage = Bricolage_Grotesque({
  variable: '--font-bricolage',
  subsets: ['latin'],
  axes: ['opsz'],
})

const figtree = Figtree({
  variable: '--font-figtree',
  subsets: ['latin'],
})

const dmMono = DM_Mono({
  variable: '--font-dm-mono',
  subsets: ['latin'],
  weight: ['400', '500'],
})

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: `${SITE_NAME} — Agendamento pelo WhatsApp com IA`,
    template: `%s | ${SITE_NAME}`,
  },
  description: HOME_DESCRIPTION,
  applicationName: SITE_NAME,
  openGraph: openGraphFor('/', HOME_TITLE, HOME_DESCRIPTION),
  twitter: { card: 'summary_large_image' },
  ...(process.env.GOOGLE_SITE_VERIFICATION
    ? { verification: { google: process.env.GOOGLE_SITE_VERIFICATION } }
    : {}),
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR" className={`${bricolage.variable} ${figtree.variable} ${dmMono.variable} h-full`}>
      <body className="h-full font-sans antialiased bg-background text-foreground">
        {children}
      </body>
    </html>
  )
}
