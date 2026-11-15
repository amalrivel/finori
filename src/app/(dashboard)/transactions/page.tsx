import { Transactions } from "@/components/transactions";

// The client-side auth provider renders this page only after restoring the session.
export const instant = false;

export default function TransactionsPage() {
  return <Transactions />;
}
