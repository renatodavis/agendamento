import type { Metadata } from 'next'
import { Bricolage_Grotesque, Figtree, DM_Mono } from 'next/font/google'
import { getClinicBasicConfig } from '@/lib/clinic-config-server'
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

export async function generateMetadata(): Promise<Metadata> {
  const { clinicName } = await getClinicBasicConfig()
  const isDefaultName = !clinicName || clinicName === 'AgendaAgentic'
  return {
    title: isDefaultName ? 'AgendaAgentic' : `${clinicName} · AgendaAgentic`,
    description: 'Sistema de agendamento inteligente via WhatsApp com IA',
  }
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
