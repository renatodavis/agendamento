import type { Metadata } from 'next'
import { getClinicBasicConfig } from '@/lib/clinic-config-server'

export async function generateMetadata(): Promise<Metadata> {
  const { clinicName } = await getClinicBasicConfig()
  const isDefaultName = !clinicName || clinicName === 'AgendaAgentic'
  return {
    title: { absolute: isDefaultName ? 'Painel · AgendaAgentic' : `${clinicName} · AgendaAgentic` },
    robots: { index: false, follow: false },
  }
}

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return children
}
