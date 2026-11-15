import { validPrecision, type Currency } from "./currency.ts";
import { z } from "zod";
import {
  accountSchema,
  createTransactionSchema,
  moneySchema,
  createPurchaseDetailsSchema,
  purchaseItemSchema,
  type Account,
} from "./finance.ts";

const unsignedInput = z.union([
  z.number(),
  z
    .string()
    .regex(/^\d+(?:\.\d{1,2})?$/, "Masukkan angka dengan maksimal 2 desimal.")
    .transform(Number),
]);
const signedInput = z.union([
  z.number(),
  z
    .string()
    .regex(/^-?\d+(?:\.\d{1,2})?$/, "Masukkan angka dengan maksimal 2 desimal.")
    .transform(Number),
]);
export const accountFormSchema = z
  .object({
    ...accountSchema.shape,
    openingBalance: signedInput.pipe(accountSchema.shape.openingBalance),
  })
  .superRefine((value, ctx) => {
    if (!validPrecision(value.openingBalance, value.currency))
      ctx.addIssue({
        code: "custom",
        path: ["openingBalance"],
        message: `${value.currency} memerlukan saldo ${value.currency === "USD" ? "maksimal 2 desimal" : "utuh"}.`,
      });
  });
export const createAuthSchema = (mode: string) =>
  z.object({
    email: z.string().trim().email("Masukkan alamat email yang valid."),
    password: z
      .string()
      .min(
        mode === "register" ? 8 : 1,
        mode === "register"
          ? "Password minimal 8 karakter."
          : "Masukkan password.",
      ),
  });
export const importFormSchema = z.object({
  source: z
    .string()
    .trim()
    .min(1, "Tempel data JSON terlebih dahulu.")
    .max(1_000_000, "Maksimal 1 juta karakter."),
});
const quantityInput = z
  .union([
    z.number(),
    z.string().trim().min(1, "Masukkan jumlah barang.").transform(Number),
  ])
  .pipe(purchaseItemSchema.shape.quantity);
const itemFormSchema = z.object({
  ...purchaseItemSchema.shape,
  quantity: quantityInput,
  unitPrice: unsignedInput.pipe(moneySchema),
  discount: unsignedInput.pipe(moneySchema),
});
const purchaseFormSchema = (currency: Currency) =>
  z
    .object({
      items: z.array(itemFormSchema),
      discount: unsignedInput.pipe(moneySchema),
    })
    .transform((value, ctx) => {
      const result = createPurchaseDetailsSchema(currency).safeParse(value);
      if (!result.success) {
        for (const issue of result.error.issues)
          ctx.addIssue({
            code: "custom",
            path: issue.path,
            message: issue.message,
          });
        return z.NEVER;
      }
      return result.data;
    });
const rawNumber = z.union([z.number(), z.string()]);
export function createTransactionFormSchema(
  availableAccounts: readonly Account[],
) {
  return z
    .object({
      type: z.enum(["income", "expense"]),
      name: z.string(),
      accountId: z.string(),
      category: z.string(),
      date: z.string(),
      amount: rawNumber,
      detailed: z.boolean(),
      purchase: z.object({
        items: z.array(
          z.object({
            name: z.string(),
            quantity: rawNumber,
            unitPrice: rawNumber,
            discount: rawNumber,
            kind: z.string(),
            group: z.string(),
          }),
        ),
        discount: rawNumber,
      }),
    })
    .transform((value, ctx) => {
      let purchase;
      if (value.detailed && value.type === "expense") {
        const parsed = purchaseFormSchema(
          availableAccounts.find((account) => account.id === value.accountId)
            ?.currency ?? "IDR",
        ).safeParse(value.purchase);
        if (!parsed.success) {
          for (const issue of parsed.error.issues)
            ctx.addIssue({
              code: "custom",
              message: issue.message,
              path: ["purchase", ...issue.path],
            });
          return z.NEVER;
        }
        purchase = parsed.data;
      }
      const amount = purchase
        ? { success: true as const, data: purchase.total }
        : unsignedInput
            .pipe(moneySchema.positive("Nominal harus lebih dari nol."))
            .safeParse(value.amount);
      if (!amount.success) {
        for (const issue of amount.error.issues)
          ctx.addIssue({
            code: "custom",
            message: issue.message,
            path: ["amount", ...issue.path],
          });
      }
      const parsed = createTransactionSchema(availableAccounts).safeParse({
        ...value,
        amount: amount.success ? amount.data : 1,
        purchase: purchase
          ? { items: purchase.items, discount: purchase.discount }
          : undefined,
      });
      if (!parsed.success) {
        for (const issue of parsed.error.issues)
          ctx.addIssue({
            code: "custom",
            path: issue.path,
            message: issue.message,
          });
        return z.NEVER;
      }
      if (!amount.success) return z.NEVER;
      return parsed.data;
    });
}
export type TransactionFormInput = z.input<
  ReturnType<typeof createTransactionFormSchema>
>;
export const blankPurchaseItem = () => ({
  name: "",
  quantity: 1,
  unitPrice: 0,
  discount: 0,
  kind: "",
  group: "",
});
