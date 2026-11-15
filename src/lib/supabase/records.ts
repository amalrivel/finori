import type { Account, TransactionDraft } from "@/lib/finance";
import type { Database, Json } from "./database.types";

type AccountRow = Database["public"]["Tables"]["accounts"]["Row"];
export type TransactionRow =
  Database["public"]["Tables"]["transactions"]["Row"];
export const accountFromRow = (row: AccountRow): Account => ({
  id: row.id,
  currency: row.currency as Account["currency"],
  name: row.name,
  kind: row.kind as Account["kind"],
  description: row.description,
  openingBalance: row.opening_balance,
});
export const accountToRow = (account: Account, userId: string) => ({
  id: account.id,
  user_id: userId,
  name: account.name,
  kind: account.kind,
  currency: account.currency,
  description: account.description,
  opening_balance: account.openingBalance,
});
export const transactionFromRow = (
  row: TransactionRow,
): TransactionDraft & { id: string } => ({
  id: row.id,
  accountId: row.account_id,
  currency: row.currency as Account["currency"],
  name: row.name,
  category: row.category,
  date: row.date,
  amount: row.amount,
  ...(row.items
    ? { items: row.items as TransactionDraft["items"], discount: row.discount }
    : {}),
});
export const transactionToRow = (
  transaction: TransactionDraft,
  userId: string,
) => ({
  user_id: userId,
  account_id: transaction.accountId,
  currency: transaction.currency,
  name: transaction.name,
  category: transaction.category,
  date: transaction.date,
  amount: transaction.amount,
  items: (transaction.items ?? null) as Json,
  discount: transaction.discount ?? 0,
});
