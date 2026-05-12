import { InvitePage } from '@/components/local/invite-page';

export default async function InviteRoute({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;
  return <InvitePage token={token} />;
}
