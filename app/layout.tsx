import type { Metadata } from 'next'
import { Bricolage_Grotesque, DM_Sans, Outfit } from 'next/font/google'
import { getClinicBasicConfig } from '@/lib/clinic-config-server'
import './globals.css'

const bricolage = Bricolage_Grotesque({
  variable: '--font-bricolage',
  subsets: ['latin'],
  axes: ['opsz'],
})

const dmSans = DM_Sans({
  variable: '--font-dm-sans',
  subsets: ['latin'],
  axes: ['opsz'],
})

const outfit = Outfit({
  variable: '--font-outfit',
  subsets: ['latin'],
  weight: ['600', '700', '800'],
})

export async function generateMetadata(): Promise<Metadata> {
  const { clinicName } = await getClinicBasicConfig()
  return {
    title: clinicName,
    description: 'Sistema de agendamento inteligente via WhatsApp com IA',
  }
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR" className={`${bricolage.variable} ${dmSans.variable} ${outfit.variable} h-full`}>
      <body className="h-full font-sans antialiased bg-background text-foreground">
        {children}
      </body>
    </html>
  )
}
