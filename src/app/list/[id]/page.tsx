import { notFound } from 'next/navigation';
import { SharedListPage } from '@/components/local/shared-list-page';

export default async function ListRoute({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  if (!id) {
    notFound();
  }

  return <SharedListPage listId={id} />;
}
