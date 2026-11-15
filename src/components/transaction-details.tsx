"use client";

import Link from "next/link";
import { useState } from "react";
import { TransactionForm } from "@/components/transaction-form";
import { TransactionAttachments } from "@/components/transaction-attachments";
import { Alert, AlertTitle, AlertDescription } from "@/components/ui/alert";
import { useFinance } from "@/components/finance-provider";
import { PurchaseDetailsContent } from "@/components/purchase-items";
import { formatMoney } from "@/lib/currency";
import type { TransactionDraft } from "@/lib/finance";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogTrigger,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  DialogClose,
} from "@/components/ui/dialog";
import {
  Empty,
  EmptyHeader,
  EmptyTitle,
  EmptyDescription,
} from "@/components/ui/empty";

export function TransactionDetails({
  transaction,
}: {
  transaction: TransactionDraft & { id?: string; createdAt?: string };
}) {
  const { accounts, deleteTransaction } = useFinance();
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");
  const account = accounts.find(
    (account) => account.id === transaction.accountId,
  );
  const income = transaction.amount > 0;
  return (
    <Dialog
      open={open}
      onOpenChange={(value) => {
        if (pending) return;
        setOpen(value);
        if (!value) {
          setEditing(false);
          setConfirmDelete(false);
          setError("");
        }
      }}
    >
      <DialogTrigger
        render={<Button variant="outline" size="xs" />}
        aria-label={`Lihat detail transaksi ${transaction.name}`}
      >
        Detail transaksi
      </DialogTrigger>
      <DialogContent
        showCloseButton={!pending}
        className="max-h-[90dvh] overflow-y-auto sm:max-w-2xl"
      >
        <DialogHeader>
          <DialogTitle>Detail transaksi</DialogTitle>
          <DialogDescription>
            Informasi transaksi dan rincian barang yang tersedia.
          </DialogDescription>
        </DialogHeader>
        {error && (
          <Alert variant="destructive">
            <AlertTitle>Transaksi belum dapat diproses</AlertTitle>
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}
        {editing && transaction.id ? (
          <TransactionForm
            key={transaction.id}
            transaction={{ ...transaction, id: transaction.id }}
            onSaved={() => setEditing(false)}
            onBusyChange={setPending}
          />
        ) : (
          <>
            <div className="flex min-w-0 flex-col gap-3 rounded-xl border bg-muted/30 p-4">
              <div className="flex flex-wrap gap-2">
                <Badge variant="secondary">
                  {income ? "Pemasukan" : "Pengeluaran"}
                </Badge>
                {!transaction.id && (
                  <Badge variant="outline">Pratinjau · belum disimpan</Badge>
                )}
              </div>
              <h2 className="text-lg font-semibold wrap-break-word">
                {transaction.name}
              </h2>
              <p className="text-2xl font-semibold wrap-break-word tabular-nums">
                {income ? "+" : "−"}
                {formatMoney(
                  Math.abs(transaction.amount),
                  transaction.currency,
                )}
              </p>
            </div>
            <dl className="grid min-w-0 grid-cols-1 gap-4 text-sm sm:grid-cols-2">
              <div>
                <dt className="text-muted-foreground">Tanggal transaksi</dt>
                <dd className="mt-1 font-medium">
                  {new Date(`${transaction.date}T00:00:00Z`).toLocaleDateString(
                    "id-ID",
                    {
                      day: "numeric",
                      month: "long",
                      year: "numeric",
                      timeZone: "UTC",
                    },
                  )}
                </dd>
              </div>
              <div>
                <dt className="text-muted-foreground">Kategori</dt>
                <dd className="mt-1 font-medium">{transaction.category}</dd>
              </div>
              <div>
                <dt className="text-muted-foreground">Rekening / dompet</dt>
                <dd className="mt-1 font-medium">
                  {account ? (
                    <Link
                      href={`/accounts/${account.id}`}
                      className="underline underline-offset-4"
                    >
                      {account.name}
                    </Link>
                  ) : (
                    "Rekening tidak tersedia"
                  )}
                </dd>
                {account && (
                  <dd className="mt-1 text-xs text-muted-foreground">
                    {account.kind}
                    {account.description ? ` · ${account.description}` : ""}
                  </dd>
                )}
              </div>
              <div>
                <dt className="text-muted-foreground">Mata uang</dt>
                <dd className="mt-1 font-medium">{transaction.currency}</dd>
              </div>
              {transaction.createdAt && (
                <div className="sm:col-span-2">
                  <dt className="text-muted-foreground">Dicatat di aplikasi</dt>
                  <dd className="mt-1">
                    {new Date(transaction.createdAt).toLocaleString("id-ID", {
                      dateStyle: "long",
                      timeStyle: "short",
                    })}
                  </dd>
                </div>
              )}
              {transaction.id && (
                <div className="sm:col-span-2">
                  <dt className="text-muted-foreground">ID transaksi</dt>
                  <dd className="mt-1 font-mono text-xs break-all select-text">
                    {transaction.id}
                  </dd>
                </div>
              )}
            </dl>
            <section
              aria-label="Rincian barang"
              className="flex min-w-0 flex-col gap-3 border-t pt-4"
            >
              <h3 className="font-medium">
                Rincian barang{" "}
                {transaction.items?.length
                  ? `(${transaction.items.length})`
                  : ""}
              </h3>
              {transaction.items?.length ? (
                <>
                  <p className="text-xs leading-5 text-muted-foreground">
                    Rincian berikut merupakan bagian dari satu transaksi. Diskon
                    barang berlaku per baris; diskon seluruh belanja diterapkan
                    sesudahnya.
                  </p>
                  <PurchaseDetailsContent transaction={transaction} />
                </>
              ) : (
                <Empty className="border">
                  <EmptyHeader>
                    <EmptyTitle>Tidak ada rincian barang</EmptyTitle>
                    <EmptyDescription>
                      Transaksi ini dicatat sebagai satu nominal. Nama barang,
                      jumlah, harga, jenis, kelompok, dan diskon tidak tersedia
                      jika belum dirincikan saat pencatatan.
                    </EmptyDescription>
                  </EmptyHeader>
                </Empty>
              )}
            </section>
          </>
        )}
        {open && transaction.id && !editing && (
          <TransactionAttachments
            transactionId={transaction.id}
            onBusyChange={setPending}
          />
        )}
        {confirmDelete && (
          <Alert variant="destructive">
            <AlertTitle>Hapus transaksi ini?</AlertTitle>
            <AlertDescription>
              Transaksi dan rincian barang akan dihapus permanen dari catatan.
              Saldo serta laporan akan dihitung ulang. Hapus lampiran terlebih
              dahulu jika masih ada gambar terkait.
            </AlertDescription>
          </Alert>
        )}
        <DialogFooter>
          {transaction.id && !editing && !confirmDelete && (
            <>
              <Button
                variant="outline"
                disabled={pending}
                onClick={() => setEditing(true)}
              >
                Ubah transaksi / rincian
              </Button>
              <Button
                variant="destructive"
                disabled={pending}
                onClick={() => setConfirmDelete(true)}
              >
                Hapus transaksi
              </Button>
            </>
          )}
          {editing && (
            <Button
              variant="outline"
              disabled={pending}
              onClick={() => setEditing(false)}
            >
              Batal mengubah
            </Button>
          )}
          {confirmDelete && (
            <>
              <Button
                variant="destructive"
                disabled={pending}
                onClick={async () => {
                  if (!transaction.id) return;
                  setPending(true);
                  setError("");
                  try {
                    await deleteTransaction(transaction.id);
                    setOpen(false);
                  } catch (cause) {
                    setError(
                      cause instanceof Error
                        ? cause.message
                        : "Gagal menghapus transaksi.",
                    );
                  } finally {
                    setPending(false);
                  }
                }}
              >
                {pending ? "Menghapus…" : "Ya, hapus transaksi"}
              </Button>
              <Button
                variant="outline"
                disabled={pending}
                onClick={() => setConfirmDelete(false)}
              >
                Batal
              </Button>
            </>
          )}
          <DialogClose disabled={pending} render={<Button variant="outline" />}>
            Tutup
          </DialogClose>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
