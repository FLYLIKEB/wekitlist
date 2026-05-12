import type { Metadata, Viewport } from 'next';
import Link from 'next/link';
import { InstallPrompt } from '@/components/local/install-prompt';
import './globals.css';

export const metadata: Metadata = {
  title: 'Wekitlist',
  description: '같이 쓰는 초경량 공유 버킷리스트',
  manifest: '/manifest.webmanifest',
  applicationName: 'Wekitlist',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'default',
    title: 'Wekitlist',
  },
  icons: {
    icon: [
      { url: '/icon.svg', type: 'image/svg+xml' },
    ],
    apple: [
      { url: '/apple-touch-icon.svg', sizes: '180x180', type: 'image/svg+xml' },
    ],
  },
  formatDetection: {
    telephone: false,
  },
};

export const viewport: Viewport = {
  themeColor: '#ffffff',
  width: 'device-width',
  initialScale: 1,
  viewportFit: 'cover',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ko">
      <body>
        <Link
          href="/"
          aria-label="홈으로 이동"
          className="fixed left-3 top-3 z-30 text-xs font-semibold tracking-tight text-neutral-500 transition hover:text-neutral-900"
        >
          Wekitlist
        </Link>
        {children}
        <InstallPrompt />
      </body>
    </html>
  );
}
