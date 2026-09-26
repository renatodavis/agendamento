'use client'
import { useEffect } from 'react'

export default function LandingPage() {
  useEffect(() => {
    // Intersection observer for card entrance animations
    const targets = document.querySelectorAll<HTMLElement>('.aa-card-anim')
    const io = new IntersectionObserver(entries => {
      entries.forEach(e => {
        if (e.isIntersecting) {
          ;(e.target as HTMLElement).style.opacity = '1'
          ;(e.target as HTMLElement).style.transform = 'translateY(0)'
          io.unobserve(e.target)
        }
      })
    }, { threshold: 0.12 })
    targets.forEach((el, i) => {
      el.style.opacity = '0'
      el.style.transform = 'translateY(14px)'
      el.style.transition = `opacity .4s ease ${(i % 6) * 70}ms, transform .4s ease ${(i % 6) * 70}ms, border-color .2s, box-shadow .2s, background .2s`
      io.observe(el)
    })
    return () => io.disconnect()
  }, [])

  function scrollTo(id: string) {
    document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }

  return (
    <>
      <style>{`
        /* ── TOKENS ─────────────────────────────── */
        .aa-root {
          --bg:         #F0F4FA;
          --surface:    #FFFFFF;
          --text:       #0F1629;
          --text2:      #5A6680;
          --accent:     #25D366;
          --accent-dim: #1aae53;
          --accent-bg:  #E6F9EE;
          --border:     #DDE4F0;
          --hero:       #080D18;
          --hero-s:     #0F1829;
          --hero-t:     #DDE8FF;
          --hero-t2:    #7B8FB5;
          font-family: var(--font-dm-sans, 'DM Sans', system-ui, sans-serif);
          color: var(--text);
          background: var(--bg);
        }
        @media (prefers-color-scheme: dark) {
          .aa-root:not([data-theme="light"]) {
            --bg:        #080D18;
            --surface:   #0F1829;
            --text:      #DDE8FF;
            --text2:     #7B8FB5;
            --border:    #1B2540;
            --accent-bg: #0D2920;
          }
        }
        [data-theme="dark"] .aa-root {
          --bg:        #080D18;
          --surface:   #0F1829;
          --text:      #DDE8FF;
          --text2:     #7B8FB5;
          --border:    #1B2540;
          --accent-bg: #0D2920;
        }

        /* ── BASE ────────────────────────────────── */
        .aa-root *, .aa-root *::before, .aa-root *::after { box-sizing: border-box; }
        .aa-root { line-height: 1.65; overflow-x: hidden; }
        .aa-root h1,.aa-root h2,.aa-root h3,.aa-root h4 {
          font-family: var(--font-outfit, 'Outfit', sans-serif);
          line-height: 1.2; text-wrap: balance;
        }
        .aa-root a { color: inherit; text-decoration: none; }
        .aa-wrap { max-width: 1100px; margin: 0 auto; padding-inline: 20px; }

        /* ── NAV ──────────────────────────────────── */
        .aa-nav {
          position: sticky; top: 0;
          background: rgba(8,13,24,.94);
          backdrop-filter: blur(14px);
          -webkit-backdrop-filter: blur(14px);
          border-bottom: 1px solid rgba(255,255,255,.07);
          z-index: 100; padding-inline: 20px;
        }
        .aa-nav-inner {
          max-width: 1100px; margin: 0 auto;
          display: flex; align-items: center;
          justify-content: space-between; height: 60px; gap: 16px;
        }
        .aa-logo {
          font-family: var(--font-outfit, 'Outfit', sans-serif);
          font-weight: 800; font-size: 1.2rem; color: #fff;
        }
        .aa-logo span { color: var(--accent); }
        .aa-nav-links { display: flex; gap: 28px; list-style: none; padding: 0; margin: 0; }
        .aa-nav-links a { color: var(--hero-t2); font-size: .88rem; font-weight: 500; transition: color .2s; }
        .aa-nav-links a:hover { color: #fff; }
        .aa-nav-cta {
          background: var(--accent); color: #fff; font-weight: 600;
          font-size: .875rem; padding: 9px 20px; border-radius: 8px;
          transition: background .2s, transform .15s; white-space: nowrap; cursor: pointer;
        }
        .aa-nav-cta:hover { background: var(--accent-dim); transform: translateY(-1px); }
        @media (max-width: 620px) { .aa-nav-links { display: none; } }

        /* ── HERO ─────────────────────────────────── */
        .aa-hero {
          background: var(--hero); padding: 80px 20px 100px;
          position: relative; overflow: hidden;
        }
        .aa-hero::before {
          content: ''; position: absolute; inset: 0;
          background: radial-gradient(ellipse 65% 55% at 72% 40%, rgba(37,211,102,.08), transparent);
          pointer-events: none;
        }
        .aa-hero-grid {
          max-width: 1100px; margin: 0 auto;
          display: grid; grid-template-columns: 1fr 1fr;
          gap: 56px; align-items: center;
        }
        @media (max-width: 800px) { .aa-hero-grid { grid-template-columns: 1fr; gap: 48px; } }
        .aa-pill {
          display: inline-flex; align-items: center; gap: 7px;
          background: rgba(37,211,102,.1); border: 1px solid rgba(37,211,102,.25);
          color: var(--accent); font-size: .76rem; font-weight: 600;
          letter-spacing: .05em; text-transform: uppercase;
          padding: 5px 12px; border-radius: 100px; margin-bottom: 20px;
        }
        .aa-hero h1 {
          font-size: clamp(2.1rem, 5vw, 3.4rem); font-weight: 800;
          color: var(--hero-t); margin-bottom: 20px; letter-spacing: -.025em;
        }
        .aa-hero h1 em { font-style: normal; color: var(--accent); }
        .aa-hero-sub {
          font-size: 1.05rem; color: var(--hero-t2); max-width: 460px;
          margin-bottom: 36px; line-height: 1.75;
        }
        .aa-actions { display: flex; gap: 12px; flex-wrap: wrap; }
        .aa-btn {
          font-weight: 600; font-size: .95rem; padding: 13px 28px;
          border-radius: 10px; border: none; cursor: pointer;
          font-family: inherit; transition: background .2s, transform .15s, box-shadow .2s;
        }
        .aa-btn-primary { background: var(--accent); color: #fff; }
        .aa-btn-primary:hover {
          background: var(--accent-dim); transform: translateY(-2px);
          box-shadow: 0 8px 24px rgba(37,211,102,.28);
        }
        .aa-btn-ghost {
          color: var(--hero-t2); background: transparent;
          border: 1px solid rgba(255,255,255,.12);
          transition: border-color .2s, color .2s;
        }
        .aa-btn-ghost:hover { border-color: rgba(255,255,255,.3); color: #fff; }

        /* ── CHAT MOCKUP ──────────────────────────── */
        .aa-chat-wrap { display: flex; justify-content: center; }
        .aa-phone {
          width: 100%; max-width: 320px; background: #111b21;
          border-radius: 22px; overflow: hidden;
          box-shadow: 0 28px 72px rgba(0,0,0,.6), 0 0 0 1px rgba(255,255,255,.07);
        }
        .aa-topbar {
          background: #1f2c34; padding: 14px 16px;
          display: flex; align-items: center; gap: 10px;
        }
        .aa-avatar {
          width: 36px; height: 36px; border-radius: 50%;
          background: var(--accent); display: flex; align-items: center;
          justify-content: center; font-size: 1rem; flex-shrink: 0;
        }
        .aa-pname { color: #e9edef; font-size: .9rem; font-weight: 600; }
        .aa-pstatus { color: #8696a0; font-size: .7rem; }
        .aa-chat-body {
          background: #0b141a; padding: 14px 10px;
          display: flex; flex-direction: column; gap: 6px; min-height: 320px;
        }
        .aa-msg { display: flex; flex-direction: column; max-width: 84%; opacity: 0; animation: aaFadeUp .35s ease forwards; }
        .aa-msg.aa-out { align-self: flex-end; }
        .aa-msg.aa-in  { align-self: flex-start; }
        .aa-bubble { padding: 7px 11px 5px; border-radius: 8px; font-size: .79rem; line-height: 1.45; }
        .aa-out .aa-bubble { background: #005c4b; color: #e9edef; border-top-right-radius: 2px; }
        .aa-in  .aa-bubble { background: #202c33; color: #e9edef; border-top-left-radius: 2px; }
        .aa-time { font-size: .62rem; color: #8696a0; margin-top: 1px; align-self: flex-end; padding-inline: 2px; }
        .aa-check { color: #53bdeb; }
        .aa-confirm {
          background: #1f2c34; border-radius: 10px; padding: 10px 14px;
          align-self: flex-start; max-width: 88%; border-left: 3px solid var(--accent);
          opacity: 0; animation: aaFadeUp .35s ease forwards;
        }
        .aa-cc-label { font-size: .63rem; color: var(--accent); font-weight: 600; letter-spacing: .05em; text-transform: uppercase; margin-bottom: 7px; }
        .aa-cc-row { font-size: .77rem; color: #e9edef; display: flex; gap: 7px; align-items: center; margin-bottom: 3px; }
        .aa-cc-icon { color: var(--accent); }
        @keyframes aaFadeUp { from { opacity: 0; transform: translateY(7px); } to { opacity: 1; transform: translateY(0); } }
        .aa-msg:nth-child(1) { animation-delay: .4s; }
        .aa-msg:nth-child(2) { animation-delay: 1.1s; }
        .aa-msg:nth-child(3) { animation-delay: 1.9s; }
        .aa-msg:nth-child(4) { animation-delay: 2.6s; }
        .aa-confirm          { animation-delay: 3.2s; }

        /* ── STATS ────────────────────────────────── */
        .aa-stats {
          background: var(--accent-bg);
          border-top: 1px solid rgba(37,211,102,.2);
          border-bottom: 1px solid rgba(37,211,102,.2);
          padding: 40px 20px;
        }
        .aa-stats-grid {
          max-width: 740px; margin: 0 auto;
          display: grid; grid-template-columns: repeat(3,1fr); gap: 20px; text-align: center;
        }
        @media (max-width: 480px) { .aa-stats-grid { grid-template-columns: 1fr; gap: 28px; } }
        .aa-stat-val {
          font-family: var(--font-outfit, 'Outfit', sans-serif);
          font-size: 2.1rem; font-weight: 800; color: var(--accent-dim);
          font-variant-numeric: tabular-nums; letter-spacing: -.02em;
        }
        .aa-stat-label { font-size: .82rem; color: var(--text2); margin-top: 3px; }

        /* ── SECTIONS ─────────────────────────────── */
        .aa-section { padding: 80px 20px; }
        .aa-section-light  { background: var(--surface); }
        .aa-section-tinted { background: var(--bg); }
        .aa-section-dark   { background: var(--hero); }
        .aa-section-head { text-align: center; margin-bottom: 52px; }
        .aa-eyebrow { font-size: .76rem; font-weight: 600; letter-spacing: .08em; text-transform: uppercase; color: var(--accent); margin-bottom: 12px; }
        .aa-section-head h2 { font-size: clamp(1.75rem,4vw,2.4rem); font-weight: 700; color: var(--text); margin-bottom: 14px; }
        .aa-section-head p  { font-size: .98rem; color: var(--text2); max-width: 500px; margin: 0 auto; }
        .aa-dark-h2 { color: var(--hero-t) !important; }
        .aa-dark-p  { color: var(--hero-t2) !important; }

        /* ── STEPS ────────────────────────────────── */
        .aa-steps { display: grid; grid-template-columns: repeat(3,1fr); gap: 28px; position: relative; }
        @media (max-width: 620px) { .aa-steps { grid-template-columns: 1fr; } }
        .aa-steps::before {
          content: ''; position: absolute; top: 27px; left: 20%; right: 20%;
          height: 1px; background: linear-gradient(90deg, transparent, var(--accent), transparent); opacity: .4;
        }
        @media (max-width: 620px) { .aa-steps::before { display: none; } }
        .aa-step { text-align: center; padding: 20px; }
        .aa-step-num {
          width: 54px; height: 54px; border-radius: 50%;
          background: var(--accent-bg); border: 2px solid var(--accent);
          color: var(--accent); font-family: var(--font-outfit, 'Outfit', sans-serif);
          font-weight: 800; font-size: 1.15rem;
          display: flex; align-items: center; justify-content: center; margin: 0 auto 16px;
        }
        .aa-step h3 { font-size: .98rem; font-weight: 700; margin-bottom: 8px; color: var(--text); }
        .aa-step p  { font-size: .86rem; color: var(--text2); line-height: 1.6; }

        /* ── FEATURES ─────────────────────────────── */
        .aa-features { display: grid; grid-template-columns: repeat(3,1fr); gap: 18px; }
        @media (max-width: 820px) { .aa-features { grid-template-columns: repeat(2,1fr); } }
        @media (max-width: 500px)  { .aa-features { grid-template-columns: 1fr; } }
        .aa-feat {
          background: var(--surface); border: 1px solid var(--border);
          border-radius: 16px; padding: 22px;
        }
        .aa-feat:hover { border-color: var(--accent); box-shadow: 0 4px 20px rgba(37,211,102,.1); transform: translateY(-2px); }
        .aa-feat-icon {
          width: 42px; height: 42px; background: var(--accent-bg);
          border-radius: 10px; display: flex; align-items: center;
          justify-content: center; margin-bottom: 14px;
        }
        .aa-feat-icon svg { width: 20px; height: 20px; stroke: var(--accent); fill: none; stroke-width: 2; stroke-linecap: round; stroke-linejoin: round; }
        .aa-feat h3 { font-size: .95rem; font-weight: 700; margin-bottom: 7px; color: var(--text); }
        .aa-feat p  { font-size: .84rem; color: var(--text2); line-height: 1.6; }

        /* ── DOMAINS ──────────────────────────────── */
        .aa-domains { display: grid; grid-template-columns: repeat(3,1fr); gap: 14px; max-width: 760px; margin: 0 auto; }
        @media (max-width: 580px) { .aa-domains { grid-template-columns: repeat(2,1fr); } }
        .aa-domain {
          background: var(--hero-s); border: 1px solid rgba(255,255,255,.07);
          border-radius: 14px; padding: 20px 14px; text-align: center; cursor: default;
          transition: border-color .2s, background .2s;
        }
        .aa-domain:hover { border-color: rgba(37,211,102,.35); background: rgba(37,211,102,.05); }
        .aa-domain-emoji { font-size: 1.75rem; margin-bottom: 9px; line-height: 1; }
        .aa-domain-name  { color: var(--hero-t); font-size: .88rem; font-weight: 600; margin-bottom: 3px; }
        .aa-domain-desc  { color: var(--hero-t2); font-size: .73rem; }

        /* ── CTA ──────────────────────────────────── */
        .aa-cta { background: var(--hero); padding: 100px 20px; text-align: center; position: relative; overflow: hidden; }
        .aa-cta::before {
          content: ''; position: absolute; inset: 0;
          background: radial-gradient(ellipse 50% 60% at 50% 50%, rgba(37,211,102,.09), transparent);
          pointer-events: none;
        }
        .aa-cta h2 { font-size: clamp(1.75rem,4vw,2.7rem); font-weight: 800; color: var(--hero-t); margin-bottom: 16px; position: relative; }
        .aa-cta p  { color: var(--hero-t2); font-size: 1rem; max-width: 460px; margin: 0 auto 36px; position: relative; }
        .aa-cta-actions { display: flex; gap: 12px; justify-content: center; flex-wrap: wrap; position: relative; }
        .aa-cta-note { color: var(--accent); margin-top: 16px; font-size: .88rem; position: relative; }

        /* ── FOOTER ───────────────────────────────── */
        .aa-footer {
          background: #04070F; padding: 30px 20px; text-align: center;
          border-top: 1px solid rgba(255,255,255,.05);
        }
        .aa-footer-logo { font-family: var(--font-outfit, 'Outfit', sans-serif); font-weight: 800; font-size: .98rem; color: #fff; margin-bottom: 6px; }
        .aa-footer-logo span { color: var(--accent); }
        .aa-footer p { color: #4a5568; font-size: .78rem; }
      `}</style>

      <div className="aa-root">
        {/* NAV */}
        <nav className="aa-nav">
          <div className="aa-nav-inner">
            <div className="aa-logo">Agenda<span>Agentic</span></div>
            <ul className="aa-nav-links">
              <li><a href="#como-funciona" onClick={e => { e.preventDefault(); scrollTo('como-funciona') }}>Como funciona</a></li>
              <li><a href="#funcionalidades" onClick={e => { e.preventDefault(); scrollTo('funcionalidades') }}>Funcionalidades</a></li>
              <li><a href="#negocios" onClick={e => { e.preventDefault(); scrollTo('negocios') }}>Negócios</a></li>
            </ul>
            <button className="aa-nav-cta" onClick={() => scrollTo('cta')}>Começar agora</button>
          </div>
        </nav>

        {/* HERO */}
        <section className="aa-hero">
          <div className="aa-hero-grid">
            <div>
              <div className="aa-pill">
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z"/></svg>
                Agendamento via WhatsApp com IA
              </div>
              <h1>Agendamentos que <em>acontecem sozinhos</em></h1>
              <p className="aa-hero-sub">Seu cliente manda uma mensagem. A IA entende, verifica a agenda, confirma e avisa. Você só precisa aparecer para atender.</p>
              <div className="aa-actions">
                <button className="aa-btn aa-btn-primary" onClick={() => scrollTo('cta')}>Começar agora</button>
                <button className="aa-btn aa-btn-ghost" onClick={() => scrollTo('como-funciona')}>Ver como funciona</button>
              </div>
            </div>

            <div className="aa-chat-wrap">
              <div className="aa-phone">
                <div className="aa-topbar">
                  <div className="aa-avatar">🏥</div>
                  <div>
                    <div className="aa-pname">Assistente da Clínica</div>
                    <div className="aa-pstatus">online agora</div>
                  </div>
                </div>
                <div className="aa-chat-body">
                  <div className="aa-msg aa-out">
                    <div className="aa-bubble">Oi, preciso marcar com o Dr. Silva</div>
                    <div className="aa-time">09:41 <span className="aa-check">✓✓</span></div>
                  </div>
                  <div className="aa-msg aa-in">
                    <div className="aa-bubble">Olá! Temos horários disponíveis para o Dr. Silva amanhã: 10h, 14h30 ou 16h. Qual prefere?</div>
                    <div className="aa-time">09:41</div>
                  </div>
                  <div className="aa-msg aa-out">
                    <div className="aa-bubble">10h tá ótimo 👍</div>
                    <div className="aa-time">09:42 <span className="aa-check">✓✓</span></div>
                  </div>
                  <div className="aa-msg aa-in">
                    <div className="aa-bubble">Perfeito, confirmando sua consulta...</div>
                    <div className="aa-time">09:42</div>
                  </div>
                  <div className="aa-confirm">
                    <div className="aa-cc-label">✅ Consulta confirmada</div>
                    <div className="aa-cc-row"><span className="aa-cc-icon">👨‍⚕️</span> Dr. Silva — Clínico Geral</div>
                    <div className="aa-cc-row"><span className="aa-cc-icon">📅</span> Amanhã, 10h00</div>
                    <div className="aa-cc-row"><span className="aa-cc-icon">📍</span> AgendaAgentic</div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* STATS */}
        <div className="aa-stats">
          <div className="aa-stats-grid">
            <div><div className="aa-stat-val">24/7</div><div className="aa-stat-label">Atendimento automático</div></div>
            <div><div className="aa-stat-val">&lt;30s</div><div className="aa-stat-label">Para confirmar um horário</div></div>
            <div><div className="aa-stat-val">0 fila</div><div className="aa-stat-label">Sem espera no telefone</div></div>
          </div>
        </div>

        {/* COMO FUNCIONA */}
        <section className="aa-section aa-section-light" id="como-funciona">
          <div className="aa-wrap">
            <div className="aa-section-head">
              <div className="aa-eyebrow">Como funciona</div>
              <h2>Três passos. Nenhuma recepcionista.</h2>
              <p>O processo de agendamento inteiro acontece dentro do WhatsApp que o paciente já usa.</p>
            </div>
            <div className="aa-steps">
              <div className="aa-step aa-card-anim">
                <div className="aa-step-num">1</div>
                <h3>Cliente envia mensagem</h3>
                <p>Em linguagem natural pelo WhatsApp. "Quero marcar para sexta" ou "Tem vaga essa semana?"</p>
              </div>
              <div className="aa-step aa-card-anim">
                <div className="aa-step-num">2</div>
                <h3>IA verifica e confirma</h3>
                <p>O assistente consulta a agenda em tempo real, oferece horários disponíveis e processa a confirmação.</p>
              </div>
              <div className="aa-step aa-card-anim">
                <div className="aa-step-num">3</div>
                <h3>Agenda atualizada</h3>
                <p>O cliente recebe confirmação. O profissional vê no dashboard. Lembretes automáticos no dia anterior.</p>
              </div>
            </div>
          </div>
        </section>

        {/* FUNCIONALIDADES */}
        <section className="aa-section aa-section-tinted" id="funcionalidades">
          <div className="aa-wrap">
            <div className="aa-section-head">
              <div className="aa-eyebrow">Funcionalidades</div>
              <h2>Tudo que a recepção faz, em automático</h2>
            </div>
            <div className="aa-features">
              {[
                { icon: <><circle cx="12" cy="12" r="10"/><path d="M12 8v4l3 3"/></>, title: 'Linguagem natural', desc: 'Entende "quinta de manhã" ou "amanhã de tarde" sem menus numerados ou botões de resposta.' },
                { icon: <><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="3" y1="9" x2="21" y2="9"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="16" y1="2" x2="16" y2="6"/></>, title: 'Agenda em tempo real', desc: 'Sincroniza com o dashboard. Nenhum horário é ofertado duas vezes. Bloqueios refletidos instantaneamente.' },
                { icon: <polyline points="20 6 9 17 4 12"/>, title: 'Confirmações e lembretes', desc: 'Confirmação imediata + lembrete automático no dia anterior. Menos faltas, mais previsibilidade.' },
                { icon: <><rect x="2" y="3" width="20" height="14" rx="2"/><polyline points="8 21 12 17 16 21"/></>, title: 'Dashboard de gestão', desc: 'Visão completa da agenda, histórico de conversas, métricas de uso e controle por profissional.' },
                { icon: <><path d="M12 1a3 3 0 00-3 3v8a3 3 0 006 0V4a3 3 0 00-3-3z"/><path d="M19 10v2a7 7 0 01-14 0v-2"/><line x1="12" y1="19" x2="12" y2="23"/><line x1="8" y1="23" x2="16" y2="23"/></>, title: 'Suporte a áudios', desc: 'O assistente transcreve áudios enviados pelo WhatsApp e processa normalmente. Sem atrito para o cliente.' },
                { icon: <><polyline points="1 4 1 10 7 10"/><path d="M3.51 15a9 9 0 102.13-9.36L1 10"/></>, title: 'Reagendamentos inteligentes', desc: 'Se o profissional cancelar o dia, o sistema contata os pacientes e sugere novos horários automaticamente.' },
              ].map(({ icon, title, desc }, i) => (
                <div key={i} className="aa-feat aa-card-anim">
                  <div className="aa-feat-icon"><svg viewBox="0 0 24 24">{icon}</svg></div>
                  <h3>{title}</h3>
                  <p>{desc}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* PARA QUALQUER NEGÓCIO */}
        <section className="aa-section aa-section-dark" id="negocios">
          <div className="aa-wrap">
            <div className="aa-section-head">
              <div className="aa-eyebrow">Para qualquer negócio</div>
              <h2 className="aa-dark-h2">Não é só para clínicas</h2>
              <p className="aa-dark-p">A mesma plataforma se adapta a qualquer serviço que trabalhe com agendamentos via WhatsApp.</p>
            </div>
            <div className="aa-domains">
              {[
                { emoji: '🏥', name: 'Clínicas médicas',   desc: 'Consultas, retornos e triagem' },
                { emoji: '💈', name: 'Barbearias',         desc: 'Cortes, barbas, horários fixos' },
                { emoji: '💅', name: 'Salões de beleza',   desc: 'Serviços por profissional' },
                { emoji: '🦷', name: 'Odontologia',        desc: 'Procedimentos e retornos' },
                { emoji: '🐾', name: 'Veterinárias',       desc: 'Consultas e vacinas' },
                { emoji: '🏋️', name: 'Personal / Academia', desc: 'Sessões e aulas coletivas' },
              ].map(({ emoji, name, desc }, i) => (
                <div key={i} className="aa-domain aa-card-anim">
                  <div className="aa-domain-emoji">{emoji}</div>
                  <div className="aa-domain-name">{name}</div>
                  <div className="aa-domain-desc">{desc}</div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* CTA */}
        <section className="aa-cta" id="cta">
          <h2>Pronto para automatizar seus agendamentos?</h2>
          <p>Configure em minutos. Sem contratos de longo prazo. Cancele quando quiser.</p>
          <div className="aa-cta-actions">
            <a href="/login" className="aa-btn aa-btn-primary" style={{ textDecoration: 'none' }}>Acessar o sistema</a>
          </div>
        </section>

        {/* FOOTER */}
        <footer className="aa-footer">
          <div className="aa-footer-logo">Agenda<span>Agentic</span></div>
          <p>Agendamento inteligente via WhatsApp · Desenvolvido com Claude AI</p>
        </footer>
      </div>
    </>
  )
}
