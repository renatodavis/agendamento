import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Entrar',
  robots: { index: false, follow: true },
}

export default function LoginLayout({ children }: { children: React.ReactNode }) {
  return children
}
