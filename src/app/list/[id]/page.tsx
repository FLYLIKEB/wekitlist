import { notFound } from 'next/navigation';
import type { Metadata } from 'next';
import { SharedListPage } from '@/components/local/shared-list-page';

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  const { id } = await params;
  return {
    manifest: `/list/${id}/manifest.webmanifest`,
  };
}

export default async function ListRoute({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  if (!id) {
    notFound();
  }

  return <SharedListPage listId={id} />;
}
