"use client";

import { formatMoney } from "@/lib/currency";
import { useState } from "react";
import Link from "next/link";
import {
  ArrowDownLeft,
  ArrowUpRight,
  Landmark,
  Wallet,
  ArrowLeft,
  ArrowRight,
  SearchX,
} from "lucide-react";
import { AccountActions } from "@/components/account-actions";
import { PurchaseDetailsView } from "@/components/purchase-items";
import { useFinance } from "@/components/finance-provider";
import { accountSummary, currencySummary } from "@/lib/finance";
import { Badge } from "@/components/ui/badge";
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
import { Input } from "@/components/ui/input";
import {
  Empty,
  EmptyHeader,
  EmptyMedia,
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
import { cn } from "@/lib/utils";

export function AccountsList() {
  const { accounts, transactions } = useFinance();
  const [query, setQuery] = useState("");
  const totals = currencySummary(accounts, transactions);
  const filtered = accounts.filter((account) =>
    `${account.name} ${account.kind} ${account.currency}`
      .toLowerCase()
      .includes(query.toLowerCase()),
  );

  return (
    <>
      <div className="flex min-w-0 flex-col gap-6">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">
              Rekening & dompet<span className="text-primary">.</span>
            </h1>
            <p className="mt-2 text-sm text-muted-foreground">
              Lihat di mana uangmu berada dan ke mana uangmu pergi.
            </p>
          </div>
          <AccountActions />
        </div>
        <div className="grid gap-4 xl:grid-cols-3">
          <Card className="balance-card xl:col-span-2">
            <CardHeader>
              <CardDescription>Total saldo rekening & dompet</CardDescription>
              <CardAction>
                <Wallet className="size-5" />
              </CardAction>
            </CardHeader>
            <CardContent>
              <div className="flex flex-col gap-2">
                {totals.length ? (
                  totals.map((total) => (
                    <p
                      key={total.currency}
                      className="text-2xl font-semibold tracking-tight tabular-nums sm:text-3xl"
                    >
                      {formatMoney(total.balance, total.currency)}
                    </p>
                  ))
                ) : (
                  <p>Belum ada saldo</p>
                )}
              </div>
              <p className="mt-3 text-xs text-muted-foreground">
                Saldo awal + pemasukan − pengeluaran dari {accounts.length}{" "}
                akun. Tanpa konversi kurs.
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle>Ruang keuanganmu</CardTitle>
              <CardDescription>Saldo dipisahkan per mata uang</CardDescription>
            </CardHeader>
            <CardContent className="flex flex-col gap-3">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Rekening bank</span>
                <span className="font-medium">
                  {
                    accounts.filter(
                      (account) => account.kind === "Rekening bank",
                    ).length
                  }
                </span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Dompet & tunai</span>
                <span className="font-medium">
                  {
                    accounts.filter(
                      (account) => account.kind !== "Rekening bank",
                    ).length
                  }
                </span>
              </div>
            </CardContent>
          </Card>
        </div>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 className="text-base font-semibold">Daftar rekening & dompet</h2>
          <div className="w-full sm:w-72">
            <Input
              aria-label="Cari rekening atau dompet"
              placeholder="Cari rekening atau dompet…"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
            />
          </div>
        </div>
        <div className="grid gap-5 lg:grid-cols-2 2xl:grid-cols-3">
          {filtered.map((account) => {
            const summary = accountSummary(account, transactions);
            const Icon = account.kind === "Rekening bank" ? Landmark : Wallet;
            return (
              <Card key={account.id}>
                <CardHeader>
                  <CardTitle>
                    <Link
                      href={`/accounts/${account.id}`}
                      className="hover:underline"
                    >
                      {account.name}
                    </Link>
                  </CardTitle>
                  <CardDescription>{account.description}</CardDescription>
                  <CardAction>
                    <span className="flex size-10 items-center justify-center rounded-xl bg-accent text-primary">
                      <Icon className="size-5" />
                    </span>
                  </CardAction>
                </CardHeader>
                <CardContent>
                  <Badge variant="secondary">
                    {account.kind} · {account.currency}
                  </Badge>
                  <p className="mt-5 mb-1 text-xs text-muted-foreground">
                    Saldo saat ini
                  </p>
                  <p className="text-2xl font-semibold tracking-tight tabular-nums">
                    {formatMoney(summary.balance, account.currency)}
                  </p>
                  <div className="mt-4">
                    <AccountActions account={account} />
                  </div>
                </CardContent>
                <CardFooter className="justify-between">
                  <span className="text-xs text-muted-foreground">
                    {
                      transactions.filter(
                        (transaction) => transaction.accountId === account.id,
                      ).length
                    }{" "}
                    transaksi
                  </span>
                  <Button
                    variant="ghost"
                    size="sm"
                    nativeButton={false}
                    render={<Link href={`/accounts/${account.id}`} />}
                  >
                    Lihat detail
                    <ArrowRight data-icon="inline-end" />
                  </Button>
                </CardFooter>
              </Card>
            );
          })}
        </div>
        <p className="text-xs text-muted-foreground">
          Rekening yang sudah memiliki transaksi tidak dapat dihapus agar
          riwayat tetap utuh.
        </p>
        {filtered.length === 0 && (
          <Empty>
            <EmptyHeader>
              <EmptyMedia variant="icon">
                <SearchX />
              </EmptyMedia>
              <EmptyTitle>
                {accounts.length
                  ? "Rekening tidak ditemukan"
                  : "Belum ada rekening atau dompet"}
              </EmptyTitle>
              <EmptyDescription>
                {accounts.length
                  ? "Coba nama bank, dompet, atau jenis rekening yang lain."
                  : "Tambahkan rekening atau dompet untuk mulai mencatat transaksi."}
              </EmptyDescription>
            </EmptyHeader>
          </Empty>
        )}
      </div>
    </>
  );
}

export function AccountDetails({ accountId }: { accountId: string }) {
  const { accounts, transactions } = useFinance();
  const [query, setQuery] = useState("");
  const account = accounts.find((account) => account.id === accountId);
  if (!account)
    return (
      <Empty>
        <EmptyHeader>
          <EmptyTitle>Rekening tidak tersedia</EmptyTitle>
          <EmptyDescription>
            Rekening tidak ditemukan, sudah dihapus, atau tidak tersedia untuk
            akun Anda.
          </EmptyDescription>
        </EmptyHeader>
        <Button nativeButton={false} render={<Link href="/accounts" />}>
          Kembali ke daftar rekening
        </Button>
      </Empty>
    );
  const entries = transactions
    .filter((transaction) => transaction.accountId === account.id)
    .toSorted((a, b) => b.date.localeCompare(a.date));
  const visible = entries.filter((transaction) =>
    `${transaction.name} ${transaction.category}`
      .toLowerCase()
      .includes(query.toLowerCase()),
  );
  const summary = accountSummary(account, transactions);

  return (
    <>
      <div className="flex min-w-0 flex-col gap-6">
        <div>
          <Button
            variant="ghost"
            size="sm"
            nativeButton={false}
            render={<Link href="/accounts" />}
          >
            <ArrowLeft data-icon="inline-start" />
            Semua rekening & dompet
          </Button>
          <div className="mt-5 flex flex-wrap items-center gap-3">
            <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">
              {account.name}
            </h1>
            <Badge variant="secondary">
              {account.kind} · {account.currency}
            </Badge>
          </div>
          <p className="mt-2 text-sm text-muted-foreground">
            {account.description}
          </p>
          <div className="mt-4">
            <AccountActions account={account} />
          </div>
        </div>
        <section
          aria-label="Ringkasan rekening"
          className="grid gap-4 xl:grid-cols-3"
        >
          {[
            {
              label: "Saldo saat ini",
              value: summary.balance,
              icon: Wallet,
              note: `Saldo awal ${formatMoney(account.openingBalance, account.currency)}`,
            },
            {
              label: "Pemasukan",
              value: summary.income,
              icon: ArrowDownLeft,
              note: "Total uang masuk ke rekening ini",
            },
            {
              label: "Pengeluaran",
              value: summary.expense,
              icon: ArrowUpRight,
              note: "Total uang keluar dari rekening ini",
            },
          ].map((item, index) => (
            <Card
              key={item.label}
              className={cn(index === 0 && "balance-card")}
            >
              <CardHeader>
                <CardDescription>{item.label}</CardDescription>
                <CardAction>
                  <item.icon className="size-5" />
                </CardAction>
              </CardHeader>
              <CardContent>
                <p className="text-[28px] font-semibold tracking-tight tabular-nums">
                  {formatMoney(item.value, account.currency)}
                </p>
                <p className="mt-3 text-xs text-muted-foreground">
                  {item.note}
                </p>
              </CardContent>
            </Card>
          ))}
        </section>
        <Card>
          <CardHeader>
            <CardTitle>Transaksi {account.name}</CardTitle>
            <CardDescription>
              Hanya transaksi yang dicatat pada rekening ini.
            </CardDescription>
            <CardAction>
              <Badge variant="outline">{entries.length} transaksi</Badge>
            </CardAction>
          </CardHeader>
          <CardContent>
            <div className="mb-5 w-full sm:w-80">
              <Input
                aria-label="Cari transaksi rekening"
                placeholder="Cari nama transaksi atau kategori…"
                value={query}
                onChange={(event) => setQuery(event.target.value)}
              />
            </div>
            {visible.length > 0 ? (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Transaksi</TableHead>
                    <TableHead>Kategori</TableHead>
                    <TableHead>Tanggal</TableHead>
                    <TableHead className="text-right">Nominal</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {visible.map((transaction) => (
                    <TableRow key={transaction.id}>
                      <TableCell>
                        <div className="flex items-center gap-3 py-2">
                          <span className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-accent text-primary">
                            <transaction.icon className="size-4" />
                          </span>
                          <div>
                            <span className="font-medium">
                              {transaction.name}
                            </span>
                            <PurchaseDetailsView transaction={transaction} />
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant="secondary">
                          {transaction.category}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {new Date(
                          transaction.date + "T00:00:00",
                        ).toLocaleDateString("id-ID", {
                          day: "numeric",
                          month: "short",
                          year: "numeric",
                        })}
                      </TableCell>
                      <TableCell
                        className={cn(
                          "text-right font-medium tabular-nums",
                          transaction.amount > 0 && "text-primary",
                        )}
                      >
                        {transaction.amount > 0 ? "+" : "−"}
                        {formatMoney(
                          Math.abs(transaction.amount),
                          transaction.currency,
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            ) : (
              <Empty>
                <EmptyHeader>
                  <EmptyMedia variant="icon">
                    <Wallet />
                  </EmptyMedia>
                  <EmptyTitle>
                    {entries.length === 0
                      ? "Belum ada transaksi"
                      : "Transaksi tidak ditemukan"}
                  </EmptyTitle>
                  <EmptyDescription>
                    {entries.length === 0
                      ? "Catat transaksi dari halaman Transaksi dan pilih rekening ini agar muncul di sini."
                      : "Coba nama transaksi atau kategori yang lain."}
                  </EmptyDescription>
                </EmptyHeader>
                {entries.length === 0 && (
                  <Button
                    variant="outline"
                    nativeButton={false}
                    render={<Link href="/transactions" />}
                  >
                    Tambah transaksi
                    <ArrowRight data-icon="inline-end" />
                  </Button>
                )}
              </Empty>
            )}
          </CardContent>
        </Card>
      </div>
    </>
  );
}
