import Link from 'next/link'
import {
  MessageCircle, CalendarCheck, LayoutDashboard, Clock, CalendarDays, BellRing,
  Mic, RefreshCw, ShieldCheck, Hourglass, CheckCircle2, Settings2,
} from 'lucide-react'
import MarketingShell, { DemoButton } from '@/components/marketing/MarketingShell'
import { NICHE_GROUPS } from '@/lib/niches'
import AuthRedirect from './AuthRedirect'

const STEPS = [
  { Icon: MessageCircle, title: 'O cliente manda mensagem', text: 'Em linguagem natural, pelo WhatsApp do seu negócio: "quero marcar para sexta" ou "tem vaga essa semana?".' },
  { Icon: CalendarCheck, title: 'A IA oferece horários', text: 'O assistente consulta a agenda de cada profissional, oferece os horários livres e pede confirmação.' },
  { Icon: LayoutDashboard, title: 'A agenda se atualiza', text: 'Com o SIM do cliente, o agendamento aparece no painel. Na véspera, ele recebe um lembrete.' },
]

const FEATURES = [
  { Icon: MessageCircle, title: 'Linguagem natural', text: 'Entende "quinta de manhã" ou "amanhã à tarde", sem menus numerados.' },
  { Icon: CalendarDays, title: 'Agenda em tempo real', text: 'Cada profissional com seus serviços, horários e bloqueios. Nenhum horário é oferecido duas vezes.' },
  { Icon: BellRing, title: 'Confirmação e lembrete', text: 'O agendamento só vale com o SIM do cliente, e o lembrete sai na véspera.' },
  { Icon: Hourglass, title: 'Fila de espera', text: 'Horário ocupado? O cliente entra na fila em vez de desistir.' },
  { Icon: Mic, title: 'Entende áudios', text: 'Mensagens de voz são transcritas e respondidas normalmente.' },
  { Icon: RefreshCw, title: 'Remarcação assistida', text: 'Se o profissional bloquear um dia, o sistema ajuda a contatar os clientes e sugerir novos horários.' },
  { Icon: ShieldCheck, title: 'Sua equipe decide as exceções', text: 'Cancelamentos e remarcações chegam ao painel para aprovação com um toque.' },
  { Icon: Settings2, title: 'Fala a língua do seu negócio', text: 'Paciente ou cliente, consulta ou atendimento: o vocabulário se adapta ao seu tipo de negócio.' },
]

const HIGHLIGHTS = [
  { value: '24h', label: 'atendimento no WhatsApp, inclusive à noite e no fim de semana' },
  { value: 'SIM', label: 'o agendamento só entra na agenda com a confirmação do cliente' },
  { value: 'Véspera', label: 'lembrete automático com opção de confirmar ou remarcar' },
]

export default function LandingPage() {
  return (
    <MarketingShell>
      <AuthRedirect />

      <section className="lp-hero">
        <div className="mk-wrap mk-hero-grid">
          <div>
            <h1 className="lp-h1">
              <span className="mk-kicker">Agendamento automático pelo WhatsApp com IA</span>
              <span className="lp-h1-main">Agendamentos que <em>acontecem sozinhos</em></span>
            </h1>
            <p className="mk-lead">
              Para clínicas, salões, barbearias e todo negócio que vive de agenda. Seu cliente manda uma mensagem;
              a IA entende, consulta a agenda, confirma e lembra na véspera. Sua equipe só cuida das exceções.
            </p>
            <div className="mk-actions">
              <DemoButton />
              <a href="#como-funciona" className="mk-btn mk-btn-ghost">Ver como funciona</a>
            </div>
          </div>

          <div className="lp-phone" aria-label="Exemplo de conversa no WhatsApp">
            <div className="lp-phone-top">
              <div className="lp-avatar" aria-hidden="true"><CalendarCheck size={18} /></div>
              <div>
                <div className="lp-phone-name">Assistente de agendamento</div>
                <div className="lp-phone-status">online agora</div>
              </div>
            </div>
            <div className="lp-phone-body">
              <div className="mk-bubble out">Oi! Tem horário amanhã com a Carla?</div>
              <div className="mk-bubble in">Olá! A Carla tem amanhã às 10h, 14h30 ou 16h. Qual prefere?</div>
              <div className="mk-bubble out">10h, pra corte e escova</div>
              <div className="mk-bubble in">Corte e escova com a Carla amanhã às 10h. Responda SIM para confirmar.</div>
              <div className="mk-bubble out">SIM</div>
              <div className="lp-confirm">
                <div className="lp-confirm-title"><CheckCircle2 size={16} /> Agendamento confirmado</div>
                <div>Carla · Corte e escova</div>
                <div>Amanhã, 10h00</div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="lp-highlights" aria-label="Destaques">
        <div className="mk-wrap lp-highlights-grid">
          {HIGHLIGHTS.map(h => (
            <div key={h.value}>
              <div className="lp-hl-value">{h.value}</div>
              <div className="lp-hl-label">{h.label}</div>
            </div>
          ))}
        </div>
      </section>

      <section className="mk-section" id="como-funciona">
        <div className="mk-wrap">
          <h2>Três passos. Sua equipe só cuida das exceções.</h2>
          <p className="mk-section-sub">O agendamento inteiro acontece no WhatsApp que o cliente já usa.</p>
          <ol className="lp-steps">
            {STEPS.map(({ Icon, title, text }, i) => (
              <li key={title} className="mk-card">
                <div className="lp-step-head">
                  <span className="lp-step-num">{i + 1}</span>
                  <Icon size={20} aria-hidden="true" />
                </div>
                <h3>{title}</h3>
                <p>{text}</p>
              </li>
            ))}
          </ol>
        </div>
      </section>

      <section className="mk-section lp-tinted" id="funcionalidades">
        <div className="mk-wrap">
          <h2>Tudo que a recepção faz no WhatsApp, em automático</h2>
          <p className="mk-section-sub">A inteligência artificial conversa com o cliente. A equipe mantém o controle pelo painel.</p>
          <div className="lp-features">
            {FEATURES.map(({ Icon, title, text }) => (
              <div key={title} className="lp-feature">
                <span className="lp-feature-icon" aria-hidden="true"><Icon size={18} /></span>
                <div>
                  <h3>{title}</h3>
                  <p>{text}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="mk-section" id="negocios">
        <div className="mk-wrap">
          <h2>Feito para quem vive de agenda</h2>
          <p className="mk-section-sub">Se o seu negócio atende com hora marcada, o assistente se adapta a ele.</p>
          <div className="mk-grid">
            {NICHE_GROUPS.map(g => (
              <div key={g.title} className="mk-card lp-segment">
                <span className="lp-segment-kicker">{g.title}</span>
                <p>{g.intro}</p>
                <ul className="lp-niche-list">
                  {g.niches.map(n => (
                    <li key={n.name}>
                      {n.href ? <Link href={n.href}>{n.name}</Link> : n.name}
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
          <p className="lp-also">
            <Clock size={15} aria-hidden="true" />
            <span>Seu negócio não está na lista? <Link href="/segmentos">Veja todos os segmentos e quando o assistente se encaixa</Link></span>
          </p>
        </div>
      </section>

      <div className="mk-wrap">
        <div className="mk-cta">
          <h2>Pronto para automatizar seus agendamentos?</h2>
          <p>Implantação acompanhada. Sem contrato de longo prazo. Cancele quando quiser.</p>
          <div className="mk-actions" style={{ justifyContent: 'center' }}>
            <DemoButton />
            <Link href="/perguntas-frequentes" className="mk-btn lp-btn-on-dark">Perguntas frequentes</Link>
          </div>
        </div>
      </div>

      <style>{`
        html { scroll-behavior: smooth; }
        #como-funciona, #funcionalidades, #negocios { scroll-margin-top: 72px; }

        .lp-hero {
          padding-block: 56px 48px;
          background: linear-gradient(180deg, var(--brand-soft) 0%, var(--surface) 85%);
        }
        .lp-h1 { margin: 0 0 18px; font-weight: 800; letter-spacing: -.025em; }
        .lp-h1 .mk-kicker { font-family: var(--font-figtree), system-ui, sans-serif; letter-spacing: .08em; line-height: 1.4; }
        .lp-h1-main { display: block; font-size: clamp(2.3rem, 5.2vw, 3.6rem); line-height: 1.05; }
        .lp-h1-main em { font-style: normal; color: var(--brand); }

        .lp-phone {
          background: var(--surface-raised); border: 1px solid var(--line); border-radius: 28px;
          box-shadow: var(--shadow-pop); overflow: hidden; max-width: 380px; width: 100%; justify-self: center;
        }
        .lp-phone-top {
          display: flex; align-items: center; gap: 12px; padding: 14px 18px;
          background: var(--brand); color: var(--on-brand);
        }
        .lp-avatar {
          width: 36px; height: 36px; border-radius: 50%; display: flex; align-items: center; justify-content: center;
          background: color-mix(in srgb, var(--on-brand) 18%, transparent);
        }
        .lp-phone-name { font-weight: 700; font-size: 15px; line-height: 1.2; }
        .lp-phone-status { font-size: 12px; opacity: .8; }
        .lp-phone-body { padding: 18px; display: flex; flex-direction: column; gap: 10px; background: var(--brand-soft); }
        .lp-confirm {
          align-self: stretch; background: var(--surface-raised); border-radius: 14px; padding: 12px 14px;
          border-left: 4px solid var(--brand); font-size: 14px; color: var(--ink-muted); display: flex; flex-direction: column; gap: 2px;
        }
        .lp-confirm-title { display: flex; align-items: center; gap: 6px; font-weight: 700; color: var(--brand-ink); margin-bottom: 2px; }

        .lp-highlights { border-top: 1px solid var(--line); border-bottom: 1px solid var(--line); background: var(--surface-raised); }
        .lp-highlights-grid { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 24px; padding-block: 24px; }
        .lp-hl-value { font-family: var(--font-bricolage), system-ui, sans-serif; font-size: 1.8rem; font-weight: 800; color: var(--brand); line-height: 1.1; }
        .lp-hl-label { color: var(--ink-muted); font-size: 14px; margin-top: 4px; max-width: 30ch; }

        .lp-steps { list-style: none; padding: 0; margin: 0; display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 16px; }
        .lp-step-head { display: flex; align-items: center; justify-content: space-between; color: var(--brand); margin-bottom: 12px; }
        .lp-step-num {
          width: 30px; height: 30px; border-radius: 50%; display: inline-flex; align-items: center; justify-content: center;
          background: var(--brand); color: var(--on-brand); font-weight: 800; font-size: 14px;
        }

        .lp-tinted { background: var(--surface-sunken); }
        .lp-features { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 12px 32px; }
        .lp-feature { display: flex; gap: 14px; padding: 14px 0; border-bottom: 1px solid var(--line); }
        .lp-feature-icon {
          flex-shrink: 0; width: 36px; height: 36px; border-radius: 10px; display: flex; align-items: center; justify-content: center;
          background: var(--brand-soft); color: var(--brand-ink);
        }
        .lp-feature h3 { font-size: 1rem; font-weight: 700; margin: 0 0 2px; font-family: var(--font-figtree), system-ui, sans-serif; }
        .lp-feature p { margin: 0; color: var(--ink-muted); font-size: 15px; }

        .lp-segment { display: flex; flex-direction: column; gap: 6px; }
        .lp-segment h3 { margin: 0; }
        .lp-segment-kicker { font-size: 11px; font-weight: 700; letter-spacing: .07em; text-transform: uppercase; color: var(--brand-ink); }
        .lp-niche-list { list-style: none; padding: 0; margin: 8px 0 0; display: flex; flex-direction: column; gap: 6px; font-size: 15px; }
        .lp-niche-list li { padding-left: 16px; position: relative; color: var(--ink); }
        .lp-niche-list li::before { content: ''; position: absolute; left: 0; top: .62em; width: 6px; height: 6px; border-radius: 50%; background: var(--brand); }
        .lp-niche-list a { color: var(--brand); font-weight: 600; }
        .lp-also { display: flex; align-items: flex-start; gap: 8px; color: var(--ink-muted); font-size: 15px; margin: 20px 0 0; }
        .lp-also svg:first-child { flex-shrink: 0; margin-top: 4px; }
        .lp-also a { color: var(--brand); font-weight: 600; }

        .lp-btn-on-dark { border: 1px solid color-mix(in srgb, var(--ink-inverse) 40%, transparent); color: var(--ink-inverse) !important; }

        @media (max-width: 860px) {
          .lp-hero { padding-block: 32px; }
          .lp-steps { grid-template-columns: 1fr; }
          .lp-features { grid-template-columns: 1fr; }
          .lp-highlights-grid { grid-template-columns: 1fr; gap: 14px; }
          .lp-hl-label { max-width: none; }
        }
      `}</style>
    </MarketingShell>
  )
}
