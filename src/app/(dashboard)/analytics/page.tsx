import type { Metadata } from "next";
import { Analytics } from "@/components/analytics";

export const metadata: Metadata = { title: "Analisis — Finori" };

// The client-side auth provider renders this page only after restoring the session.
export const instant = false;

export default function AnalyticsPage() {
  return <Analytics />;
}
