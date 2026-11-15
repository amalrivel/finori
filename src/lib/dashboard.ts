import { sumMoney, type Currency } from "./currency.ts";
import {
  accountSummary,
  summarize,
  type Account,
  type TransactionDraft,
} from "./finance.ts";

export type DashboardTransaction = TransactionDraft & {
  id: string;
  createdAt?: string;
};
export function buildDashboard(
  accounts: readonly Account[],
  transactions: readonly DashboardTransaction[],
  currency: Currency,
  period = "all",
) {
  const selectedAccounts = accounts.filter(
    (account) => account.currency === currency,
  );
  const ids = new Set(selectedAccounts.map((account) => account.id));
  const history = transactions
    .filter((transaction) => ids.has(transaction.accountId))
    .toSorted(
      (a, b) => a.date.localeCompare(b.date) || a.id.localeCompare(b.id),
    );
  const periods = [
    ...new Set(history.map((transaction) => transaction.date.slice(0, 7))),
  ]
    .toSorted()
    .reverse();
  const entries =
    period === "all"
      ? history
      : history.filter((transaction) =>
          transaction.date.startsWith(period + "-"),
        );
  const start = period === "all" ? history[0]?.date : `${period}-01`;
  let end = period === "all" ? history.at(-1)?.date : undefined;
  if (period !== "all") {
    const date = new Date(`${period}-01T00:00:00Z`);
    date.setUTCMonth(date.getUTCMonth() + 1);
    date.setUTCDate(0);
    end = date.toISOString().slice(0, 10);
  }
  const totals = summarize(entries);
  const initial = sumMoney([
    ...selectedAccounts.map((account) => account.openingBalance),
    ...history
      .filter((transaction) => start && transaction.date < start)
      .map((transaction) => transaction.amount),
  ]);
  const days =
    start && end
      ? Math.round((Date.parse(end) - Date.parse(start)) / 86400000) + 1
      : 0;
  const months =
    start && end
      ? (Number(end.slice(0, 4)) - Number(start.slice(0, 4))) * 12 +
        Number(end.slice(5, 7)) -
        Number(start.slice(5, 7)) +
        1
      : 0;
  const granularity = days <= 62 ? "day" : months <= 24 ? "month" : "year";
  const key = (date: string) =>
    date.slice(0, granularity === "day" ? 10 : granularity === "month" ? 7 : 4);
  const buckets = new Map<
    string,
    { date: string; income: number; expense: number; count: number }
  >();
  if (start && end) {
    const cursor = new Date(`${start}T00:00:00Z`);
    if (granularity !== "day") cursor.setUTCDate(1);
    if (granularity === "year") cursor.setUTCMonth(0);
    while (cursor.toISOString().slice(0, 10) <= end) {
      const date = cursor.toISOString().slice(0, 10);
      buckets.set(key(date), { date, income: 0, expense: 0, count: 0 });
      if (granularity === "day") cursor.setUTCDate(cursor.getUTCDate() + 1);
      else if (granularity === "month")
        cursor.setUTCMonth(cursor.getUTCMonth() + 1);
      else cursor.setUTCFullYear(cursor.getUTCFullYear() + 1);
      // Postgres accepts year 9999; avoid emitting a non-ISO five-digit chart date.
      if (cursor.getUTCFullYear() > 9999) break;
    }
  }
  const names = new Map<
    string,
    { name: string; expense: number; count: number }
  >();
  const expenseDays = new Map<string, number>();
  for (const transaction of entries) {
    const bucket = buckets.get(key(transaction.date));
    if (bucket) {
      bucket.income = sumMoney([
        bucket.income,
        Math.max(transaction.amount, 0),
      ]);
      bucket.expense = sumMoney([
        bucket.expense,
        Math.max(-transaction.amount, 0),
      ]);
      bucket.count++;
    }
    if (transaction.amount < 0) {
      const name = transaction.name.trim().replace(/\s+/g, " ");
      const normalized = name.normalize("NFKC").toLocaleLowerCase("id-ID");
      const group = names.get(normalized) ?? { name, expense: 0, count: 0 };
      group.expense = sumMoney([group.expense, -transaction.amount]);
      group.count++;
      names.set(normalized, group);
      expenseDays.set(
        transaction.date,
        sumMoney([expenseDays.get(transaction.date) ?? 0, -transaction.amount]),
      );
    }
  }
  let balance = initial;
  const series = [...buckets.values()].map((bucket) => {
    balance = sumMoney([balance, bucket.income, -bucket.expense]);
    return { ...bucket, balance };
  });
  const expenseCount = entries.filter(
    (transaction) => transaction.amount < 0,
  ).length;
  return {
    periods,
    entries,
    start,
    end,
    granularity,
    series,
    initial,
    totals,
    currentBalance: sumMoney(
      selectedAccounts.map(
        (account) => accountSummary(account, history).balance,
      ),
    ),
    closingBalance: sumMoney([initial, totals.balance]),
    incomeCount: entries.length - expenseCount,
    expenseCount,
    uncategorized: entries.filter(
      (transaction) => transaction.category === "Lainnya",
    ).length,
    activeDays: new Set(entries.map((transaction) => transaction.date)).size,
    averageExpense: expenseCount ? totals.expense / expenseCount : 0,
    biggestExpenseDay: [...expenseDays].toSorted((a, b) => b[1] - a[1])[0],
    ranking: [...names.values()].toSorted(
      (a, b) => b.expense - a.expense || a.name.localeCompare(b.name),
    ),
    byAccount: selectedAccounts.map((account) => ({
      id: account.id,
      name: account.name,
      ...summarize(
        entries.filter((transaction) => transaction.accountId === account.id),
      ),
      currentBalance: accountSummary(account, history).balance,
      count: entries.filter(
        (transaction) => transaction.accountId === account.id,
      ).length,
    })),
  };
}
export type DashboardData = ReturnType<typeof buildDashboard>;
