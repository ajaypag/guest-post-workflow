import { ImageResponse } from 'next/og';

export const runtime = 'edge';

export const alt = 'Linkio - Advanced Link Building & SEO Platform';
export const size = {
  width: 1200,
  height: 630,
};
export const contentType = 'image/png';

export default async function Image() {
  return new ImageResponse(
    (
      <div
        style={{
          fontSize: 48,
          background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
          width: '100%',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          color: 'white',
          padding: '40px',
        }}
      >
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '20px',
          }}
        >
          <h1
            style={{
              fontSize: '72px',
              fontWeight: 'bold',
              margin: 0,
              textAlign: 'center',
              lineHeight: 1.2,
            }}
          >
            Linkio
          </h1>
          <p
            style={{
              fontSize: '32px',
              margin: 0,
              textAlign: 'center',
              opacity: 0.95,
              maxWidth: '900px',
              lineHeight: 1.4,
            }}
          >
            Advanced Link Building & SEO Platform
          </p>
          <p
            style={{
              fontSize: '24px',
              margin: 0,
              marginTop: '20px',
              textAlign: 'center',
              opacity: 0.9,
              maxWidth: '800px',
            }}
          >
            Master the AI Citation Era with Smart Link Building Tools
          </p>
        </div>
      </div>
    ),
    {
      ...size,
    }
  );
}