"use client";

import { currencyStep, formatMoney, type Currency } from "@/lib/currency";
import {
  Controller,
  useFieldArray,
  useFormContext,
  useWatch,
} from "react-hook-form";
import {
  blankPurchaseItem,
  type TransactionFormInput,
} from "@/lib/form-schemas";
import { useId, useState, type ChangeEvent } from "react";
import { Plus, Trash2 } from "lucide-react";
import {
  type TransactionDraft,
  parsePurchaseDetails,
  purchaseItemTotal,
} from "@/lib/finance";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Field,
  FieldGroup,
  FieldLabel,
  FieldDescription,
  FieldError,
} from "@/components/ui/field";
import { Alert, AlertTitle } from "@/components/ui/alert";
import {
  Table,
  TableHeader,
  TableHead,
  TableBody,
  TableRow,
  TableCell,
} from "@/components/ui/table";

const example = JSON.stringify(
  {
    items: [
      {
        name: "Susu",
        quantity: 2,
        unitPrice: 20000,
        discount: 5000,
        kind: "Minuman",
        group: "Kebutuhan dapur",
      },
    ],
    discount: 2000,
  },
  null,
  2,
);

const itemFields = [
  {
    name: "name",
    label: "Nama barang",
    type: "text",
    placeholder: "Contoh: Susu",
  },
  { name: "quantity", label: "Jumlah", type: "number", placeholder: "1" },
  {
    name: "unitPrice",
    label: "Harga per unit",
    type: "number",
    placeholder: "20000",
  },
  {
    name: "discount",
    label: "Diskon barang",
    type: "number",
    placeholder: "0",
  },
  {
    name: "kind",
    label: "Jenis barang (opsional)",
    type: "text",
    placeholder: "Contoh: Minuman",
  },
  {
    name: "group",
    label: "Kelompok barang (opsional)",
    type: "text",
    placeholder: "Contoh: Kebutuhan dapur",
  },
] as const;

export function PurchaseItemsEditor({ currency }: { currency: Currency }) {
  const id = useId();
  const money = (value: number) => formatMoney(value, currency);
  const form = useFormContext<TransactionFormInput>();
  const { fields, append, remove, replace } = useFieldArray({
    control: form.control,
    name: "purchase.items",
  });
  const items = useWatch({ control: form.control, name: "purchase.items" });
  const [uploadError, setUploadError] = useState("");
  async function upload(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;
    if (file.size > 1_000_000) {
      setUploadError("File maksimal 1 MB.");
      return;
    }
    try {
      const result = parsePurchaseDetails(
        JSON.parse(await file.text()),
        currency,
      );
      if (!result.details) {
        setUploadError(result.error);
        return;
      }
      replace(result.details.items);
      form.setValue("purchase.discount", result.details.discount, {
        shouldDirty: true,
      });
      form.clearErrors("purchase");
      setUploadError("");
    } catch {
      setUploadError("File harus berisi JSON rincian barang yang valid.");
    }
  }
  function downloadExample() {
    const url = URL.createObjectURL(
      new Blob([example], { type: "application/json" }),
    );
    const link = document.createElement("a");
    link.href = url;
    link.download = "contoh-rincian-belanja.json";
    link.click();
    URL.revokeObjectURL(url);
  }
  return (
    <section
      aria-label="Isi rincian barang"
      className="flex flex-col gap-4 rounded-xl border p-4"
    >
      <div>
        <h3 className="font-medium">Rincian barang</h3>
        <p className="mt-1 text-xs leading-5 text-muted-foreground">
          Harga per unit dalam {currency}. Diskon barang berlaku untuk total
          baris, bukan per unit. Subtotal jumlah × harga dibulatkan sesuai mata
          uang rekening.
        </p>
      </div>
      <FieldGroup>
        <Field>
          <FieldLabel htmlFor={`${id}-purchase-upload`}>
            Unggah rincian JSON (opsional)
          </FieldLabel>
          <Input
            id={`${id}-purchase-upload`}
            type="file"
            accept=".json,application/json"
            onChange={upload}
          />
          <FieldDescription>
            Unggahan mengganti rincian yang sedang diisi, maksimal 100 barang.
            Ubah foto struk menjadi JSON lewat AI/OCR terlebih dahulu.
          </FieldDescription>
        </Field>
      </FieldGroup>
      <Button
        type="button"
        variant="outline"
        size="sm"
        onClick={downloadExample}
      >
        Unduh contoh rincian JSON
      </Button>
      {uploadError && (
        <Alert variant="destructive">
          <AlertTitle>{uploadError}</AlertTitle>
        </Alert>
      )}
      {fields.map((item, index) => (
        <section
          key={item.id}
          aria-label={`Barang ${index + 1}`}
          className="flex flex-col gap-3 border-t pt-4"
        >
          <div className="flex items-center justify-between">
            <h4 className="text-sm font-medium">Barang {index + 1}</h4>
            <Button
              type="button"
              variant="ghost"
              size="icon-sm"
              aria-label={`Hapus barang ${index + 1}`}
              onClick={() => remove(index)}
            >
              <Trash2 />
            </Button>
          </div>
          <FieldGroup>
            {itemFields.map((input) => (
              <Controller
                key={input.name}
                name={`purchase.items.${index}.${input.name}`}
                control={form.control}
                render={({ field, fieldState }) => (
                  <Field data-invalid={fieldState.invalid}>
                    <FieldLabel htmlFor={`${item.id}-${input.name}`}>
                      {input.label}
                    </FieldLabel>
                    <Input
                      {...field}
                      id={`${item.id}-${input.name}`}
                      type={input.type}
                      step={
                        input.name === "quantity"
                          ? "any"
                          : currencyStep(currency)
                      }
                      placeholder={input.placeholder}
                      aria-invalid={fieldState.invalid}
                    />
                    {fieldState.invalid && (
                      <FieldError errors={[fieldState.error]} />
                    )}
                  </Field>
                )}
              />
            ))}
          </FieldGroup>
          <p className="text-right text-sm">
            Subtotal:{" "}
            {money(
              purchaseItemTotal(
                {
                  name: "",
                  kind: "",
                  group: "",
                  quantity: Number(items[index]?.quantity ?? 0),
                  unitPrice: Number(items[index]?.unitPrice ?? 0),
                  discount: Number(items[index]?.discount ?? 0),
                },
                currency,
              ),
            )}
          </p>
        </section>
      ))}
      {form.formState.isSubmitted && fields.length === 0 && (
        <FieldError>Tambahkan minimal satu barang.</FieldError>
      )}
      <Button
        type="button"
        variant="outline"
        disabled={fields.length >= 100}
        onClick={() => append(blankPurchaseItem())}
      >
        <Plus data-icon="inline-start" />
        Tambah barang
      </Button>
      <Controller
        name="purchase.discount"
        control={form.control}
        render={({ field, fieldState }) => (
          <Field data-invalid={fieldState.invalid}>
            <FieldLabel htmlFor={`${id}-purchase-discount`}>
              Diskon seluruh belanja ({currency})
            </FieldLabel>
            <Input
              {...field}
              id={`${id}-purchase-discount`}
              type="number"
              step={currencyStep(currency)}
              aria-invalid={fieldState.invalid}
            />
            <FieldDescription>
              Diskon tambahan setelah diskon per barang. Isi 0 jika tidak ada.
            </FieldDescription>
            {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
          </Field>
        )}
      />
    </section>
  );
}

export function PurchaseDetailsContent({
  transaction,
}: {
  transaction: Pick<
    TransactionDraft,
    "items" | "discount" | "amount" | "currency"
  >;
}) {
  const money = (value: number) => formatMoney(value, transaction.currency);
  if (!transaction.items?.length) return null;
  return (
    <div className="flex min-w-0 flex-col gap-4">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Barang</TableHead>
            <TableHead>Harga / diskon</TableHead>
            <TableHead className="text-right">Subtotal</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {transaction.items.map((item, index) => (
            <TableRow key={index}>
              <TableCell>
                <p className="wrap-break-word whitespace-normal">
                  {item.name} × {item.quantity}
                </p>
                <p className="text-xs text-muted-foreground">
                  {`Jenis: ${item.kind || "Belum diisi"} · Kelompok: ${item.group || "Belum diisi"}`}
                </p>
              </TableCell>
              <TableCell>
                <p>{money(item.unitPrice)} / unit</p>
                <p className="text-xs text-muted-foreground">
                  Diskon barang {money(item.discount)}
                </p>
              </TableCell>
              <TableCell className="text-right">
                {money(purchaseItemTotal(item, transaction.currency))}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
      <p className="text-sm">
        Diskon seluruh belanja: {money(transaction.discount ?? 0)}
      </p>
      <p className="font-medium">
        Total dibayar: {money(Math.abs(transaction.amount))}
      </p>
    </div>
  );
}
