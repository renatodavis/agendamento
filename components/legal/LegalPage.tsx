import Link from 'next/link'
import { LEGAL } from '@/lib/site'

export default function LegalPage({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="legal-root">
      <header className="legal-header">
        <Link href="/" className="legal-logo">Agenda<span>Agentic</span></Link>
      </header>

      <main className="legal-main">
        {!LEGAL.ready && (
          <p className="legal-draft">
            Rascunho em revisão. Os campos entre colchetes ainda serão preenchidos.
          </p>
        )}
        <h1>{title}</h1>
        <p className="legal-updated">Última atualização: {LEGAL.atualizadoEm}</p>
        {children}
      </main>

      <footer className="legal-footer">
        <Link href="/">Início</Link>
        <Link href="/privacidade">Política de Privacidade</Link>
        <Link href="/termos">Termos de Uso</Link>
      </footer>

      <style>{`
        .legal-root { min-height: 100%; background: var(--surface); color: var(--ink); padding-inline: 20px; }
        .legal-header { max-width: 720px; margin: 0 auto; padding-block: 24px; border-bottom: 1px solid var(--line); }
        .legal-logo { font-family: var(--font-bricolage), system-ui, sans-serif; font-weight: 800; font-size: 1.15rem; color: var(--ink); text-decoration: none; }
        .legal-logo span { color: var(--brand); }
        .legal-main { max-width: 720px; margin: 0 auto; padding-block: 40px 56px; line-height: 1.7; font-size: 16px; }
        .legal-main h1 { font-family: var(--font-bricolage), system-ui, sans-serif; font-size: 2rem; line-height: 1.15; margin: 0 0 6px; text-wrap: balance; }
        .legal-updated { color: var(--ink-muted); font-size: 14px; margin: 0 0 32px; }
        .legal-main h2 { font-family: var(--font-bricolage), system-ui, sans-serif; font-size: 1.25rem; margin: 36px 0 10px; text-wrap: balance; }
        .legal-main h3 { font-size: 1rem; margin: 20px 0 6px; }
        .legal-main p, .legal-main li { color: var(--ink); }
        .legal-main h1, .legal-main h2 { font-weight: 700; }
        .legal-main ul { list-style: disc; padding-left: 22px; margin: 8px 0 16px; display: flex; flex-direction: column; gap: 6px; }
        .legal-main a { color: var(--brand); }
        .legal-main table { width: 100%; border-collapse: collapse; font-size: 14px; margin: 12px 0 20px; }
        .legal-main th, .legal-main td { text-align: left; padding: 10px 12px; border-bottom: 1px solid var(--line); vertical-align: top; }
        .legal-main th { color: var(--ink-muted); font-weight: 600; font-size: 12px; text-transform: uppercase; letter-spacing: .05em; }
        .legal-table { overflow-x: auto; }
        .legal-draft {
          background: var(--assistant-soft); color: var(--assistant-ink); border: 1px solid var(--assistant-line);
          padding: 10px 14px; border-radius: 10px; font-size: 14px; margin: 0 0 24px;
        }
        .legal-footer {
          max-width: 720px; margin: 0 auto; padding-block: 24px 40px; border-top: 1px solid var(--line);
          display: flex; flex-wrap: wrap; gap: 20px; font-size: 14px;
        }
        .legal-footer a { color: var(--ink-muted); text-decoration: none; }
        .legal-footer a:hover { color: var(--brand); }
      `}</style>
    </div>
  )
}
