import type { Metadata } from "next";
import { DriveSettings } from "@/components/drive-settings";
export const metadata: Metadata = { title: "Penyimpanan — Finori" };
export const instant = false;
export default function StoragePage() {
  return <DriveSettings />;
}
