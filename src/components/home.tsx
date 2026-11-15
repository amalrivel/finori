"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import {
  ArrowDownLeft,
  ArrowUpRight,
  ArrowLeftRight,
  Wallet,
  Plus,
  Eye,
  EyeOff,
} from "lucide-react";
import { useFinance } from "@/components/finance-provider";
import { TransactionDetails } from "@/components/transaction-details";
import { DashboardCharts } from "@/components/dashboard-charts";
import { DashboardFilters } from "@/components/dashboard-filters";
import { formatMoney, type Currency } from "@/lib/currency";
import { buildDashboard } from "@/lib/dashboard";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  CardAction,
  CardFooter,
} from "@/components/ui/card";
import {
  Empty,
  EmptyHeader,
  EmptyTitle,
  EmptyDescription,
} from "@/components/ui/empty";

const dateLabel = (date: string) =>
  new Date(`${date}T00:00:00Z`).toLocaleDateString("id-ID", {
    day: "numeric",
    month: "short",
    year: "numeric",
    timeZone: "UTC",
  });

export function Home() {
  const { accounts, transactions } = useFinance();
  const [currency, setCurrency] = useState<Currency>(
    transactions[0]?.currency ?? accounts[0]?.currency ?? "IDR",
  );
  const [period, setPeriod] = useState("all");
  const [hidden, setHidden] = useState(false);
  const data = useMemo(
    () => buildDashboard(accounts, transactions, currency, period),
    [accounts, transactions, currency, period],
  );
  const money = (value: number) =>
    hidden ? `${currency} •••••` : formatMoney(value, currency);
  const recent = data.entries
    .toSorted(
      (a, b) => b.date.localeCompare(a.date) || b.id.localeCompare(a.id),
    )
    .slice(0, 5);
  return (
    <div className="flex min-w-0 flex-col gap-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">
            Ringkasan keuangan<span className="text-primary">.</span>
          </h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Angka utama dan aktivitas terakhirmu.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button
            variant="outline"
            size="icon"
            aria-label={hidden ? "Tampilkan nominal" : "Sembunyikan nominal"}
            aria-pressed={hidden}
            onClick={() => setHidden((value) => !value)}
          >
            {hidden ? <Eye /> : <EyeOff />}
          </Button>
          <Button nativeButton={false} render={<Link href="/transactions" />}>
            <Plus data-icon="inline-start" />
            Tambah transaksi
          </Button>
        </div>
      </div>
      <Card>
        <CardContent className="flex min-w-0 flex-col gap-4">
          <DashboardFilters
            currency={currency}
            period={period}
            periods={data.periods}
            onCurrencyChange={(next) => {
              setCurrency(next);
              setPeriod("all");
            }}
            onPeriodChange={setPeriod}
          />
          <p className="text-xs text-muted-foreground">
            {data.start && data.end
              ? `${dateLabel(data.start)} – ${dateLabel(data.end)}`
              : "Belum ada transaksi"}{" "}
            · {data.entries.length} transaksi
          </p>
        </CardContent>
      </Card>
      <section
        aria-label="Angka utama"
        className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4"
      >
        {[
          {
            label: "Saldo saat ini",
            value: data.currentBalance,
            icon: Wallet,
            note: "Seluruh riwayat rekening",
          },
          {
            label: "Pemasukan",
            value: data.totals.income,
            icon: ArrowDownLeft,
            note: `${data.incomeCount} transaksi pada periode ini`,
          },
          {
            label: "Pengeluaran",
            value: data.totals.expense,
            icon: ArrowUpRight,
            note: `${data.expenseCount} transaksi pada periode ini`,
          },
          {
            label: "Arus kas bersih",
            value: data.totals.balance,
            icon: ArrowLeftRight,
            note: "Pemasukan − pengeluaran periode",
          },
        ].map((item) => (
          <Card key={item.label}>
            <CardHeader>
              <CardDescription>{item.label}</CardDescription>
              <CardAction>
                <item.icon className="size-4 text-muted-foreground" />
              </CardAction>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-semibold tracking-tight wrap-break-word tabular-nums">
                {money(item.value)}
              </p>
              <p className="mt-2 text-xs text-muted-foreground">{item.note}</p>
            </CardContent>
          </Card>
        ))}
      </section>
      <div className="grid min-w-0 items-start gap-5 xl:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)]">
        <DashboardCharts
          data={data}
          currency={currency}
          hidden={hidden}
          overview
        />
        <Card>
          <CardHeader>
            <CardTitle>Transaksi terbaru</CardTitle>
            <CardDescription>
              Lima catatan terakhir pada periode terpilih.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {recent.length ? (
              <ul className="flex flex-col divide-y">
                {recent.map((transaction) => (
                  <li
                    key={transaction.id}
                    className="flex min-w-0 flex-wrap items-center justify-between gap-2 py-3 first:pt-0 last:pb-0"
                  >
                    <div className="min-w-0 flex-1">
                      <p
                        className="truncate font-medium"
                        title={transaction.name}
                      >
                        {transaction.name}
                      </p>
                      <p className="mt-1 text-xs text-muted-foreground">
                        {dateLabel(transaction.date)}
                      </p>
                      {!hidden && (
                        <div className="mt-2">
                          <TransactionDetails transaction={transaction} />
                        </div>
                      )}
                    </div>
                    <p className="shrink-0 text-sm font-medium tabular-nums">
                      {!hidden && (transaction.amount > 0 ? "+" : "−")}
                      {money(Math.abs(transaction.amount))}
                    </p>
                  </li>
                ))}
              </ul>
            ) : (
              <Empty>
                <EmptyHeader>
                  <EmptyTitle>Belum ada transaksi</EmptyTitle>
                  <EmptyDescription>
                    Pilih mata uang atau periode lain untuk melihat aktivitas.
                  </EmptyDescription>
                </EmptyHeader>
              </Empty>
            )}
          </CardContent>
          <CardFooter className="justify-end">
            <Button
              variant="ghost"
              size="sm"
              nativeButton={false}
              render={<Link href="/transactions" />}
            >
              Lihat transaksi
            </Button>
          </CardFooter>
        </Card>
      </div>
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border p-4">
        <p className="text-sm text-muted-foreground">
          Ingin melihat tren saldo, pola pengeluaran, atau rincian rekening?
        </p>
        <Button
          variant="outline"
          nativeButton={false}
          render={<Link href="/analytics" />}
        >
          Buka analisis lengkap
        </Button>
      </div>
    </div>
  );
}
