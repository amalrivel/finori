"use client";

import Link from "next/link";
import { useState } from "react";
import { useFinance } from "@/components/finance-provider";
import { usePathname } from "next/navigation";
import {
  ArrowLeftRight,
  ChartNoAxesCombined,
  LayoutDashboard,
  Sprout,
  ChartColumn,
  X,
  Wallet,
  HardDrive,
  LogOut,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from "@/components/ui/sidebar";

const navigation = [
  { label: "Ringkasan", icon: LayoutDashboard, href: "/" },
  { label: "Analisis", icon: ChartNoAxesCombined, href: "/analytics" },
  { label: "Transaksi", icon: ArrowLeftRight, href: "/transactions" },
  { label: "Rekening & dompet", icon: Wallet, href: "/accounts" },
  { label: "Penyimpanan", icon: HardDrive, href: "/storage" },
];
const overviewLinks = [
  { label: "Arus kas", icon: ChartNoAxesCombined, href: "/analytics#arus-kas" },
  {
    label: "Pola transaksi",
    icon: ChartColumn,
    href: "/analytics#pola-transaksi",
  },
];

export function AppSidebar() {
  const { setOpenMobile } = useSidebar();
  const pathname = usePathname();
  const { email, signOut } = useFinance();
  const [leaving, setLeaving] = useState(false);
  const [logoutError, setLogoutError] = useState("");
  async function logout() {
    setLeaving(true);
    setLogoutError("");
    try {
      await signOut();
    } catch (cause) {
      setLogoutError(
        cause instanceof Error ? cause.message : "Tidak dapat keluar.",
      );
    } finally {
      setLeaving(false);
    }
  }
  const active = pathname.startsWith("/accounts")
    ? "/accounts"
    : pathname.startsWith("/transactions")
      ? "/transactions"
      : pathname.startsWith("/storage")
        ? "/storage"
        : pathname.startsWith("/analytics")
          ? "/analytics"
          : "/";

  return (
    <Sidebar>
      <SidebarHeader className="h-16 justify-center border-b px-5">
        <div className="flex items-center justify-between gap-2">
          <Link
            href="/"
            aria-label="Finori, ringkasan"
            onClick={() => {
              setOpenMobile(false);
            }}
            className="flex items-center gap-2.5 text-2xl font-semibold tracking-tight"
          >
            <span className="flex size-9 items-center justify-center rounded-xl bg-primary text-primary-foreground">
              <Sprout className="size-6" />
            </span>
            <span>
              finori<span className="text-primary">.</span>
            </span>
          </Link>
          <Button
            variant="ghost"
            size="icon-sm"
            className="md:hidden"
            aria-label="Tutup navigasi"
            onClick={() => setOpenMobile(false)}
          >
            <X />
          </Button>
        </div>
      </SidebarHeader>
      <SidebarContent>
        <SidebarGroup className="px-3 pt-4">
          <SidebarGroupLabel>MENU UTAMA</SidebarGroupLabel>
          <SidebarGroupContent>
            <nav aria-label="Navigasi utama">
              <SidebarMenu>
                {navigation.map((item) => (
                  <SidebarMenuItem key={item.href}>
                    <SidebarMenuButton
                      className="h-10"
                      isActive={active === item.href}
                      render={
                        <Link
                          href={item.href}
                          aria-current={
                            active === item.href ? "page" : undefined
                          }
                        />
                      }
                      onClick={() => {
                        setOpenMobile(false);
                      }}
                    >
                      <item.icon />
                      <span>{item.label}</span>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                ))}
              </SidebarMenu>
            </nav>
          </SidebarGroupContent>
        </SidebarGroup>
        <SidebarGroup className="px-3">
          <SidebarGroupLabel>DI HALAMAN ANALISIS</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {overviewLinks.map((item) => (
                <SidebarMenuItem key={item.href}>
                  <SidebarMenuButton
                    className="h-10"
                    render={<Link href={item.href} />}
                    onClick={() => setOpenMobile(false)}
                  >
                    <item.icon />
                    <span>{item.label}</span>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
      <SidebarFooter className="border-t p-4">
        <div className="flex items-center gap-3">
          <span className="flex size-9 items-center justify-center rounded-full bg-secondary text-sm font-semibold">
            {email.charAt(0).toUpperCase()}
          </span>
          <div className="min-w-0 flex-1">
            <p className="text-sm font-medium">Akun personal</p>
            <p className="truncate text-xs text-muted-foreground" title={email}>
              {email}
            </p>
          </div>
          <Button
            variant="ghost"
            size="icon-sm"
            aria-label="Keluar dari akun"
            onClick={logout}
            disabled={leaving}
          >
            <LogOut />
          </Button>
        </div>
        {logoutError && (
          <p role="alert" className="text-xs text-destructive">
            {logoutError}
          </p>
        )}
      </SidebarFooter>
    </Sidebar>
  );
}
