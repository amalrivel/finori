import assert from "node:assert/strict";
import { test } from "node:test";
import {
  accountSummary,
  accounts,
  currencySummary,
  parsePurchaseDetails,
  parseTransactionJson,
  summarize,
  type Account,
} from "./finance.ts";
import {
  accountFormSchema,
  blankPurchaseItem,
  createTransactionFormSchema,
} from "./form-schemas.ts";
import { formatMoney, sumMoney, purchaseSubtotal } from "./currency.ts";

const wallets: Account[] = [
  { ...accounts[0], id: "idr", openingBalance: 100000, currency: "IDR" },
  { ...accounts[0], id: "jpy", openingBalance: 250000, currency: "JPY" },
  { ...accounts[0], id: "usd", openingBalance: 10.15, currency: "USD" },
];
const row = {
  type: "income",
  name: "Salary",
  accountId: "jpy",
  amount: 300000,
  category: "Gaji",
  date: "2026-11-15",
};

test("a mixed batch derives each currency from its account and never combines balances", () => {
  const result = parseTransactionJson(
    JSON.stringify([
      row,
      { ...row, accountId: "idr", amount: 1000000 },
      { ...row, accountId: "usd", amount: 0.15 },
    ]),
    wallets,
  );
  assert.deepEqual(result.errors, []);
  assert.deepEqual(
    result.transactions.map((t) => t.currency),
    ["JPY", "IDR", "USD"],
  );
  assert.deepEqual(
    currencySummary(wallets, result.transactions).map((t) => [
      t.currency,
      t.balance,
    ]),
    [
      ["IDR", 1100000],
      ["JPY", 550000],
      ["USD", 10.3],
    ],
  );
  assert.equal(accountSummary(wallets[2], result.transactions).balance, 10.3);
});
test("JSON rejects fractional yen and rupiah, excess USD precision, and mismatched currency atomically", () => {
  for (const invalid of [
    { ...row, amount: 1.5 },
    { ...row, accountId: "idr", amount: 1.5 },
    { ...row, accountId: "usd", amount: 1.001 },
    { ...row, currency: "USD" },
  ]) {
    const parsed = parseTransactionJson(
      JSON.stringify([row, invalid]),
      wallets,
    );
    assert.deepEqual(parsed.transactions, []);
    assert.match(parsed.errors[0], /Transaksi 2/);
  }
  assert.equal(
    parseTransactionJson(JSON.stringify([{ ...row, currency: "JPY" }]), wallets)
      .errors.length,
    0,
  );
});
test("USD receipts retain cents and apply both discounts once in JSON and manual forms", () => {
  const purchase = {
    items: [
      {
        ...blankPurchaseItem(),
        name: "Milk",
        quantity: 2,
        unitPrice: 1.75,
        discount: 0.1,
      },
    ],
    discount: 0.21,
  };
  assert.equal(parsePurchaseDetails(purchase, "USD").details?.total, 3.19);
  const parsed = parseTransactionJson(
    JSON.stringify([
      {
        ...row,
        accountId: "usd",
        type: "expense",
        category: "Belanja",
        amount: 3.19,
        ...purchase,
      },
    ]),
    wallets,
  );
  assert.deepEqual(parsed.errors, []);
  assert.equal(parsed.transactions[0].amount, -3.19);
  const manual = createTransactionFormSchema(wallets).parse({
    ...row,
    accountId: "usd",
    type: "expense",
    category: "Belanja",
    amount: "",
    detailed: true,
    purchase: {
      items: [
        {
          ...purchase.items[0],
          unitPrice: "1.75",
          quantity: "2",
          discount: "0.10",
        },
      ],
      discount: "0.21",
    },
  });
  assert.equal(manual.amount, -3.19);
  assert.ok(parsePurchaseDetails(purchase, "JPY").error);
});
test("receipt rounding uses currency precision and sums cents without floating point residue", () => {
  const purchase = {
    items: [{ name: "Weight", quantity: 0.5, unitPrice: 2.01 }],
  };
  assert.equal(parsePurchaseDetails(purchase, "USD").details?.total, 1.01);
  assert.equal(
    parsePurchaseDetails(
      {
        items: [
          { name: "Weight", quantity: 0.4999999999999999, unitPrice: 1.01 },
        ],
      },
      "USD",
    ).details?.total,
    0.5,
  );
  assert.equal(
    parsePurchaseDetails(
      { items: [{ name: "Tiny", quantity: 1e-7, unitPrice: 1000000 }] },
      "USD",
    ).details?.total,
    0.1,
  );
  assert.ok(Number.isNaN(purchaseSubtotal(1, 1e308, "USD")));
  assert.equal(sumMoney([0.1, 0.2]), 0.3);
  assert.deepEqual(
    summarize([{ amount: 0.1 }, { amount: 0.2 }, { amount: -0.05 }]),
    { income: 0.3, expense: 0.05, balance: 0.25 },
  );
  assert.match(formatMoney(12.5, "USD"), /USD.*12,50/);
  assert.match(formatMoney(1234, "JPY"), /JPY.*1.234/);
});
test("account forms preserve legacy IDR and validate precision for each currency", () => {
  const base = {
    name: "Wallet",
    kind: "Tunai",
    description: "",
    openingBalance: "-10.15",
  };
  assert.equal(
    accountFormSchema.parse({ ...base, currency: "USD" }).openingBalance,
    -10.15,
  );
  for (const currency of ["IDR", "JPY", "INVALID"])
    assert.equal(
      accountFormSchema.safeParse({ ...base, currency }).success,
      false,
    );
  assert.equal(
    accountFormSchema.parse({ ...base, openingBalance: "1000" }).currency,
    "IDR",
  );
});
