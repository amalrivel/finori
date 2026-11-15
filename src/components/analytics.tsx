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
  Download,
} from "lucide-react";
import { useFinance } from "@/components/finance-provider";
import { DashboardCharts } from "@/components/dashboard-charts";
import { TransactionDetails } from "@/components/transaction-details";
import { formatMoney, type Currency } from "@/lib/currency";
import { buildDashboard } from "@/lib/dashboard";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  CardAction,
  CardFooter,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { DashboardFilters } from "@/components/dashboard-filters";
import { Alert, AlertTitle, AlertDescription } from "@/components/ui/alert";
import {
  Empty,
  EmptyHeader,
  EmptyTitle,
  EmptyDescription,
} from "@/components/ui/empty";
import {
  Table,
  TableHeader,
  TableHead,
  TableBody,
  TableRow,
  TableCell,
} from "@/components/ui/table";

const dateLabel = (date: string) =>
  new Date(date + "T00:00:00Z").toLocaleDateString("id-ID", {
    day: "numeric",
    month: "short",
    year: "numeric",
    timeZone: "UTC",
  });
export function Analytics() {
  const { accounts, transactions } = useFinance();
  const [currency, setCurrency] = useState<Currency>(
    transactions[0]?.currency ?? accounts[0]?.currency ?? "IDR",
  );
  const [period, setPeriod] = useState("all");
  const [hidden, setHidden] = useState(false);
  const [query, setQuery] = useState("");
  const data = useMemo(
    () => buildDashboard(accounts, transactions, currency, period),
    [accounts, transactions, currency, period],
  );
  const money = (value: number) =>
    hidden ? `${currency} •••••••` : formatMoney(value, currency);
  const found = data.entries
    .filter((t) =>
      `${t.name} ${t.category} ${accounts.find((a) => a.id === t.accountId)?.name ?? ""}`
        .toLocaleLowerCase("id-ID")
        .includes(query.toLocaleLowerCase("id-ID")),
    )
    .toSorted(
      (a, b) => b.date.localeCompare(a.date) || b.id.localeCompare(a.id),
    );
  const visible = found.slice(0, 10);
  const range =
    data.start && data.end
      ? `${dateLabel(data.start)} – ${dateLabel(data.end)}`
      : "Belum ada rentang transaksi";
  const netDescription =
    data.totals.balance > 0
      ? "Pemasukan lebih besar dari pengeluaran"
      : data.totals.balance < 0
        ? "Pengeluaran lebih besar dari pemasukan"
        : "Pemasukan dan pengeluaran seimbang";
  function exportTransactions() {
    const rows = [
      ["Tanggal", "Transaksi", "Kategori", "Jumlah", "Mata uang", "Rekening"],
      ...data.entries.map((t) => [
        t.date,
        t.name,
        t.category,
        String(t.amount),
        t.currency,
        accounts.find((account) => account.id === t.accountId)?.name ?? "",
      ]),
    ];
    const csv = rows
      .map((row) =>
        row
          .map(
            (value) =>
              `"${value.replaceAll('"', '""').replace(/^[=+@-]/, "'$&")}"`,
          )
          .join(","),
      )
      .join("\r\n");
    const url = URL.createObjectURL(
      new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8;" }),
    );
    const link = document.createElement("a");
    link.href = url;
    link.download = `finori-${currency}-${period}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  }
  return (
    <div id="ringkasan" className="flex min-w-0 flex-col gap-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">
            Analisis keuangan<span className="text-primary">.</span>
          </h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Telusuri grafik, pola transaksi, dan rincian rekening dari data
            tersimpan.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button
            variant="outline"
            onClick={() => setHidden((value) => !value)}
            aria-pressed={hidden}
          >
            {hidden ? (
              <Eye data-icon="inline-start" />
            ) : (
              <EyeOff data-icon="inline-start" />
            )}
            {hidden ? "Tampilkan nominal" : "Sembunyikan nominal"}
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
          <div className="text-sm text-muted-foreground">
            <p>{range}</p>
            <p className="mt-1 text-xs">
              {data.entries.length} transaksi · Mata uang ditampilkan terpisah
              tanpa konversi kurs.
            </p>
          </div>
        </CardContent>
      </Card>
      <section
        aria-label="Ringkasan keuangan"
        className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4"
      >
        {[
          {
            label: "Saldo tercatat saat ini",
            value: data.currentBalance,
            icon: Wallet,
            note: "Saldo awal + seluruh riwayat; tidak mengikuti filter periode",
          },
          {
            label: "Pemasukan periode",
            value: data.totals.income,
            icon: ArrowDownLeft,
            note: `${data.incomeCount} transaksi pemasukan`,
          },
          {
            label: "Pengeluaran periode",
            value: data.totals.expense,
            icon: ArrowUpRight,
            note: `${data.expenseCount} transaksi pengeluaran`,
          },
          {
            label: "Arus kas bersih",
            value: data.totals.balance,
            icon: ArrowLeftRight,
            note: data.entries.length
              ? netDescription
              : "Belum ada transaksi pada periode ini",
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
              <p className="mt-3 text-xs leading-5 text-muted-foreground">
                {item.note}
              </p>
            </CardContent>
          </Card>
        ))}
      </section>
      {data.uncategorized > 0 && (
        <Alert>
          <AlertTitle>
            Kategori belum menjelaskan seluruh pola belanjamu
          </AlertTitle>
          <AlertDescription>
            {data.uncategorized} dari {data.entries.length} transaksi (
            {Math.round((data.uncategorized / data.entries.length) * 100)}%)
            memakai kategori “Lainnya”. Grafik menggunakan tanggal, rekening,
            dan nama catatan, sehingga data lama tetap terbaca. Kategori asli
            tidak diubah.
          </AlertDescription>
        </Alert>
      )}
      {!data.entries.length && (
        <Empty>
          <EmptyHeader>
            <EmptyTitle>Belum ada transaksi untuk pilihan ini</EmptyTitle>
            <EmptyDescription>
              Pilih mata uang/periode lain atau tambahkan transaksi. Saldo awal
              rekening tetap diperhitungkan.
            </EmptyDescription>
          </EmptyHeader>
          <Button
            variant="outline"
            nativeButton={false}
            render={<Link href="/transactions" />}
          >
            Buka transaksi
          </Button>
        </Empty>
      )}
      <DashboardCharts data={data} currency={currency} hidden={hidden} />
      <section
        id="pola-transaksi"
        className="grid scroll-mt-24 gap-4 lg:grid-cols-3"
        aria-label="Pola transaksi"
      >
        <Card>
          <CardHeader>
            <CardTitle>Aktivitas pencatatan</CardTitle>
            <CardDescription>Periode terpilih</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-semibold">
              {data.activeDays} hari aktif
            </p>
            <p className="mt-3 text-sm text-muted-foreground">
              {data.entries.length} transaksi tercatat. Hari tanpa catatan tetap
              disertakan pada rentang grafik dengan arus kas nol.
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Rata-rata pengeluaran</CardTitle>
            <CardDescription>
              Per transaksi pengeluaran, bukan per hari
            </CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-semibold tabular-nums">
              {data.expenseCount
                ? money(data.averageExpense)
                : "Belum ada pengeluaran"}
            </p>
            <p className="mt-3 text-sm text-muted-foreground">
              Total pengeluaran dibagi {data.expenseCount} transaksi
              pengeluaran. Pemasukan tidak ikut dihitung.
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Hari pengeluaran tertinggi</CardTitle>
            <CardDescription>
              Total seluruh pengeluaran pada satu hari
            </CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-semibold tabular-nums">
              {data.biggestExpenseDay
                ? money(data.biggestExpenseDay[1])
                : "Belum ada pengeluaran"}
            </p>
            <p className="mt-3 text-sm text-muted-foreground">
              {data.biggestExpenseDay
                ? dateLabel(data.biggestExpenseDay[0])
                : "Akan muncul setelah ada transaksi pengeluaran."}
            </p>
          </CardContent>
        </Card>
      </section>
      <Card>
        <CardHeader>
          <CardTitle>Di mana uangmu berada?</CardTitle>
          <CardDescription>
            Saldo saat ini dari seluruh riwayat rekening {currency}; aktivitas
            mengikuti periode terpilih.
          </CardDescription>
          <CardAction>
            <Button
              variant="ghost"
              size="sm"
              nativeButton={false}
              render={<Link href="/accounts" />}
            >
              Kelola rekening
            </Button>
          </CardAction>
        </CardHeader>
        <CardContent>
          {data.byAccount.length ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Rekening / dompet</TableHead>
                  <TableHead className="text-right">
                    Aktivitas periode
                  </TableHead>
                  <TableHead className="text-right">Saldo saat ini</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {data.byAccount.map((account) => (
                  <TableRow key={account.id}>
                    <TableCell>
                      <Link
                        href={`/accounts/${account.id}`}
                        className="font-medium hover:underline"
                      >
                        {account.name}
                      </Link>
                    </TableCell>
                    <TableCell className="text-right">
                      {account.count} transaksi
                    </TableCell>
                    <TableCell className="text-right font-medium tabular-nums">
                      {money(account.currentBalance)}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : (
            <p className="text-sm text-muted-foreground">
              Belum ada rekening {currency}. Tambahkan melalui halaman rekening.
            </p>
          )}
        </CardContent>
        <CardFooter className="text-xs leading-5 text-muted-foreground">
          Saldo merupakan rekonstruksi dari saldo awal yang Anda isi dan
          transaksi tercatat, bukan konfirmasi saldo bank. Transaksi yang belum
          dicatat tidak tercermin di sini.
        </CardFooter>
      </Card>
      <Card id="transaksi" className="scroll-mt-24">
        <CardHeader>
          <CardTitle>Catatan transaksi terbaru</CardTitle>
          <CardDescription>
            Mengikuti mata uang dan periode yang dipilih.
          </CardDescription>
          <CardAction>
            <Button
              variant="outline"
              size="sm"
              onClick={exportTransactions}
              disabled={!data.entries.length}
            >
              <Download data-icon="inline-start" />
              Ekspor periode CSV
            </Button>
          </CardAction>
        </CardHeader>
        <CardContent>
          <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
            <Input
              aria-label="Cari catatan dashboard"
              placeholder="Cari catatan atau rekening…"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              className="sm:max-w-xs"
            />
            <span className="text-xs text-muted-foreground">
              Menampilkan {visible.length} dari {found.length} transaksi
            </span>
          </div>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Catatan / rekening</TableHead>
                <TableHead>Tanggal</TableHead>
                <TableHead>Kategori</TableHead>
                <TableHead className="text-right">Nominal</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {visible.map((transaction) => (
                <TableRow key={transaction.id}>
                  <TableCell>
                    <p className="font-medium">{transaction.name}</p>
                    <p className="mt-1 text-xs text-muted-foreground">
                      {
                        accounts.find(
                          (account) => account.id === transaction.accountId,
                        )?.name
                      }
                    </p>
                    {!hidden && (
                      <TransactionDetails transaction={transaction} />
                    )}
                  </TableCell>
                  <TableCell className="whitespace-nowrap text-muted-foreground">
                    {dateLabel(transaction.date)}
                  </TableCell>
                  <TableCell>
                    <Badge variant="secondary">{transaction.category}</Badge>
                  </TableCell>
                  <TableCell className="text-right font-medium whitespace-nowrap tabular-nums">
                    {!hidden && (transaction.amount > 0 ? "+" : "−")}
                    {money(Math.abs(transaction.amount))}
                  </TableCell>
                </TableRow>
              ))}
              {!visible.length && (
                <TableRow>
                  <TableCell
                    colSpan={4}
                    className="py-8 text-center text-muted-foreground"
                  >
                    Tidak ada catatan yang cocok.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
        <CardFooter className="justify-end">
          <Button
            variant="ghost"
            size="sm"
            nativeButton={false}
            render={<Link href="/transactions" />}
          >
            Lihat seluruh transaksi
          </Button>
        </CardFooter>
      </Card>
    </div>
  );
}
