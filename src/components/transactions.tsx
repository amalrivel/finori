"use client";

import { useState } from "react";
import Link from "next/link";
import { TransactionForm } from "@/components/transaction-form";
import { TransactionDetails } from "@/components/transaction-details";
import { TransactionJsonImport } from "@/components/transaction-json-import";
import { useFinance } from "@/components/finance-provider";
import { formatMoney } from "@/lib/currency";
import { cn } from "@/lib/utils";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableHeader,
  TableHead,
  TableBody,
  TableRow,
  TableCell,
} from "@/components/ui/table";
import {
  Empty,
  EmptyHeader,
  EmptyTitle,
  EmptyDescription,
} from "@/components/ui/empty";

export function Transactions() {
  const { accounts, transactions } = useFinance();
  const [query, setQuery] = useState("");
  const visible = transactions
    .filter((transaction) =>
      `${transaction.name} ${transaction.category} ${accounts.find((account) => account.id === transaction.accountId)?.name}`
        .toLowerCase()
        .includes(query.toLowerCase()),
    )
    .toSorted((a, b) => b.date.localeCompare(a.date));

  return (
    <>
      <div className="flex min-w-0 flex-col gap-6">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">
              Pemasukan & pengeluaran<span className="text-primary">.</span>
            </h1>
            <p className="mt-2 text-sm text-muted-foreground">
              Setiap transaksi membantu kamu memahami keuanganmu.
            </p>
          </div>
          <TransactionJsonImport />
        </div>
        <div className="grid items-start gap-6 xl:grid-cols-[minmax(0,1fr)_minmax(0,1.4fr)]">
          <TransactionForm />
          <Card>
            <CardHeader>
              <CardTitle>Riwayat transaksi</CardTitle>
              <CardDescription>
                {transactions.length} transaksi dari seluruh rekening dan
                dompet.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="mb-5">
                <Input
                  aria-label="Cari transaksi"
                  placeholder="Cari transaksi, kategori, atau rekening…"
                  value={query}
                  onChange={(event) => setQuery(event.target.value)}
                />
              </div>
              {visible.length === 0 ? (
                <Empty>
                  <EmptyHeader>
                    <EmptyTitle>Tidak ada transaksi yang cocok</EmptyTitle>
                    <EmptyDescription>
                      Coba kata kunci lain atau catat transaksi baru.
                    </EmptyDescription>
                  </EmptyHeader>
                </Empty>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Transaksi</TableHead>
                      <TableHead>Rekening</TableHead>
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
                              <p className="font-medium">{transaction.name}</p>
                              <TransactionDetails transaction={transaction} />
                              <p className="mt-1 text-xs text-muted-foreground">
                                {transaction.category} ·{" "}
                                {new Date(
                                  transaction.date + "T00:00:00",
                                ).toLocaleDateString("id-ID", {
                                  day: "numeric",
                                  month: "short",
                                  year: "numeric",
                                })}
                              </p>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <Link
                            href={`/accounts/${transaction.accountId}`}
                            className="text-muted-foreground hover:underline"
                          >
                            {
                              accounts.find(
                                (account) =>
                                  account.id === transaction.accountId,
                              )?.name
                            }
                          </Link>
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
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </>
  );
}
