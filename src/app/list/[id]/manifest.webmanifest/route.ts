import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const startUrl = `/list/${id}`;

  return NextResponse.json(
    {
      name: 'Wekitlist',
      short_name: 'Wekitlist',
      description: '같이 쓰는 초경량 공유 버킷리스트',
      lang: 'ko',
      dir: 'ltr',
      display: 'standalone',
      display_override: ['standalone', 'minimal-ui'],
      orientation: 'portrait',
      background_color: '#ffffff',
      theme_color: '#ffffff',
      start_url: startUrl,
      scope: '/',
      categories: ['productivity', 'lifestyle'],
      icons: [
        { src: '/icon.svg', type: 'image/svg+xml', sizes: 'any', purpose: 'any' },
        { src: '/icon-maskable.svg', type: 'image/svg+xml', sizes: 'any', purpose: 'maskable' },
        { src: '/apple-touch-icon.svg', type: 'image/svg+xml', sizes: '180x180', purpose: 'any' },
      ],
    },
    {
      headers: {
        'Content-Type': 'application/manifest+json',
        'Cache-Control': 'public, max-age=0, must-revalidate',
      },
    },
  );
}
