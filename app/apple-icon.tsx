import { ImageResponse } from 'next/og'

export const size = { width: 180, height: 180 }
export const contentType = 'image/png'

export default function AppleIcon() {
  return new ImageResponse(
    (
      <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#0e5b57' }}>
        <div style={{ position: 'relative', width: 84, height: 84, display: 'flex' }}>
          <div style={{ position: 'absolute', left: 32, top: 0, width: 20, height: 84, borderRadius: 10, background: '#fff' }} />
          <div style={{ position: 'absolute', left: 0, top: 32, width: 84, height: 20, borderRadius: 10, background: '#fff' }} />
        </div>
      </div>
    ),
    { ...size },
  )
}
