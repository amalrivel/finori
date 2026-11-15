"use client";

import { useState, useId } from "react";
import {
  currencies,
  currencyLabels,
  currencyStep,
  formatMoney,
} from "@/lib/currency";
import { Controller, useForm, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import type { z } from "zod";
import { accountFormSchema } from "@/lib/form-schemas";
import { usePathname, useRouter } from "next/navigation";
import { Plus, Pencil, Trash2 } from "lucide-react";
import { useFinance } from "@/components/finance-provider";
import {
  type Account,
  accountKinds,
  accountSummary,
  removeAccount,
} from "@/lib/finance";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogClose,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Field,
  FieldGroup,
  FieldLabel,
  FieldDescription,
  FieldError,
} from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import {
  NativeSelect,
  NativeSelectOption,
} from "@/components/ui/native-select";
import { Alert, AlertTitle } from "@/components/ui/alert";

export function AccountActions({ account }: { account?: Account }) {
  const { accounts, saveAccount, deleteAccount, transactions } = useFinance();
  const router = useRouter();
  const pathname = usePathname();
  const [editing, setEditing] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [deletingPending, setDeletingPending] = useState(false);
  const formId = useId();
  const defaults = {
    currency: account?.currency ?? ("IDR" as const),
    name: account?.name ?? "",
    kind: account?.kind ?? ("Rekening bank" as const),
    description: account?.description ?? "",
    openingBalance: account?.openingBalance ?? 0,
  };
  const form = useForm<
    z.input<typeof accountFormSchema>,
    unknown,
    z.output<typeof accountFormSchema>
  >({ resolver: zodResolver(accountFormSchema), defaultValues: defaults });
  const currency =
    useWatch({ control: form.control, name: "currency" }) ?? "IDR";
  const pending = form.formState.isSubmitting || deletingPending;
  const hasTransactions = account
    ? transactions.some((transaction) => transaction.accountId === account.id)
    : false;

  async function save(values: z.output<typeof accountFormSchema>) {
    setError("");
    if (account && !accounts.some((current) => current.id === account.id)) {
      form.setError("root", { message: "Rekening ini tidak lagi tersedia." });
      return;
    }
    if (account && hasTransactions && values.currency !== account.currency) {
      form.setError("currency", {
        message:
          "Mata uang rekening yang memiliki transaksi tidak dapat diubah.",
      });
      return;
    }
    try {
      await saveAccount({ ...values, id: account?.id ?? crypto.randomUUID() });
    } catch (cause) {
      form.setError("root", {
        message:
          cause instanceof Error ? cause.message : "Gagal menyimpan rekening.",
      });
      return;
    }
    setEditing(false);
    setNotice(
      account
        ? "Rekening berhasil diperbarui."
        : "Rekening berhasil ditambahkan.",
    );
  }

  async function remove() {
    if (!account) return;
    const result = removeAccount(accounts, transactions, account.id);
    if (!result.accounts) {
      setError(result.error);
      return;
    }
    setDeletingPending(true);
    try {
      await deleteAccount(account.id);
    } catch (cause) {
      setError(
        cause instanceof Error ? cause.message : "Gagal menghapus rekening.",
      );
      return;
    } finally {
      setDeletingPending(false);
    }
    setDeleting(false);
    setNotice("Rekening berhasil dihapus.");
    if (pathname === `/accounts/${account.id}`) router.push("/accounts");
  }

  return (
    <div className="flex flex-wrap items-center gap-2">
      <Dialog
        open={editing}
        onOpenChange={(open) => {
          if (pending) return;
          if (open) form.reset(defaults);
          setEditing(open);
          setError("");
        }}
      >
        <DialogTrigger
          render={
            <Button
              variant={account ? "outline" : "default"}
              size={account ? "sm" : "lg"}
            />
          }
        >
          {account ? (
            <Pencil data-icon="inline-start" />
          ) : (
            <Plus data-icon="inline-start" />
          )}
          {account ? "Ubah" : "Tambah rekening / dompet"}
        </DialogTrigger>
        <DialogContent className="max-h-[90dvh] overflow-y-auto sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>
              {account ? "Ubah rekening / dompet" : "Tambah rekening / dompet"}
            </DialogTitle>
            <DialogDescription>
              Kelola nama, jenis, keterangan, dan saldo awal. Semua nominal
              sesuai mata uang rekening.
            </DialogDescription>
          </DialogHeader>
          <form
            onSubmit={form.handleSubmit(save)}
            noValidate
            className="flex flex-col gap-5"
          >
            <fieldset disabled={pending} className="contents">
              <FieldGroup>
                <Controller
                  name="currency"
                  control={form.control}
                  render={({ field, fieldState }) => (
                    <Field data-invalid={fieldState.invalid}>
                      <FieldLabel htmlFor={`${formId}-currency`}>
                        Mata uang
                      </FieldLabel>
                      <NativeSelect
                        {...field}
                        id={`${formId}-currency`}
                        value={field.value ?? "IDR"}
                        disabled={hasTransactions}
                        aria-invalid={fieldState.invalid}
                      >
                        {currencies.map((code) => (
                          <NativeSelectOption key={code} value={code}>
                            {currencyLabels[code]}
                          </NativeSelectOption>
                        ))}
                      </NativeSelect>
                      <FieldDescription>
                        {hasTransactions
                          ? "Mata uang dikunci karena rekening sudah memiliki transaksi."
                          : "Transaksi mengikuti mata uang rekening. Buat rekening terpisah untuk setiap mata uang."}
                      </FieldDescription>
                      <FieldError errors={[fieldState.error]} />
                    </Field>
                  )}
                />
                <Controller
                  name="name"
                  control={form.control}
                  render={({ field, fieldState }) => (
                    <Field data-invalid={fieldState.invalid}>
                      <FieldLabel htmlFor={`${formId}-name`}>
                        Nama rekening / dompet
                      </FieldLabel>
                      <Input
                        {...field}
                        id={`${formId}-name`}
                        placeholder="Contoh: BCA pribadi"
                        aria-invalid={fieldState.invalid}
                      />
                      {fieldState.invalid && (
                        <FieldError errors={[fieldState.error]} />
                      )}
                    </Field>
                  )}
                />
                <Controller
                  name="kind"
                  control={form.control}
                  render={({ field, fieldState }) => (
                    <Field data-invalid={fieldState.invalid}>
                      <FieldLabel htmlFor={`${formId}-kind`}>Jenis</FieldLabel>
                      <NativeSelect
                        {...field}
                        id={`${formId}-kind`}
                        aria-invalid={fieldState.invalid}
                      >
                        {accountKinds.map((kind) => (
                          <NativeSelectOption key={kind} value={kind}>
                            {kind}
                          </NativeSelectOption>
                        ))}
                      </NativeSelect>
                      {fieldState.invalid && (
                        <FieldError errors={[fieldState.error]} />
                      )}
                    </Field>
                  )}
                />
                <Controller
                  name="description"
                  control={form.control}
                  render={({ field, fieldState }) => (
                    <Field data-invalid={fieldState.invalid}>
                      <FieldLabel htmlFor={`${formId}-description`}>
                        Keterangan (opsional)
                      </FieldLabel>
                      <Input
                        {...field}
                        id={`${formId}-description`}
                        placeholder="Contoh: Tabungan liburan · •••• 1234"
                        aria-invalid={fieldState.invalid}
                      />
                      {fieldState.invalid && (
                        <FieldError errors={[fieldState.error]} />
                      )}
                    </Field>
                  )}
                />
                <Controller
                  name="openingBalance"
                  control={form.control}
                  render={({ field, fieldState }) => (
                    <Field data-invalid={fieldState.invalid}>
                      <FieldLabel htmlFor={`${formId}-opening`}>
                        Saldo awal ({currency})
                      </FieldLabel>
                      <Input
                        {...field}
                        id={`${formId}-opening`}
                        type="number"
                        step={currencyStep(currency)}
                        aria-invalid={fieldState.invalid}
                      />
                      <FieldDescription>
                        Saldo sebelum transaksi dicatat, bukan saldo saat ini.
                        Perubahan menyesuaikan saldo berjalan tanpa menambah
                        transaksi.
                      </FieldDescription>
                      {fieldState.invalid && (
                        <FieldError errors={[fieldState.error]} />
                      )}
                    </Field>
                  )}
                />
              </FieldGroup>
              {form.formState.errors.root && (
                <Alert variant="destructive">
                  <AlertTitle>{form.formState.errors.root.message}</AlertTitle>
                </Alert>
              )}
              {error && (
                <Alert variant="destructive">
                  <AlertTitle>{error}</AlertTitle>
                </Alert>
              )}
              <DialogFooter>
                <DialogClose
                  render={<Button type="button" variant="outline" />}
                >
                  Batal
                </DialogClose>
                <Button type="submit" disabled={pending}>
                  {account ? "Simpan perubahan" : "Tambah rekening"}
                </Button>
              </DialogFooter>
            </fieldset>
          </form>
        </DialogContent>
      </Dialog>
      {account && (
        <Dialog
          open={deleting}
          onOpenChange={(open) => {
            if (pending) return;
            setDeleting(open);
            setError("");
          }}
        >
          <DialogTrigger
            render={<Button variant="destructive" size="sm" />}
            disabled={hasTransactions}
            title={
              hasTransactions
                ? "Rekening yang memiliki transaksi tidak dapat dihapus."
                : `Hapus ${account.name}`
            }
            aria-label={
              hasTransactions
                ? `Hapus ${account.name} tidak tersedia karena memiliki transaksi`
                : `Hapus ${account.name}`
            }
          >
            <Trash2 data-icon="inline-start" />
            Hapus
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Hapus {account.name}?</DialogTitle>
              <DialogDescription>
                Rekening ini tidak memiliki transaksi. Saldo{" "}
                {formatMoney(
                  accountSummary(account, transactions).balance,
                  account.currency,
                )}{" "}
                juga akan dihapus dari total saldo. Tindakan ini tidak dapat
                dibatalkan.
              </DialogDescription>
            </DialogHeader>
            {error && (
              <Alert variant="destructive">
                <AlertTitle>{error}</AlertTitle>
              </Alert>
            )}
            <DialogFooter>
              <DialogClose render={<Button variant="outline" />}>
                Batal
              </DialogClose>
              <Button variant="destructive" onClick={remove} disabled={pending}>
                Ya, hapus rekening
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}
      <span role="status" className="sr-only">
        {notice}
      </span>
    </div>
  );
}
