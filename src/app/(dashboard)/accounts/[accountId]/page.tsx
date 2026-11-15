import { AccountDetails } from "@/components/accounts";

// The client-side auth provider renders this page only after restoring the session.
export const instant = false;

export default async function AccountPage({
  params,
}: {
  params: Promise<{ accountId: string }>;
}) {
  const { accountId } = await params;
  return <AccountDetails accountId={accountId} />;
}
