import assert from "node:assert/strict";
import { test } from "node:test";
import { buildDashboard, type DashboardTransaction } from "./dashboard.ts";
import { accounts, type Account } from "./finance.ts";
const wallets: Account[] = [
  { ...accounts[0], id: "yen", currency: "JPY", openingBalance: 100 },
  { ...accounts[0], id: "usd", currency: "USD", openingBalance: 0.1 },
];
const tx = (
  id: string,
  date: string,
  amount: number,
  name = "Catatan lama",
): DashboardTransaction => ({
  id,
  date,
  amount,
  name,
  currency: "JPY",
  accountId: "yen",
  category: "Lainnya",
});

test("all-history charts use actual dates, preserve month gaps, and work with only Lainnya", () => {
  const data = buildDashboard(
    wallets,
    [tx("a", "2026-08-05", 500), tx("b", "2026-11-13", -200)],
    "JPY",
  );
  assert.equal(data.granularity, "month");
  assert.deepEqual(
    data.series.map((row) => [row.date, row.income, row.expense, row.balance]),
    [
      ["2026-08-01", 500, 0, 600],
      ["2026-09-01", 0, 0, 600],
      ["2026-10-01", 0, 0, 600],
      ["2026-11-01", 0, 200, 400],
    ],
  );
  assert.equal(data.uncategorized, 2);
  assert.equal(data.ranking[0].expense, 200);
  assert.deepEqual(data.periods, ["2026-11", "2026-08"]);
});
test("monthly balances carry earlier transactions, keep negative balances and exclude later transactions", () => {
  const data = buildDashboard(
    wallets,
    [
      tx("a", "2026-08-01", -200),
      tx("b", "2026-09-03", -10),
      tx("c", "2026-10-01", 1000),
    ],
    "JPY",
    "2026-09",
  );
  assert.equal(data.initial, -100);
  assert.equal(data.closingBalance, -110);
  assert.equal(data.series[0].balance, -100);
  assert.equal(data.series.at(-1)?.balance, -110);
  assert.equal(data.currentBalance, 890);
  assert.equal(data.series.length, 30);
  assert.equal(data.totals.expense, 10);
});
test("currency isolation and cent arithmetic apply to all dashboard aggregates", () => {
  const usd = {
    ...tx("usd", "2026-11-01", 0.2),
    accountId: "usd",
    currency: "USD" as const,
  };
  const data = buildDashboard(
    wallets,
    [usd, tx("yen", "2026-11-01", 5000)],
    "USD",
  );
  assert.equal(data.entries.length, 1);
  assert.equal(data.currentBalance, 0.3);
  assert.equal(data.series[0].balance, 0.3);
  assert.equal(data.byAccount.length, 1);
});
test("rankings group matching notes without inferring categories or including income", () => {
  const data = buildDashboard(
    wallets,
    [
      tx("a", "2026-11-01", -20, "  TOKO   A "),
      tx("b", "2026-11-02", -30, "toko a"),
      tx("c", "2026-11-03", 1000, "TOKO A"),
      tx("d", "2026-11-03", -10, "Toko B"),
    ],
    "JPY",
  );
  assert.equal(data.ranking.length, 2);
  assert.equal(data.ranking[0].expense, 50);
  assert.equal(data.ranking[0].count, 2);
  assert.equal(data.expenseCount, 3);
  assert.equal(data.incomeCount, 1);
  assert.equal(data.averageExpense, 20);
  assert.deepEqual(data.biggestExpenseDay, ["2026-11-02", 30]);
});
test("empty data and one-day history produce finite values and a visible point", () => {
  const empty = buildDashboard([], [], "JPY");
  assert.deepEqual(empty.series, []);
  assert.equal(empty.averageExpense, 0);
  assert.equal(empty.currentBalance, 0);
  const single = buildDashboard(wallets, [tx("a", "2026-11-01", -5)], "JPY");
  assert.equal(single.series.length, 1);
  assert.equal(single.series[0].balance, 95);
  assert.equal(single.totals.income, 0);
});
test("long histories use annual buckets and a leap month includes its final day", () => {
  const annual = buildDashboard(
    wallets,
    [tx("a", "2020-12-31", 10), tx("b", "2026-01-01", -5)],
    "JPY",
  );
  assert.equal(annual.granularity, "year");
  assert.equal(annual.series.length, 7);
  const leap = buildDashboard(
    wallets,
    [tx("c", "2028-02-29", -1)],
    "JPY",
    "2028-02",
  );
  assert.equal(leap.series.length, 29);
  assert.equal(leap.end, "2028-02-29");
});
