import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'Wekitlist',
  description: '같이 쓰는 초경량 공유 버킷리스트',
  manifest: '/manifest.webmanifest',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ko">
      <body>{children}</body>
    </html>
  );
}
