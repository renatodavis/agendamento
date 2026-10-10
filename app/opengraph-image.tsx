import { ImageResponse } from 'next/og'

export const alt = 'AgendaAgentic — agendamento pelo WhatsApp com IA'
export const size = { width: 1200, height: 630 }
export const contentType = 'image/png'

const BRAND = '#0e5b57'
const BRAND_SOFT = '#dcefec'
const INK = '#111817'
const INK_MUTED = '#55605e'
const SURFACE = '#f7f6f2'

function Bubble({ side, children }: { side: 'in' | 'out'; children: string }) {
  const out = side === 'out'
  return (
    <div style={{ display: 'flex', justifyContent: out ? 'flex-end' : 'flex-start' }}>
      <div style={{
        maxWidth: 360, padding: '14px 18px', borderRadius: 18, fontSize: 22, lineHeight: 1.35,
        background: out ? BRAND : '#ffffff', color: out ? '#ffffff' : INK,
        boxShadow: '0 2px 6px rgba(17,24,23,.08)',
      }}>
        {children}
      </div>
    </div>
  )
}

export default function Image() {
  return new ImageResponse(
    (
      <div style={{ width: '100%', height: '100%', display: 'flex', background: SURFACE, padding: 64, gap: 56 }}>
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
            <div style={{
              width: 56, height: 56, borderRadius: 14, background: BRAND, color: '#fff',
              display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 40, fontWeight: 700,
            }}>+</div>
            <div style={{ display: 'flex', fontSize: 36, fontWeight: 700, color: INK }}>
              Agenda<span style={{ color: BRAND }}>Agentic</span>
            </div>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
            <div style={{ fontSize: 64, fontWeight: 800, lineHeight: 1.05, color: INK, letterSpacing: -1.5 }}>
              Agendamentos que acontecem sozinhos
            </div>
            <div style={{ fontSize: 28, lineHeight: 1.35, color: INK_MUTED }}>
              IA que agenda pelo WhatsApp 24h para clínicas, consultórios e negócios de serviço.
            </div>
          </div>

          <div style={{ display: 'flex', fontSize: 22, color: BRAND, fontWeight: 700 }}>
            agendaagentic.app
          </div>
        </div>

        <div style={{
          width: 430, display: 'flex', flexDirection: 'column', justifyContent: 'center', gap: 14,
          background: BRAND_SOFT, borderRadius: 28, padding: 28,
        }}>
          <Bubble side="out">Oi, tem horário amanhã?</Bubble>
          <Bubble side="in">Tenho 10h, 14h30 ou 16h. Qual prefere?</Bubble>
          <Bubble side="out">10h</Bubble>
          <Bubble side="in">Pronto! Confirmado para amanhã às 10h.</Bubble>
        </div>
      </div>
    ),
    { ...size },
  )
}
