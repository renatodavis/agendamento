import Link from 'next/link'
import { DEMO_CTA, SEGMENT_LINKS, CONTENT_LINKS, LEGAL } from '@/lib/site'

export function DemoButton({ className = 'mk-btn mk-btn-primary' }: { className?: string }) {
  return DEMO_CTA.external
    ? <a href={DEMO_CTA.href} className={className} target="_blank" rel="noopener noreferrer">{DEMO_CTA.label}</a>
    : <Link href={DEMO_CTA.href} className={className}>{DEMO_CTA.label}</Link>
}

export function JsonLd({ data }: { data: unknown }) {
  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(data).replace(/</g, '\\u003c') }}
    />
  )
}

export function Breadcrumbs({ items }: { items: { name: string; href: string }[] }) {
  return (
    <nav className="mk-crumbs" aria-label="Você está em">
      {items.map((it, i) => (
        <span key={it.href}>
          {i > 0 && <span aria-hidden="true"> / </span>}
          {i < items.length - 1 ? <Link href={it.href}>{it.name}</Link> : <span aria-current="page">{it.name}</span>}
        </span>
      ))}
    </nav>
  )
}

export default function MarketingShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="mk-root">
      <header className="mk-header">
        <div className="mk-header-inner">
          <Link href="/" className="mk-logo">Agenda<span>Agentic</span></Link>
          <nav className="mk-nav" aria-label="Principal">
            {SEGMENT_LINKS.map(l => <Link key={l.href} href={l.href}>{l.label}</Link>)}
            {CONTENT_LINKS.map(l => <Link key={l.href} href={l.href}>{l.label}</Link>)}
          </nav>
          <DemoButton className="mk-btn mk-btn-primary mk-btn-sm" />
        </div>
      </header>

      <main>{children}</main>

      <footer className="mk-footer">
        <div className="mk-footer-inner">
          <div>
            <Link href="/" className="mk-logo">Agenda<span>Agentic</span></Link>
            <p>Agendamento pelo WhatsApp com inteligência artificial.</p>
          </div>
          <div>
            <h2>Soluções</h2>
            {SEGMENT_LINKS.map(l => <Link key={l.href} href={l.href}>{l.label}</Link>)}
          </div>
          <div>
            <h2>Conteúdo</h2>
            {CONTENT_LINKS.map(l => <Link key={l.href} href={l.href}>{l.label}</Link>)}
          </div>
          {LEGAL.ready && (
            <div>
              <h2>Institucional</h2>
              <Link href="/privacidade">Política de Privacidade</Link>
              <Link href="/termos">Termos de Uso</Link>
            </div>
          )}
        </div>
      </footer>

      <style>{`
        .mk-root {
          min-height: 100%; background: var(--surface); color: var(--ink);
          font-size: 16px; line-height: 1.65;
        }
        .mk-root h1, .mk-root h2, .mk-root h3 {
          font-family: var(--font-bricolage), system-ui, sans-serif; line-height: 1.15; text-wrap: balance;
        }
        .mk-root a { color: inherit; }
        .mk-wrap { max-width: 1080px; margin: 0 auto; padding-inline: 20px; }
        .mk-narrow { max-width: 720px; margin: 0 auto; padding-inline: 20px; }

        .mk-header {
          position: sticky; top: 0; z-index: 20;
          background: color-mix(in srgb, var(--surface) 92%, transparent);
          backdrop-filter: blur(10px); -webkit-backdrop-filter: blur(10px);
          border-bottom: 1px solid var(--line);
        }
        .mk-header-inner {
          max-width: 1080px; margin: 0 auto; padding: 0 20px; height: 60px;
          display: flex; align-items: center; gap: 24px;
        }
        .mk-logo {
          font-family: var(--font-bricolage), system-ui, sans-serif;
          font-weight: 800; font-size: 1.15rem; text-decoration: none; color: var(--ink);
        }
        .mk-logo span { color: var(--brand); }
        .mk-nav { display: flex; gap: 20px; margin-left: auto; font-size: 14px; }
        .mk-nav a { color: var(--ink-muted); text-decoration: none; white-space: nowrap; }
        .mk-nav a:hover { color: var(--brand); }

        .mk-btn {
          display: inline-flex; align-items: center; justify-content: center; gap: 8px;
          font-weight: 700; font-size: 15px; padding: 12px 22px; border-radius: 10px;
          text-decoration: none; white-space: nowrap; transition: opacity .15s, transform .15s;
        }
        .mk-btn:hover { transform: translateY(-1px); }
        .mk-btn-primary { background: var(--brand); color: var(--on-brand) !important; }
        .mk-btn-primary:hover { opacity: .92; }
        .mk-btn-ghost { border: 1px solid var(--line-strong); color: var(--ink) !important; }
        .mk-btn-sm { padding: 8px 14px; font-size: 13px; border-radius: 8px; }
        .mk-header .mk-btn-sm { margin-left: 0; }

        .mk-crumbs { font-size: 13px; color: var(--ink-muted); margin-bottom: 16px; }
        .mk-crumbs a { color: var(--ink-muted); }
        .mk-crumbs a:hover { color: var(--brand); }

        .mk-kicker {
          display: inline-block; font-size: 12px; font-weight: 700; letter-spacing: .08em; text-transform: uppercase;
          color: var(--brand-ink); background: var(--brand-soft); padding: 4px 12px; border-radius: 999px; margin-bottom: 14px;
        }
        .mk-hero { padding-block: 48px 40px; }
        .mk-hero-grid { display: grid; grid-template-columns: minmax(0, 1.1fr) minmax(0, .9fr); gap: 48px; align-items: center; }
        .mk-hero h1 { font-size: clamp(2rem, 4.4vw, 3rem); font-weight: 800; letter-spacing: -.02em; margin: 0 0 16px; }
        .mk-lead { font-size: 1.1rem; color: var(--ink-muted); margin: 0 0 28px; max-width: 58ch; }
        .mk-actions { display: flex; flex-wrap: wrap; gap: 12px; }

        .mk-section { padding-block: 48px; border-top: 1px solid var(--line); }
        .mk-section > .mk-wrap > h2, .mk-section > .mk-narrow > h2 { font-size: clamp(1.5rem, 3vw, 2rem); font-weight: 800; margin: 0 0 8px; }
        .mk-section-sub { color: var(--ink-muted); margin: 0 0 28px; max-width: 62ch; }

        .mk-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(240px, 1fr)); gap: 16px; }
        .mk-card {
          background: var(--surface-raised); border: 1px solid var(--line); border-radius: 14px; padding: 20px;
        }
        .mk-card h3 { font-size: 1.05rem; font-weight: 700; margin: 0 0 6px; }
        .mk-card p { margin: 0; color: var(--ink-muted); font-size: 15px; }
        a.mk-card { text-decoration: none; transition: border-color .15s; }
        a.mk-card:hover { border-color: var(--brand); }

        .mk-chat {
          background: var(--brand-soft); border-radius: 20px; padding: 20px;
          display: flex; flex-direction: column; gap: 10px;
        }
        .mk-chat-title { font-size: 12px; font-weight: 700; letter-spacing: .06em; text-transform: uppercase; color: var(--brand-ink); margin-bottom: 4px; }
        .mk-bubble { max-width: 85%; padding: 10px 14px; border-radius: 16px; font-size: 15px; line-height: 1.45; }
        .mk-bubble.in { align-self: flex-start; background: var(--surface-raised); color: var(--ink); border-bottom-left-radius: 4px; }
        .mk-bubble.out { align-self: flex-end; background: var(--brand); color: var(--on-brand); border-bottom-right-radius: 4px; }

        .mk-faq { display: flex; flex-direction: column; gap: 10px; }
        .mk-faq details {
          background: var(--surface-raised); border: 1px solid var(--line); border-radius: 12px; padding: 14px 18px;
        }
        .mk-faq summary { cursor: pointer; font-weight: 700; list-style-position: outside; }
        .mk-faq details p { margin: 10px 0 0; color: var(--ink-muted); }
        .mk-faq-group { margin: 32px 0 12px; font-size: 1.2rem; font-weight: 800; }

        .mk-cta {
          margin-block: 16px 56px; padding: 36px 28px; border-radius: 20px; text-align: center;
          background: var(--surface-inverse); color: var(--ink-inverse);
        }
        .mk-cta h2 { font-size: clamp(1.4rem, 3vw, 1.9rem); font-weight: 800; margin: 0 0 8px; color: var(--ink-inverse); }
        .mk-cta p { margin: 0 0 22px; opacity: .8; }

        .mk-prose { font-size: 17px; line-height: 1.75; }
        .mk-prose h2 { font-size: 1.5rem; font-weight: 800; margin: 40px 0 12px; }
        .mk-prose p { margin: 0 0 16px; }
        .mk-prose ul { list-style: disc; padding-left: 24px; margin: 0 0 18px; display: flex; flex-direction: column; gap: 8px; }
        .mk-prose a { color: var(--brand); }
        .mk-meta { color: var(--ink-muted); font-size: 14px; margin: 0 0 28px; }

        .mk-footer { border-top: 1px solid var(--line); background: var(--surface-sunken); }
        .mk-footer-inner {
          max-width: 1080px; margin: 0 auto; padding: 36px 20px 48px;
          display: grid; grid-template-columns: repeat(auto-fit, minmax(180px, 1fr)); gap: 24px; font-size: 14px;
        }
        .mk-footer h2 { font-family: inherit; font-size: 12px; font-weight: 700; letter-spacing: .06em; text-transform: uppercase; color: var(--ink-muted); margin: 0 0 10px; }
        .mk-footer-inner > div { display: flex; flex-direction: column; gap: 6px; }
        .mk-footer a { color: var(--ink); text-decoration: none; }
        .mk-footer a:hover { color: var(--brand); }
        .mk-footer p { color: var(--ink-muted); margin: 6px 0 0; }

        @media (max-width: 860px) {
          .mk-nav { display: none; }
          .mk-header .mk-btn-sm { margin-left: auto; }
          .mk-hero-grid { grid-template-columns: 1fr; gap: 32px; }
          .mk-hero { padding-block: 32px; }
          .mk-section { padding-block: 36px; }
        }
      `}</style>
    </div>
  )
}
