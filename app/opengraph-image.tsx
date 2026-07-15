// app/opengraph-image.tsx
import { ImageResponse } from 'next/og'

export const size = { width: 1200, height: 630 }
export const contentType = 'image/png'

export default function OpengraphImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          background: '#111827',
        }}
      >
        <div style={{ fontSize: 100, fontWeight: 700, color: 'white' }}>
          Tenisfy
        </div>
        <div style={{ fontSize: 34, color: '#EA580C', marginTop: 20 }}>
          Compara preços de ténis em Portugal
        </div>
      </div>
    ),
    { ...size }
  )
}