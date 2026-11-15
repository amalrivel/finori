import { z } from "zod";
import {
  currencies,
  validPrecision,
  purchaseSubtotal,
  sumMoney,
  formatMoney,
  type Currency,
} from "./currency.ts";

export function summarize(transactions: readonly { amount: number }[]) {
  let income = 0;
  let expense = 0;
  for (const { amount } of transactions) {
    income = sumMoney([income, Math.max(amount, 0)]);
    expense = sumMoney([expense, Math.max(-amount, 0)]);
  }
  return { income, expense, balance: sumMoney([income, -expense]) };
}

export type Account = {
  id: string;
  name: string;
  kind: "Rekening bank" | "Dompet digital" | "Tunai";
  description: string;
  openingBalance: number;
  currency: Currency;
};

export const accounts: Account[] = [
  {
    id: "bca",
    name: "BCA Tahapan",
    kind: "Rekening bank",
    description: "Rekening utama · •••• 4821",
    currency: "IDR",
    openingBalance: 0,
  },
  {
    id: "jago",
    name: "Bank Jago",
    kind: "Rekening bank",
    description: "Rekening tabungan · •••• 9062",
    currency: "IDR",
    openingBalance: 0,
  },
  {
    id: "gopay",
    name: "GoPay",
    kind: "Dompet digital",
    description: "Kebutuhan harian · •••• 0812",
    currency: "IDR",
    openingBalance: 500000,
  },
  {
    id: "cash",
    name: "Dompet tunai",
    kind: "Tunai",
    description: "Uang tunai di dompetmu",
    currency: "IDR",
    openingBalance: 150000,
  },
];

export const rupiah = (value: number) => formatMoney(value, "IDR");

export function accountSummary(
  account: Account,
  transactions: readonly { accountId: string; amount: number }[],
) {
  const entries = transactions.filter(
    (transaction) => transaction.accountId === account.id,
  );
  const summary = summarize(entries);
  return {
    ...summary,
    balance: sumMoney([account.openingBalance, summary.balance]),
  };
}

export function currencySummary(
  availableAccounts: readonly Account[],
  transactions: readonly { accountId: string; amount: number }[],
) {
  return currencies
    .filter((currency) =>
      availableAccounts.some((account) => account.currency === currency),
    )
    .map((currency) => {
      const group = availableAccounts.filter(
        (account) => account.currency === currency,
      );
      const ids = new Set(group.map((account) => account.id));
      const summary = summarize(
        transactions.filter((transaction) => ids.has(transaction.accountId)),
      );
      return {
        currency,
        ...summary,
        balance: sumMoney([
          ...group.map((account) => account.openingBalance),
          summary.balance,
        ]),
      };
    });
}

export const transactionCategories = {
  income: ["Gaji", "Freelance", "Lainnya"],
  expense: ["Makanan", "Belanja", "Transportasi", "Tagihan", "Lainnya"],
};

export type PurchaseItem = {
  name: string;
  quantity: number;
  unitPrice: number;
  discount: number;
  kind: string;
  group: string;
};
export type PurchaseDetails = {
  items: PurchaseItem[];
  discount: number;
  total: number;
};
export const purchaseItemTotal = (
  item: PurchaseItem,
  currency: Currency = "IDR",
) =>
  sumMoney([
    purchaseSubtotal(item.quantity, item.unitPrice, currency),
    -item.discount,
  ]);

export const accountKinds = [
  "Rekening bank",
  "Dompet digital",
  "Tunai",
] as const;
export const moneySchema = z
  .number({ error: "Masukkan nominal berupa angka." })
  .refine((value) => validPrecision(value, "USD"), "Maksimal 2 angka desimal.")
  .min(0, "Nominal tidak boleh negatif.")
  .max(1_000_000_000_000, "Maksimal 1 triliun unit mata uang.");
const nameSchema = z
  .string()
  .trim()
  .min(1, "Nama wajib diisi.")
  .max(80, "Maksimal 80 karakter.");
export const accountSchema = z.object({
  currency: z.enum(currencies).default("IDR"),
  name: nameSchema,
  description: z.string().trim().max(160, "Maksimal 160 karakter."),
  kind: z.enum(accountKinds, { error: "Pilih jenis rekening yang tersedia." }),
  openingBalance: z
    .number({ error: "Masukkan saldo awal." })
    .refine(
      (value) => validPrecision(value, "USD"),
      "Maksimal 2 angka desimal.",
    )
    .min(-1_000_000_000_000, "Minimal −1 triliun unit mata uang.")
    .max(1_000_000_000_000, "Maksimal 1 triliun unit mata uang."),
});
export const createPurchaseItemSchema = (currency: Currency = "IDR") =>
  z
    .strictObject({
      name: nameSchema,
      quantity: z
        .number({ error: "Masukkan jumlah barang." })
        .positive("Jumlah harus lebih dari nol.")
        .max(1_000_000, "Jumlah maksimal 1 juta."),
      unitPrice: moneySchema,
      discount: moneySchema.default(0),
      kind: z.string().max(80, "Maksimal 80 karakter.").trim().default(""),
      group: z.string().max(80, "Maksimal 80 karakter.").trim().default(""),
    })
    .superRefine((item, ctx) => {
      const subtotal = purchaseSubtotal(
        item.quantity,
        item.unitPrice,
        currency,
      );
      for (const key of ["unitPrice", "discount"] as const)
        if (!validPrecision(item[key], currency))
          ctx.addIssue({
            code: "custom",
            path: [key],
            message: `${currency} memerlukan nominal ${currency === "USD" ? "maksimal 2 desimal" : "utuh"}.`,
          });
      if (!Number.isFinite(subtotal) || subtotal > 1_000_000_000_000)
        ctx.addIssue({
          code: "custom",
          path: ["unitPrice"],
          message: "Subtotal barang maksimal 1 triliun unit mata uang.",
        });
      if (item.discount > subtotal)
        ctx.addIssue({
          code: "custom",
          path: ["discount"],
          message: "Diskon tidak boleh melebihi subtotal barang.",
        });
    });
export const purchaseItemSchema = createPurchaseItemSchema();
export const createPurchaseDetailsSchema = (currency: Currency = "IDR") =>
  z
    .strictObject({
      items: z
        .array(createPurchaseItemSchema(currency))
        .min(1, "Tambahkan minimal satu barang.")
        .max(100, "Maksimal 100 barang."),
      discount: moneySchema.default(0),
    })
    .superRefine((value, ctx) => {
      const total = sumMoney([
        ...value.items.map((item) => purchaseItemTotal(item, currency)),
        -value.discount,
      ]);
      if (!validPrecision(value.discount, currency))
        ctx.addIssue({
          code: "custom",
          path: ["discount"],
          message: `${currency} memerlukan nominal ${currency === "USD" ? "maksimal 2 desimal" : "utuh"}.`,
        });
      if (!Number.isFinite(total) || total <= 0 || total > 1_000_000_000_000)
        ctx.addIssue({
          code: "custom",
          path: ["discount"],
          message:
            "Total setelah diskon harus lebih dari nol dan maksimal 1 triliun unit mata uang.",
        });
    })
    .transform((value) => ({
      ...value,
      total: sumMoney([
        ...value.items.map((item) => purchaseItemTotal(item, currency)),
        -value.discount,
      ]),
    }));
export const purchaseDetailsSchema = createPurchaseDetailsSchema();
export function parsePurchaseDetails(
  value: unknown,
  currency: Currency = "IDR",
):
  | { details: PurchaseDetails; error?: never }
  | { error: string; details?: never } {
  const result = createPurchaseDetailsSchema(currency).safeParse(value);
  if (!result.success)
    return {
      error: result.error.issues
        .map(
          (issue) =>
            `${issue.path[0] === "items" && typeof issue.path[1] === "number" ? `Barang ${issue.path[1] + 1}: ` : ""}${issue.message}`,
        )
        .join(" "),
    };
  return { details: result.data };
}
export function createTransactionSchema(availableAccounts: readonly Account[]) {
  return z
    .object({
      type: z.enum(["income", "expense"], { error: "Pilih jenis transaksi." }),
      accountId: z
        .string()
        .refine(
          (id) => availableAccounts.some((account) => account.id === id),
          "Pilih rekening atau dompet yang tersedia.",
        ),
      name: nameSchema,
      category: z.string().min(1, "Pilih kategori."),
      date: z
        .string()
        .regex(/^\d{4}-\d{2}-\d{2}$/, "Masukkan tanggal yang valid.")
        .refine((date) => {
          const value = new Date(date + "T00:00:00Z");
          return (
            date >= "0001-01-01" &&
            Number.isFinite(value.getTime()) &&
            value.toISOString().slice(0, 10) === date
          );
        }, "Masukkan tanggal kalender yang valid."),
      amount: moneySchema.positive("Nominal harus lebih dari nol."),
      purchase: z.unknown().optional(),
    })
    .transform((value, ctx) => {
      const currency =
        availableAccounts.find((account) => account.id === value.accountId)
          ?.currency ?? "IDR";
      if (!validPrecision(value.amount, currency))
        ctx.addIssue({
          code: "custom",
          path: ["amount"],
          message: `${currency} memerlukan nominal ${currency === "USD" ? "maksimal 2 desimal" : "utuh"}.`,
        });
      let purchase: PurchaseDetails | undefined;
      if (value.purchase !== undefined) {
        const parsed = createPurchaseDetailsSchema(currency).safeParse(
          value.purchase,
        );
        if (!parsed.success) {
          for (const issue of parsed.error.issues)
            ctx.addIssue({
              code: "custom",
              path: ["purchase", ...issue.path],
              message: issue.message,
            });
          return z.NEVER;
        }
        purchase = parsed.data;
      }
      return { ...value, currency, purchase };
    })
    .superRefine((value, ctx) => {
      if (!transactionCategories[value.type].includes(value.category))
        ctx.addIssue({
          code: "custom",
          path: ["category"],
          message: "Pilih kategori yang sesuai jenis transaksi.",
        });
      if (value.purchase && value.type !== "expense")
        ctx.addIssue({
          code: "custom",
          path: ["purchase"],
          message: "Rincian barang hanya untuk pengeluaran.",
        });
      if (value.purchase && value.purchase.total !== value.amount)
        ctx.addIssue({
          code: "custom",
          path: ["amount"],
          message: "Nominal harus sama dengan total rincian setelah diskon.",
        });
    })
    .transform((value) => ({
      accountId: value.accountId,
      currency: value.currency,
      name: value.name,
      category: value.category,
      date: value.date,
      amount: value.type === "income" ? value.amount : -value.amount,
      ...(value.purchase
        ? { items: value.purchase.items, discount: value.purchase.discount }
        : {}),
    }));
}
export function parseTransaction(
  data: FormData,
  purchase?: unknown,
  availableAccounts: readonly Account[] = accounts,
) {
  const rawAmount = String(data.get("amount") ?? "");
  if (!/^\d+(?:\.\d{1,2})?$/.test(rawAmount))
    return {
      error: "Nominal harus berupa angka positif dengan maksimal 2 desimal.",
    };
  const result = createTransactionSchema(availableAccounts).safeParse({
    ...Object.fromEntries(data),
    amount: Number(rawAmount),
    purchase,
  });
  return result.success
    ? { transaction: result.data }
    : { error: result.error.issues[0].message };
}

export type TransactionDraft = NonNullable<
  ReturnType<typeof parseTransaction>["transaction"]
>;
export const JSON_IMPORT_LIMIT = 500;

export function parseTransactionJson(
  source: string,
  availableAccounts: readonly Account[] = accounts,
): {
  transactions: TransactionDraft[];
  errors: string[];
} {
  if (source.length > 1_000_000)
    return {
      transactions: [],
      errors: ["JSON terlalu besar. Maksimal 1 juta karakter."],
    };
  let rows: unknown;
  try {
    const text = source
      .trim()
      .replace(/^```(?:json)?\s*([\s\S]*?)\s*```$/i, "$1");
    rows = JSON.parse(text);
  } catch {
    return {
      transactions: [],
      errors: [
        "JSON tidak valid. Tempel array JSON tanpa penjelasan tambahan.",
      ],
    };
  }
  if (
    !Array.isArray(rows) ||
    rows.length === 0 ||
    rows.length > JSON_IMPORT_LIMIT
  )
    return {
      transactions: [],
      errors: [`Gunakan array berisi 1–${JSON_IMPORT_LIMIT} transaksi.`],
    };
  const transactions: TransactionDraft[] = [];
  const errors: string[] = [];
  const fields = ["type", "accountId", "name", "amount", "category", "date"];
  rows.forEach((row: unknown, index: number) => {
    const prefix = `Transaksi ${index + 1}: `;
    if (typeof row !== "object" || row === null || Array.isArray(row)) {
      errors.push(prefix + "harus berupa objek.");
      return;
    }
    const entry = row as Record<string, unknown>;
    if (
      Object.keys(entry).some(
        (key) => ![...fields, "items", "discount", "currency"].includes(key),
      ) ||
      fields.some(
        (key) => typeof entry[key] !== (key === "amount" ? "number" : "string"),
      )
    ) {
      errors.push(
        prefix +
          "gunakan tepat field type, accountId, name, amount (angka), category, dan date (teks), serta items/discount opsional.",
      );
      return;
    }
    if (
      entry.currency !== undefined &&
      entry.currency !==
        availableAccounts.find((account) => account.id === entry.accountId)
          ?.currency
    ) {
      errors.push(prefix + "Mata uang harus sesuai rekening.");
      return;
    }
    const data = new FormData();
    for (const key of fields) data.set(key, String(entry[key]));
    const purchase =
      "items" in entry || "discount" in entry
        ? { items: entry.items, discount: entry.discount }
        : undefined;
    const parsed = parseTransaction(data, purchase, availableAccounts);
    if (parsed.transaction) transactions.push(parsed.transaction);
    else errors.push(prefix + parsed.error);
  });
  return { transactions: errors.length ? [] : transactions, errors };
}

export function parseAccount(data: FormData) {
  const raw = String(data.get("openingBalance") ?? "");
  if (!/^-?\d+(?:\.\d{1,2})?$/.test(raw))
    return {
      error: "Saldo awal harus berupa angka dengan maksimal 2 desimal.",
    };
  const result = accountSchema.safeParse({
    ...Object.fromEntries(data),
    openingBalance: Number(raw),
  });
  if (
    result.success &&
    !validPrecision(result.data.openingBalance, result.data.currency)
  )
    return { error: "Saldo awal tidak sesuai presisi mata uang." };
  return result.success
    ? { account: result.data }
    : { error: result.error.issues[0].message };
}

export function removeAccount(
  availableAccounts: readonly Account[],
  transactions: readonly { accountId: string }[],
  accountId: string,
) {
  if (!availableAccounts.some((account) => account.id === accountId))
    return { error: "Rekening tidak ditemukan." };
  if (transactions.some((transaction) => transaction.accountId === accountId))
    return {
      error:
        "Rekening yang memiliki transaksi tidak dapat dihapus agar riwayat tetap utuh.",
    };
  return {
    accounts: availableAccounts.filter((account) => account.id !== accountId),
  };
}
