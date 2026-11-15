import assert from "node:assert/strict";
import { test } from "node:test";
import { summarize } from "./finance.ts";

test("summarizes income, expenses, and a negative balance without mutating transactions", () => {
  const transactions = Object.freeze([
    { amount: 100000 },
    { amount: -125000 },
    { amount: 0 },
  ]);
  assert.deepEqual(summarize(transactions), {
    income: 100000,
    expense: 125000,
    balance: -25000,
  });
  assert.deepEqual(summarize([]), { income: 0, expense: 0, balance: 0 });
});

import { accountSummary, accounts } from "./finance.ts";

test("account balances include opening balances and exclude other accounts", () => {
  const transactions = [
    { accountId: "gopay", amount: -65000 },
    { accountId: "gopay", amount: 100000 },
    { accountId: "bca", amount: 12500000 },
  ];
  const wallet = accounts.find((account) => account.id === "gopay")!;
  assert.deepEqual(accountSummary(wallet, transactions), {
    income: 100000,
    expense: 65000,
    balance: 535000,
  });
  assert.equal(accountSummary(wallet, []).balance, wallet.openingBalance);
  const total = accounts.reduce(
    (sum, account) => sum + accountSummary(account, transactions).balance,
    0,
  );
  assert.equal(
    total,
    accounts.reduce((sum, account) => sum + account.openingBalance, 0) +
      summarize(transactions).balance,
  );
});

import { parseTransaction } from "./finance.ts";

function transactionForm(overrides: Record<string, string> = {}) {
  const form = new FormData();
  for (const [key, value] of Object.entries({
    type: "expense",
    accountId: "gopay",
    name: "  Makan siang  ",
    amount: "25000",
    category: "Makanan",
    date: "2026-11-15",
    ...overrides,
  }))
    form.set(key, value);
  return form;
}

test("records signed amounts and updates only the selected account", () => {
  const expense = parseTransaction(transactionForm()).transaction!;
  assert.equal(expense.amount, -25000);
  assert.equal(expense.name, "Makan siang");
  const income = parseTransaction(
    transactionForm({ type: "income", category: "Gaji" }),
  ).transaction!;
  assert.equal(income.amount, 25000);
  assert.equal(
    accountSummary(
      accounts.find((account) => account.id === "gopay")!,
      [expense, income],
    ).balance,
    500000,
  );
  assert.equal(
    accountSummary(
      accounts.find((account) => account.id === "bca")!,
      [expense],
    ).balance,
    0,
  );
});

test("rejects invalid amounts, accounts, categories, names and calendar dates", () => {
  const invalidInputs: Record<string, string>[] = [
    { amount: "0" },
    { amount: "-1" },
    { amount: "1.5" },
    { amount: "1e3" },
    { amount: "1000000000001" },
    { accountId: "missing" },
    { name: "   " },
    { date: "2026-02-30" },
    { date: "bad-date" },
    { type: "transfer" },
    { category: "Gaji" },
  ];
  for (const overrides of invalidInputs) {
    assert.ok(
      parseTransaction(transactionForm(overrides)).error,
      JSON.stringify(overrides),
    );
  }
  assert.ok(
    parseTransaction(transactionForm({ date: "2028-02-29" })).transaction,
  );
});

import { parseTransactionJson, JSON_IMPORT_LIMIT } from "./finance.ts";

const importRow = {
  type: "expense",
  accountId: "gopay",
  name: "Makan siang",
  amount: 25000,
  category: "Makanan",
  date: "2026-11-15",
};

test("imports mixed JSON batches with shared validation and signed amounts", () => {
  const result = parseTransactionJson(
    "```json\n" +
      JSON.stringify([
        importRow,
        { ...importRow, type: "income", category: "Gaji", amount: 100000 },
      ]) +
      "\n```",
  );
  assert.deepEqual(result.errors, []);
  assert.deepEqual(
    result.transactions.map((transaction) => transaction.amount),
    [-25000, 100000],
  );
  assert.equal(
    accountSummary(
      accounts.find((account) => account.id === "gopay")!,
      result.transactions,
    ).balance,
    575000,
  );
});

test("rejects an entire JSON batch when any row is invalid and identifies its index", () => {
  for (const invalid of [
    null,
    [],
    { ...importRow, amount: "25000" },
    { ...importRow, accountId: "missing" },
    { ...importRow, amount: -1 },
    { ...importRow, date: "2026-02-30" },
    { ...importRow, category: "Gaji" },
    { ...importRow, extra: "unexpected" },
  ]) {
    const result = parseTransactionJson(JSON.stringify([importRow, invalid]));
    assert.deepEqual(result.transactions, []);
    assert.ok(result.errors[0].startsWith("Transaksi 2:"));
  }
});

test("rejects malformed, empty, oversized, and non-array JSON", () => {
  for (const input of [
    "not-json",
    "[]",
    "null",
    "{}",
    JSON.stringify(importRow),
    " ".repeat(1_000_001),
    JSON.stringify(
      Array.from({ length: JSON_IMPORT_LIMIT + 1 }, () => importRow),
    ),
  ]) {
    const result = parseTransactionJson(input);
    assert.deepEqual(result.transactions, []);
    assert.ok(result.errors.length > 0);
  }
  assert.equal(
    parseTransactionJson(
      JSON.stringify(
        Array.from({ length: JSON_IMPORT_LIMIT }, () => importRow),
      ),
    ).transactions.length,
    JSON_IMPORT_LIMIT,
  );
});

import { parsePurchaseDetails, purchaseItemTotal } from "./finance.ts";

const receipt = {
  items: [
    {
      name: "Susu",
      quantity: 2,
      unitPrice: 20000,
      discount: 5000,
      kind: "Minuman",
      group: "Dapur",
    },
    { name: "Roti", quantity: 1, unitPrice: 10000 },
  ],
  discount: 2000,
};

test("keeps item details in a single transaction and applies both discount levels once", () => {
  const details = parsePurchaseDetails(receipt).details!;
  assert.equal(details.total, 43000);
  assert.equal(purchaseItemTotal(details.items[0]), 35000);
  assert.equal(details.items[0].kind, "Minuman");
  assert.equal(details.items[1].discount, 0);
  const result = parseTransaction(
    transactionForm({ amount: "43000" }),
    receipt,
  ).transaction!;
  assert.equal(result.amount, -43000);
  assert.equal(result.items?.length, 2);
  assert.equal(summarize([result]).expense, 43000);
  assert.equal(
    parseTransaction(transactionForm()).transaction?.items,
    undefined,
  );
  assert.equal(
    parsePurchaseDetails({
      items: [{ name: "Tepung", quantity: 0.125, unitPrice: 10004 }],
    }).details?.total,
    1251,
  );
});

test("rejects inconsistent receipt totals and invalid item discounts", () => {
  assert.ok(
    parseTransaction(transactionForm({ amount: "43001" }), receipt).error,
  );
  assert.ok(
    parseTransaction(
      transactionForm({ amount: "43000", type: "income", category: "Gaji" }),
      receipt,
    ).error,
  );
  for (const invalid of [
    { items: [] },
    { items: [null] },
    { items: [{ name: "Susu", quantity: 0, unitPrice: 10 }] },
    { items: [{ name: "Susu", quantity: 1, unitPrice: 10, discount: 11 }] },
    { items: [{ name: "Susu", quantity: 1, unitPrice: 10, discount: -1 }] },
    { items: [{ name: "Susu", quantity: 1, unitPrice: 10.5 }] },
    { items: [{ name: "Susu", quantity: 1, unitPrice: 10, kind: 42 }] },
    { items: receipt.items, discount: 45000 },
    { items: receipt.items, discount: -1 },
    { items: receipt.items, discount: 0.5 },
    { items: Array(101).fill(receipt.items[0]) },
  ])
    assert.ok(parsePurchaseDetails(invalid).error, JSON.stringify(invalid));
});

test("imports optional receipt details without changing the basic JSON format", () => {
  const rows = [{ ...importRow, amount: 43000, ...receipt }, importRow];
  const imported = parseTransactionJson(JSON.stringify(rows));
  assert.deepEqual(imported.errors, []);
  assert.equal(imported.transactions.length, 2);
  assert.equal(imported.transactions[0].items?.length, 2);
  assert.equal(summarize(imported.transactions).expense, 68000);
  const bad = parseTransactionJson(
    JSON.stringify([{ ...importRow, ...receipt }]),
  );
  assert.equal(bad.transactions.length, 0);
  assert.ok(bad.errors[0].startsWith("Transaksi 1:"));
});

import { parseAccount, removeAccount } from "./finance.ts";

function accountForm(overrides: Record<string, string> = {}) {
  const data = new FormData();
  for (const [key, value] of Object.entries({
    name: "  Dompet baru  ",
    kind: "Tunai",
    description: "Keperluan harian",
    openingBalance: "100000",
    ...overrides,
  }))
    data.set(key, value);
  return data;
}

test("creates and edits accounts while preserving transaction links and balances", () => {
  const draft = parseAccount(accountForm()).account!;
  assert.equal(draft.name, "Dompet baru");
  const account = { ...draft, id: "new-wallet" };
  const available = [...accounts, account];
  const transaction = parseTransaction(
    transactionForm({ accountId: account.id }),
    undefined,
    available,
  ).transaction!;
  assert.equal(transaction.accountId, account.id);
  assert.equal(accountSummary(account, [transaction]).balance, 75000);
  const edited = {
    ...parseAccount(
      accountForm({ name: "Dompet pribadi", openingBalance: "200000" }),
    ).account!,
    id: account.id,
  };
  assert.equal(accountSummary(edited, [transaction]).balance, 175000);
  assert.equal(transaction.accountId, edited.id);
  assert.ok(
    parseTransactionJson(
      JSON.stringify([{ ...importRow, accountId: account.id }]),
      available,
    ).transactions.length,
  );
});

test("deletes unused accounts without mutating data and protects transaction history", () => {
  const originalIds = accounts.map((account) => account.id);
  const result = removeAccount(accounts, [{ accountId: "bca" }], "cash");
  assert.ok(result.accounts);
  assert.equal(
    result.accounts.some((account) => account.id === "cash"),
    false,
  );
  assert.deepEqual(
    accounts.map((account) => account.id),
    originalIds,
  );
  assert.ok(removeAccount(accounts, [{ accountId: "bca" }], "bca").error);
  assert.ok(removeAccount(accounts, [], "unknown").error);
  assert.ok(
    parseTransaction(
      transactionForm({ accountId: "cash" }),
      undefined,
      result.accounts,
    ).error,
  );
  assert.equal(removeAccount([accounts[3]], [], "cash").accounts?.length, 0);
});

test("rejects invalid account names, kinds and opening balances", () => {
  const invalid: Record<string, string>[] = [
    { name: "   " },
    { name: "x".repeat(81) },
    { description: "x".repeat(161) },
    { kind: "unknown" },
    { openingBalance: "" },
    { openingBalance: "1.5" },
    { openingBalance: "1000000000001" },
    { openingBalance: "-1000000000001" },
  ];
  for (const value of invalid)
    assert.ok(parseAccount(accountForm(value)).error);
  assert.equal(
    parseAccount(accountForm({ openingBalance: "-100" })).account
      ?.openingBalance,
    -100,
  );
  assert.equal(
    parseAccount(accountForm({ openingBalance: "0" })).account?.openingBalance,
    0,
  );
});
