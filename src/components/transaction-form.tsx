"use client";

import { currencyStep, formatMoney, sumMoney } from "@/lib/currency";
import { useId, useState } from "react";
import Link from "next/link";
import { Controller, FormProvider, useForm, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { ArrowDownLeft, ArrowUpRight, CheckCircle2, Plus } from "lucide-react";
import { useFinance } from "@/components/finance-provider";
import { PurchaseItemsEditor } from "@/components/purchase-items";
import {
  transactionFormDefaults,
  createTransactionFormSchema,
  type TransactionFormInput,
} from "@/lib/form-schemas";
import {
  purchaseItemTotal,
  transactionCategories,
  type TransactionDraft,
} from "@/lib/finance";
import { Button } from "@/components/ui/button";
import { Alert, AlertTitle, AlertDescription } from "@/components/ui/alert";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
} from "@/components/ui/card";
import {
  Field,
  FieldGroup,
  FieldLabel,
  FieldDescription,
  FieldError,
  FieldSet,
} from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import {
  NativeSelect,
  NativeSelectOption,
} from "@/components/ui/native-select";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";

export function TransactionForm({
  transaction: original,
  onSaved,
  onBusyChange,
}: {
  transaction?: TransactionDraft & { id: string };
  onSaved?: () => void;
  onBusyChange?: (pending: boolean) => void;
} = {}) {
  const {
    accounts: allAccounts,
    addTransactions,
    updateTransaction,
  } = useFinance();
  const accounts = original
    ? allAccounts.filter((account) => account.currency === original.currency)
    : allAccounts;
  const id = useId();
  const [success, setSuccess] = useState("");
  const defaults = transactionFormDefaults(accounts[0]?.id ?? "", original);
  const form = useForm<TransactionFormInput, unknown, TransactionDraft>({
    resolver: zodResolver(createTransactionFormSchema(accounts)),
    defaultValues: defaults,
  });
  const type = useWatch({ control: form.control, name: "type" });
  const detailed = useWatch({ control: form.control, name: "detailed" });
  const purchase = useWatch({ control: form.control, name: "purchase" });
  const accountId = useWatch({ control: form.control, name: "accountId" });
  const currency =
    accounts.find((account) => account.id === accountId)?.currency ?? "IDR";
  const total = sumMoney([
    ...purchase.items.map((item) =>
      purchaseItemTotal(
        {
          ...item,
          quantity: Number(item.quantity),
          unitPrice: Number(item.unitPrice),
          discount: Number(item.discount),
        },
        currency,
      ),
    ),
    -Number(purchase.discount),
  ]);
  const pending = form.formState.isSubmitting;
  async function submit(transaction: TransactionDraft) {
    setSuccess("");
    onBusyChange?.(true);
    try {
      if (original) await updateTransaction(original.id, transaction);
      else await addTransactions([transaction]);
    } catch (cause) {
      form.setError("root", {
        message:
          cause instanceof Error ? cause.message : "Gagal menyimpan transaksi.",
      });
      return;
    } finally {
      onBusyChange?.(false);
    }
    if (original) {
      onSaved?.();
      return;
    }
    setSuccess(
      `${transaction.amount > 0 ? "Pemasukan" : "Pengeluaran"} “${transaction.name}” sebesar ${formatMoney(Math.abs(transaction.amount), transaction.currency)} berhasil dicatat. Saldo rekening sudah diperbarui.`,
    );
    form.reset({ ...defaults, accountId: transaction.accountId });
  }
  return (
    <Card>
      <CardHeader>
        <CardTitle>
          {original ? "Ubah transaksi" : "Tambah transaksi"}
        </CardTitle>
        <CardDescription>
          {original
            ? "Perubahan memperbarui saldo dan laporan. Rekening tujuan harus memakai mata uang yang sama. Pilih tanpa rincian untuk menghapus rincian barang."
            : "Saldo rekening diperbarui setelah transaksi disimpan. Lampiran gambar dapat ditambahkan dari Detail transaksi setelah tersimpan."}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <FormProvider {...form}>
          <form
            onSubmit={form.handleSubmit(submit, () => setSuccess(""))}
            noValidate
            className="flex flex-col gap-5"
          >
            <FieldSet disabled={pending} className="contents">
              <FieldGroup>
                <Controller
                  name="type"
                  control={form.control}
                  render={({ field, fieldState }) => (
                    <Field data-invalid={fieldState.invalid}>
                      <FieldLabel id={`${id}-type-label`}>
                        Jenis transaksi
                      </FieldLabel>
                      <ToggleGroup
                        variant="outline"
                        value={[field.value]}
                        onBlur={field.onBlur}
                        aria-labelledby={`${id}-type-label`}
                        onValueChange={(values) => {
                          const next = values[0];
                          if (next === "income" || next === "expense") {
                            field.onChange(next);
                            form.setValue(
                              "category",
                              transactionCategories[next][0],
                              { shouldDirty: true },
                            );
                            if (next === "income")
                              form.setValue("detailed", false);
                            form.clearErrors();
                          }
                        }}
                      >
                        <ToggleGroupItem value="expense">
                          <ArrowUpRight data-icon="inline-start" />
                          Pengeluaran
                        </ToggleGroupItem>
                        <ToggleGroupItem value="income">
                          <ArrowDownLeft data-icon="inline-start" />
                          Pemasukan
                        </ToggleGroupItem>
                      </ToggleGroup>
                      {fieldState.invalid && (
                        <FieldError errors={[fieldState.error]} />
                      )}
                    </Field>
                  )}
                />
                <Controller
                  name="name"
                  control={form.control}
                  render={({ field, fieldState }) => (
                    <Field data-invalid={fieldState.invalid}>
                      <FieldLabel htmlFor={`${id}-transaction-name`}>
                        Nama transaksi
                      </FieldLabel>
                      <Input
                        {...field}
                        id={`${id}-transaction-name`}
                        placeholder={
                          type === "income"
                            ? "Contoh: Gaji November"
                            : "Contoh: Makan siang"
                        }
                        aria-invalid={fieldState.invalid}
                      />
                      {fieldState.invalid && (
                        <FieldError errors={[fieldState.error]} />
                      )}
                    </Field>
                  )}
                />
                <Controller
                  name="amount"
                  control={form.control}
                  render={({ field, fieldState }) => (
                    <Field data-invalid={fieldState.invalid}>
                      <FieldLabel htmlFor={`${id}-transaction-amount`}>
                        Nominal ({currency})
                      </FieldLabel>
                      <Input
                        {...field}
                        id={`${id}-transaction-amount`}
                        value={
                          detailed
                            ? Number.isFinite(total)
                              ? total
                              : ""
                            : field.value
                        }
                        readOnly={detailed}
                        type="number"
                        inputMode="numeric"
                        step={currencyStep(currency)}
                        placeholder="50000"
                        aria-invalid={fieldState.invalid}
                      />
                      <FieldDescription>
                        {detailed
                          ? "Total otomatis dari rincian setelah seluruh diskon."
                          : currency === "USD"
                            ? "Maksimal 2 desimal; gunakan titik, contoh 12.50."
                            : "Masukkan nominal utuh tanpa pemisah ribuan."}
                      </FieldDescription>
                      {fieldState.invalid && (
                        <FieldError errors={[fieldState.error]} />
                      )}
                    </Field>
                  )}
                />
                <Controller
                  name="accountId"
                  control={form.control}
                  render={({ field, fieldState }) => (
                    <Field data-invalid={fieldState.invalid}>
                      <FieldLabel htmlFor={`${id}-transaction-account`}>
                        Rekening atau dompet
                      </FieldLabel>
                      <NativeSelect
                        {...field}
                        id={`${id}-transaction-account`}
                        disabled={!accounts.length}
                        aria-invalid={fieldState.invalid}
                      >
                        <NativeSelectOption value="">
                          Pilih rekening / dompet
                        </NativeSelectOption>
                        {accounts.map((account) => (
                          <NativeSelectOption
                            key={account.id}
                            value={account.id}
                          >
                            {account.name} · {account.currency}
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
                  name="category"
                  control={form.control}
                  render={({ field, fieldState }) => (
                    <Field data-invalid={fieldState.invalid}>
                      <FieldLabel htmlFor={`${id}-transaction-category`}>
                        Kategori
                      </FieldLabel>
                      <NativeSelect
                        {...field}
                        id={`${id}-transaction-category`}
                        aria-invalid={fieldState.invalid}
                      >
                        {transactionCategories[type].map((category) => (
                          <NativeSelectOption key={category} value={category}>
                            {category}
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
                  name="date"
                  control={form.control}
                  render={({ field, fieldState }) => (
                    <Field data-invalid={fieldState.invalid}>
                      <FieldLabel htmlFor={`${id}-transaction-date`}>
                        Tanggal transaksi
                      </FieldLabel>
                      <Input
                        {...field}
                        id={`${id}-transaction-date`}
                        type="date"
                        aria-invalid={fieldState.invalid}
                      />
                      {fieldState.invalid && (
                        <FieldError errors={[fieldState.error]} />
                      )}
                    </Field>
                  )}
                />
              </FieldGroup>
              {type === "expense" && (
                <>
                  <Controller
                    name="detailed"
                    control={form.control}
                    render={({ field }) => (
                      <Field>
                        <FieldLabel id={`${id}-detail-mode-label`}>
                          Rincian belanja (opsional)
                        </FieldLabel>
                        <ToggleGroup
                          value={[field.value ? "details" : "simple"]}
                          onBlur={field.onBlur}
                          aria-labelledby={`${id}-detail-mode-label`}
                          variant="outline"
                          onValueChange={(values) => {
                            if (
                              values[0] === "details" ||
                              values[0] === "simple"
                            ) {
                              field.onChange(values[0] === "details");
                              form.clearErrors(["purchase", "amount"]);
                            }
                          }}
                        >
                          <ToggleGroupItem value="simple">
                            Tanpa rincian
                          </ToggleGroupItem>
                          <ToggleGroupItem value="details">
                            Rincikan barang
                          </ToggleGroupItem>
                        </ToggleGroup>
                        <FieldDescription>
                          Tetap dicatat satu kali, dengan atau tanpa rincian
                          barang.
                        </FieldDescription>
                      </Field>
                    )}
                  />
                  {detailed && <PurchaseItemsEditor currency={currency} />}
                </>
              )}
              {form.formState.errors.root && (
                <Alert variant="destructive">
                  <AlertTitle>Transaksi belum disimpan</AlertTitle>
                  <AlertDescription>
                    {form.formState.errors.root.message}
                  </AlertDescription>
                </Alert>
              )}
              <div role="status" aria-live="polite">
                {success && (
                  <Alert role="presentation">
                    <CheckCircle2 />
                    <AlertTitle>Transaksi berhasil dicatat</AlertTitle>
                    <AlertDescription>{success}</AlertDescription>
                  </Alert>
                )}
              </div>
              {!accounts.length && (
                <Alert>
                  <AlertTitle>
                    Tambahkan rekening atau dompet sebelum mencatat transaksi.
                  </AlertTitle>
                  <AlertDescription>
                    <Link href="/accounts" className="underline">
                      Kelola rekening
                    </Link>
                  </AlertDescription>
                </Alert>
              )}
              <Button
                type="submit"
                size="lg"
                disabled={pending || !accounts.length}
              >
                {original ? (
                  <CheckCircle2 data-icon="inline-start" />
                ) : (
                  <Plus data-icon="inline-start" />
                )}
                {pending
                  ? "Menyimpan…"
                  : original
                    ? "Simpan perubahan"
                    : `Simpan ${type === "income" ? "pemasukan" : "pengeluaran"}`}
              </Button>
            </FieldSet>
          </form>
        </FormProvider>
      </CardContent>
    </Card>
  );
}
