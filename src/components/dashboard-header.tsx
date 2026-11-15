"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ChevronRight } from "lucide-react";
import { useFinance } from "@/components/finance-provider";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { SidebarTrigger } from "@/components/ui/sidebar";

export function DashboardHeader() {
  const pathname = usePathname();
  const { accounts } = useFinance();
  const isAccount =
    pathname === "/accounts" || pathname.startsWith("/accounts/");
  const title = isAccount
    ? "Rekening & dompet"
    : pathname === "/transactions"
      ? "Transaksi"
      : pathname === "/analytics"
        ? "Analisis"
        : "Ringkasan";
  const account = isAccount
    ? accounts.find((account) => pathname === `/accounts/${account.id}`)
    : undefined;

  return (
    <header className="sticky top-0 z-20 flex h-16 shrink-0 items-center justify-between gap-3 border-b bg-background/95 px-4 backdrop-blur-sm sm:px-6 lg:px-8">
      <div className="flex min-w-0 items-center gap-3">
        <SidebarTrigger aria-label="Buka atau tutup navigasi" />
        <Separator orientation="vertical" className="h-5" />
        <nav
          aria-label="Lokasi halaman"
          className="flex min-w-0 items-center gap-2 text-sm"
        >
          {account ? (
            <>
              <Link
                href="/accounts"
                className="hidden shrink-0 text-muted-foreground hover:text-foreground sm:inline"
              >
                {title}
              </Link>
              <ChevronRight className="hidden size-3 shrink-0 text-muted-foreground sm:block" />
              <span aria-current="page" className="truncate font-medium">
                {account.name}
              </span>
            </>
          ) : (
            <span aria-current="page" className="truncate font-medium">
              {title}
            </span>
          )}
        </nav>
      </div>
      <Badge variant="outline" className="shrink-0">
        Tersimpan
      </Badge>
    </header>
  );
}
