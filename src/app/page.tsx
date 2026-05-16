import { Suspense } from 'react';
import { LocalApp } from '@/components/local/local-app';

export default function HomePage() {
  return (
    <Suspense fallback={null}>
      <LocalApp />
    </Suspense>
  );
}
