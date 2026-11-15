import { ImageResponse } from 'next/og';
import { readFile } from 'node:fs/promises';
import { join } from 'node:path';

export const alt = 'Kids4Safe: control parental para cuidar a tus hijos.';
export const size = { width: 1200, height: 630 };
export const contentType = 'image/png';

export default async function SocialImage() {
  const [font, shield, landscape] = await Promise.all([
    readFile(
      join(
        process.cwd(),
        'src/features/landing/assets/fonts/PlusJakartaSans-Bold.ttf',
      ),
    ),
    readFile(join(process.cwd(), 'public/brand/favicon.png')),
    readFile(join(process.cwd(), 'public/brand/family-landscape.png')),
  ]);

  return new ImageResponse(
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        width: '100%',
        height: '100%',
        background: '#F1F8FF',
        color: '#0B2454',
        fontFamily: 'Jakarta',
        padding: '52px 64px',
        position: 'relative',
      }}
    >
      {/* ImageResponse renders these embedded images directly; no remote requests. */}
      {/* eslint-disable @next/next/no-img-element */}
      <img
        src={`data:image/png;base64,${landscape.toString('base64')}`}
        alt=""
        width={1200}
        height={400}
        style={{ position: 'absolute', bottom: 0, left: 0, objectFit: 'cover' }}
      />
      <div
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          width: '100%',
          height: '100%',
          background:
            'linear-gradient(180deg, rgba(241,248,255,1) 0%, rgba(241,248,255,1) 45%, rgba(241,248,255,0) 78%)',
        }}
      />
      <div
        style={{ display: 'flex', alignItems: 'center', gap: 14, fontSize: 38 }}
      >
        <img
          src={`data:image/png;base64,${shield.toString('base64')}`}
          alt=""
          width={55}
          height={55}
        />
        <span style={{ display: 'flex' }}>
          Kids<span style={{ color: '#20B9BE' }}>4</span>Safe
        </span>
      </div>
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          marginTop: 34,
          fontSize: 68,
          lineHeight: 1.1,
          letterSpacing: -3,
        }}
      >
        <span>Control parental</span>
        <span style={{ color: '#1265C8' }}>para cuidar a tus hijos.</span>
      </div>
      <div style={{ display: 'flex', marginTop: 26, fontSize: 23 }}>
        Ubicación compartida · Auxilio · Protección familiar
      </div>
      <div
        style={{
          display: 'flex',
          position: 'absolute',
          bottom: 40,
          left: 64,
          background: '#FFFFFF',
          borderRadius: 30,
          padding: '13px 24px',
          fontSize: 22,
        }}
      >
        kids4safe.io
      </div>
    </div>,
    {
      ...size,
      fonts: [{ name: 'Jakarta', data: font, weight: 700, style: 'normal' }],
    },
  );
}
