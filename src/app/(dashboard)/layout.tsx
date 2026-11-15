import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/app-sidebar";
import { DashboardHeader } from "@/components/dashboard-header";
import { FinanceProvider } from "@/components/finance-provider";

export default function Layout({ children }: LayoutProps<"/">) {
  return (
    <FinanceProvider>
      <a
        href="#dashboard-content"
        className="sr-only top-4 left-4 z-50 rounded-lg bg-primary px-4 py-2 text-primary-foreground focus:not-sr-only focus:fixed"
      >
        Lewati navigasi
      </a>
      <SidebarProvider>
        <AppSidebar />
        <SidebarInset className="min-w-0">
          <DashboardHeader />
          <div
            id="dashboard-content"
            tabIndex={-1}
            className="mx-auto w-full max-w-7xl flex-1 px-4 py-6 outline-none sm:px-6 lg:px-8 lg:py-8"
          >
            {children}
          </div>
          <footer className="border-t px-4 py-4 text-xs leading-5 text-muted-foreground sm:px-6 lg:px-8">
            Data tersimpan untuk akun Anda dan tetap tersedia setelah halaman
            dimuat ulang.
          </footer>
        </SidebarInset>
      </SidebarProvider>
    </FinanceProvider>
  );
}
