import type { Metadata } from "next";
import { AccountsList } from "@/components/accounts";

export const metadata: Metadata = { title: "Rekening & Dompet — Finori" };

// The client-side auth provider renders this page only after restoring the session.
export const instant = false;

export default function AccountsPage() {
  return <AccountsList />;
}
