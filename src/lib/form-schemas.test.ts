import assert from "node:assert/strict";
import { test } from "node:test";
import { accounts } from "./finance.ts";
import {
  accountFormSchema,
  blankPurchaseItem,
  createAuthSchema,
  createTransactionFormSchema,
  importFormSchema,
  type TransactionFormInput,
} from "./form-schemas.ts";

const schema = createTransactionFormSchema(accounts);
const basic: TransactionFormInput = {
  type: "expense",
  name: "Makan",
  accountId: accounts[0].id,
  category: "Makanan",
  date: "2026-11-15",
  amount: "50000",
  detailed: false,
  purchase: { items: [blankPurchaseItem()], discount: "" },
};

test("auth and JSON forms reject empty or invalid input", () => {
  assert.equal(
    createAuthSchema("login").parse({
      email: " me@example.com ",
      password: "a",
    }).email,
    "me@example.com",
  );
  assert.equal(
    createAuthSchema("register").safeParse({
      email: "me@example.com",
      password: "short",
    }).success,
    false,
  );
  assert.equal(
    createAuthSchema("login").safeParse({ email: "invalid", password: "" })
      .success,
    false,
  );
  assert.equal(importFormSchema.safeParse({ source: "   " }).success, false);
});
test("account form converts signed integer balances and rejects invalid money", () => {
  const account = {
    name: " Tunai ",
    kind: "Tunai",
    description: "",
    openingBalance: "-1000",
  };
  assert.equal(accountFormSchema.parse(account).openingBalance, -1000);
  for (const openingBalance of ["", "1.2", "1e3", "1000000000001"])
    assert.equal(
      accountFormSchema.safeParse({ ...account, openingBalance }).success,
      false,
    );
});
test("simple transactions ignore hidden receipt fields and validate account and date", () => {
  assert.equal(schema.parse(basic).amount, -50000);
  assert.equal(
    schema.safeParse({ ...basic, accountId: "missing" }).success,
    false,
  );
  assert.equal(
    schema.safeParse({ ...basic, date: "2026-02-29" }).success,
    false,
  );
  assert.equal(schema.safeParse({ ...basic, amount: "" }).success, false);
  const income = schema.parse({
    ...basic,
    type: "income",
    category: "Gaji",
    detailed: true,
  });
  assert.equal(income.amount, 50000);
  assert.equal(income.items, undefined);
});
test("detailed transactions calculate discounts once and report errors at item fields", () => {
  const detailed = {
    ...basic,
    detailed: true,
    amount: "",
    purchase: {
      items: [
        {
          ...blankPurchaseItem(),
          name: "Susu",
          quantity: "2",
          unitPrice: "20000",
          discount: "5000",
        },
      ],
      discount: "2000",
    },
  };
  const parsed = schema.parse(detailed);
  assert.equal(parsed.amount, -33000);
  assert.equal(parsed.items?.[0].quantity, 2);
  const invalid = schema.safeParse({
    ...detailed,
    purchase: {
      ...detailed.purchase,
      items: [{ ...detailed.purchase.items[0], discount: "50000" }],
    },
  });
  assert.equal(invalid.success, false);
  if (!invalid.success)
    assert.ok(
      invalid.error.issues.some(
        (issue) => issue.path.join(".") === "purchase.items.0.discount",
      ),
    );
  assert.equal(
    schema.safeParse({ ...detailed, purchase: { items: [], discount: 0 } })
      .success,
    false,
  );
  assert.equal(
    schema.safeParse({
      ...detailed,
      purchase: {
        items: Array(101).fill(detailed.purchase.items[0]),
        discount: 0,
      },
    }).success,
    false,
  );
});

test("edit defaults preserve receipt fields and allow replacing or removing the details", async () => {
  const { transactionFormDefaults } = await import("./form-schemas.ts");
  const original = {
    accountId: accounts[0].id,
    currency: "IDR" as const,
    name: "Belanja lama",
    amount: -33000,
    category: "Belanja",
    date: "2026-08-05",
    items: [
      {
        name: "Susu",
        quantity: 2,
        unitPrice: 20000,
        discount: 5000,
        kind: "Minuman",
        group: "Dapur",
      },
    ],
    discount: 2000,
  };
  const defaults = transactionFormDefaults("other", original);
  assert.equal(defaults.amount, 33000);
  assert.equal(defaults.detailed, true);
  assert.deepEqual(
    createTransactionFormSchema(accounts).parse(defaults),
    original,
  );
  defaults.purchase.items[0].name = "Ubah nama barang";
  assert.equal(original.items[0].name, "Susu");
  const simple = createTransactionFormSchema(accounts).parse({
    ...defaults,
    detailed: false,
    amount: "12000",
  });
  assert.equal(simple.amount, -12000);
  assert.equal(simple.items, undefined);
  const income = transactionFormDefaults("other", {
    ...original,
    amount: 1000,
    category: "Gaji",
    items: undefined,
    discount: undefined,
  });
  assert.equal(income.type, "income");
  assert.equal(income.detailed, false);
});
