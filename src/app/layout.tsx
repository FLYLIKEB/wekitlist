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
        <div className="min-h-screen">
          {children}
          <footer className="px-6 pb-[calc(env(safe-area-inset-bottom)+20px)] pt-12">
            <div className="mx-auto flex max-w-xl justify-center border-t border-neutral-200/80 pt-5">
              <Link
                href="/about"
                className="rounded-full border border-neutral-200 bg-white px-4 py-2 text-xs text-neutral-500 shadow-sm transition hover:text-neutral-900"
              >
                서비스 소개
              </Link>
            </div>
          </footer>
          <InstallPrompt />
        </div>
      </body>
    </html>
  );
}
