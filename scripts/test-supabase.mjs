import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { execFileSync } from "node:child_process";
import { createClient } from "@supabase/supabase-js";

process.loadEnvFile(".env.local");
const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
assert.ok(
  ["127.0.0.1", "localhost", "::1", "[::1]"].includes(new URL(url).hostname),
  "Test ini hanya boleh dijalankan terhadap Supabase lokal.",
);
const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
const client = () =>
  createClient(url, key, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
      detectSessionInUrl: false,
    },
  });
const status = JSON.parse(
  execFileSync("./node_modules/.bin/supabase", ["status", "-o", "json"], {
    encoding: "utf8",
    stdio: ["ignore", "pipe", "pipe"],
  }),
);
assert.equal(new URL(status.API_URL).origin, new URL(url).origin);
const admin = createClient(url, status.SECRET_KEY ?? status.SERVICE_ROLE_KEY, {
  auth: { persistSession: false, autoRefreshToken: false },
});
const run = randomUUID();
const clients = [client(), client()];
const users = [];
const password = randomUUID() + "Aa1!";
try {
  for (let index = 0; index < clients.length; index++) {
    const email = `finori-test-${run}-${index}@example.test`;
    const { data, error } = await clients[index].auth.signUp({
      email,
      password,
    });
    assert.equal(error, null, error?.message);
    assert.ok(
      data.session,
      "Local email confirmation must be disabled for this test.",
    );
    users.push({ id: data.user.id, email });
  }
  const accountId = randomUUID();
  const { error: accountError } = await clients[0].from("accounts").insert({
    id: accountId,
    user_id: users[0].id,
    name: "Integration wallet",
    kind: "Tunai",
    opening_balance: 100000,
  });
  assert.equal(accountError, null, accountError?.message);
  const edited = await clients[0]
    .from("accounts")
    .update({ name: "Updated wallet" })
    .eq("id", accountId)
    .select()
    .single();
  assert.equal(edited.error, null, edited.error?.message);
  assert.equal(edited.data.name, "Updated wallet");
  const invisible = await clients[1]
    .from("accounts")
    .select()
    .eq("id", accountId);
  assert.equal(invisible.error, null);
  assert.deepEqual(invisible.data, []);
  const deniedWrite = await clients[1]
    .from("accounts")
    .insert({ user_id: users[0].id, name: "Forbidden", kind: "Tunai" });
  assert.ok(deniedWrite.error);
  const row = {
    user_id: users[0].id,
    account_id: accountId,
    name: "Receipt",
    category: "Belanja",
    date: "2026-11-15",
    amount: -33000,
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
  const saved = await clients[0]
    .from("transactions")
    .insert(row)
    .select()
    .single();
  assert.equal(saved.error, null, saved.error?.message);
  assert.equal(saved.data.items[0].name, "Susu");
  const crossAccount = await clients[1]
    .from("transactions")
    .insert({ ...row, user_id: users[1].id });
  assert.ok(crossAccount.error);
  const invisibleTransactions = await clients[1]
    .from("transactions")
    .select()
    .eq("account_id", accountId);
  assert.deepEqual(invisibleTransactions.data, []);
  const badBatch = await clients[0].from("transactions").insert([
    { ...row, name: "Must rollback" },
    { ...row, amount: -1 },
  ]);
  assert.ok(badBatch.error);
  const checkBatch = await clients[0]
    .from("transactions")
    .select("id")
    .eq("name", "Must rollback");
  assert.deepEqual(checkBatch.data, []);
  const deletion = await clients[0]
    .from("accounts")
    .delete()
    .eq("id", accountId);
  assert.equal(deletion.error?.code, "23503");
  const fresh = client();
  const login = await fresh.auth.signInWithPassword({
    email: users[0].email,
    password,
  });
  assert.equal(login.error, null, login.error?.message);
  const persisted = await fresh
    .from("transactions")
    .select()
    .eq("account_id", accountId);
  assert.equal(persisted.data.length, 1);
  assert.equal(persisted.data[0].amount, -33000);
  await fresh.auth.signOut();
  const removableId = randomUUID();
  assert.equal(
    (
      await clients[0]
        .from("accounts")
        .insert({ id: removableId, name: "Unused wallet", kind: "Tunai" })
    ).error,
    null,
  );
  assert.equal(
    (await clients[0].from("accounts").delete().eq("id", removableId)).error,
    null,
  );
  const usdId = randomUUID();
  const jpyId = randomUUID();
  const foreignAccounts = await clients[0]
    .from("accounts")
    .insert([
      {
        id: usdId,
        name: "USD wallet",
        kind: "Tunai",
        currency: "USD",
        opening_balance: 10.15,
      },
      {
        id: jpyId,
        name: "JPY salary",
        kind: "Rekening bank",
        currency: "JPY",
        opening_balance: 250000,
      },
    ])
    .select();
  assert.equal(foreignAccounts.error, null, foreignAccounts.error?.message);
  const invalidOpening = await clients[0].from("accounts").insert({
    name: "Invalid JPY",
    kind: "Tunai",
    currency: "JPY",
    opening_balance: 0.5,
  });
  assert.ok(invalidOpening.error);
  const usdRow = {
    ...row,
    account_id: usdId,
    currency: "USD",
    amount: -3.19,
    items: [{ ...row.items[0], unitPrice: 1.75, discount: 0.1 }],
    discount: 0.21,
  };
  const usdReceipt = await clients[0]
    .from("transactions")
    .insert(usdRow)
    .select()
    .single();
  assert.equal(usdReceipt.error, null, usdReceipt.error?.message);
  assert.equal(usdReceipt.data.amount, -3.19);
  for (const invalid of [
    { ...usdRow, currency: "JPY" },
    { ...usdRow, amount: -3.191 },
    { ...usdRow, amount: -3.18 },
    {
      ...usdRow,
      account_id: jpyId,
      currency: "JPY",
      amount: -1.5,
      items: null,
      discount: 0,
    },
  ])
    assert.ok((await clients[0].from("transactions").insert(invalid)).error);
  const yenSalary = await clients[0]
    .from("transactions")
    .insert({
      ...row,
      account_id: jpyId,
      currency: "JPY",
      amount: 300000,
      category: "Gaji",
      items: null,
      discount: 0,
    })
    .select()
    .single();
  assert.equal(yenSalary.error, null, yenSalary.error?.message);
  const rounding = await clients[0].from("transactions").insert({
    ...usdRow,
    amount: -1.01,
    items: [
      { ...usdRow.items[0], quantity: 0.5, unitPrice: 2.01, discount: 0 },
    ],
    discount: 0,
  });
  assert.equal(rounding.error, null, rounding.error?.message);
  const belowHalf = await clients[0].from("transactions").insert({
    ...usdRow,
    amount: -0.5,
    items: [
      {
        ...usdRow.items[0],
        quantity: 0.4999999999999999,
        unitPrice: 1.01,
        discount: 0,
      },
    ],
    discount: 0,
  });
  assert.equal(belowHalf.error, null, belowHalf.error?.message);
  const frozenCurrency = await clients[0]
    .from("accounts")
    .update({ currency: "IDR" })
    .eq("id", jpyId);
  assert.equal(frozenCurrency.error?.code, "23503");
  const roundTrip = await clients[0]
    .from("transactions")
    .select()
    .eq("account_id", usdId)
    .eq("amount", -3.19)
    .single();
  assert.equal(roundTrip.data.currency, "USD");
  assert.equal(roundTrip.data.items[0].unitPrice, 1.75);
  const transactionId = saved.data.id;
  const updateOwn = await clients[0]
    .from("transactions")
    .update({ name: "Edited receipt" })
    .eq("id", transactionId)
    .select()
    .single();
  assert.equal(updateOwn.error, null, updateOwn.error?.message);
  assert.equal(updateOwn.data.items[0].name, "Susu");
  const updateOther = await clients[1]
    .from("transactions")
    .update({ name: "Forbidden" })
    .eq("id", transactionId)
    .select();
  assert.deepEqual(updateOther.data, []);
  const changeOwner = await clients[0]
    .from("transactions")
    .update({ user_id: users[1].id })
    .eq("id", transactionId);
  assert.ok(changeOwner.error);
  const badEdit = await clients[0]
    .from("transactions")
    .update({ amount: -1 })
    .eq("id", transactionId);
  assert.ok(badEdit.error);
  const attachment = await admin
    .from("transaction_attachments")
    .insert({
      user_id: users[0].id,
      transaction_id: transactionId,
      drive_file_id: `fake-${run}`,
      google_user_id: "google-test-account",
      slot: 1,
      name: "receipt.png",
      mime_type: "image/png",
      size: 100,
    })
    .select()
    .single();
  assert.equal(attachment.error, null, attachment.error?.message);
  const readOwn = await clients[0]
    .from("transaction_attachments")
    .select()
    .eq("id", attachment.data.id);
  assert.equal(readOwn.data.length, 1);
  assert.deepEqual(
    (
      await clients[1]
        .from("transaction_attachments")
        .select()
        .eq("id", attachment.data.id)
    ).data,
    [],
  );
  assert.ok(
    (
      await clients[0]
        .from("transaction_attachments")
        .update({ drive_file_id: "injected" })
        .eq("id", attachment.data.id)
    ).error,
  );
  assert.ok(
    (
      await clients[0]
        .from("transaction_attachments")
        .delete()
        .eq("id", attachment.data.id)
    ).error,
  );
  const cannotDelete = await clients[0]
    .from("transactions")
    .delete()
    .eq("id", transactionId);
  assert.equal(cannotDelete.error?.code, "23503");
  const badAttachment = await admin.from("transaction_attachments").insert({
    ...attachment.data,
    id: randomUUID(),
    slot: 11,
    drive_file_id: `invalid-${run}`,
  });
  assert.ok(badAttachment.error);
  const crossAttachment = await admin.from("transaction_attachments").insert({
    ...attachment.data,
    id: randomUUID(),
    user_id: users[1].id,
    slot: 2,
    drive_file_id: `cross-${run}`,
  });
  assert.ok(crossAttachment.error);
  const connection = await admin.from("drive_connections").upsert({
    user_id: users[0].id,
    google_user_id: "test-account",
    refresh_token: "encrypted-fixture",
  });
  assert.equal(connection.error, null, connection.error?.message);
  assert.ok((await clients[0].from("drive_connections").select()).error);
  assert.ok((await clients[1].from("drive_connections").select()).error);
  const removeMetadata = await admin
    .from("transaction_attachments")
    .delete()
    .eq("id", attachment.data.id);
  assert.equal(removeMetadata.error, null);
  const deletable = await clients[0]
    .from("transactions")
    .insert({ ...row, amount: -100, items: null, discount: 0 })
    .select()
    .single();
  assert.equal(deletable.error, null, deletable.error?.message);
  assert.deepEqual(
    (
      await clients[1]
        .from("transactions")
        .delete()
        .eq("id", deletable.data.id)
        .select()
    ).data,
    [],
  );
  const removed = await clients[0]
    .from("transactions")
    .delete()
    .eq("id", deletable.data.id)
    .select();
  assert.equal(removed.error, null);
  assert.equal(removed.data.length, 1);
  const unauthenticated = await client().from("accounts").select();
  assert.ok(unauthenticated.error);
  console.log(
    "PASS: signup/login, account CRUD, receipt persistence after re-login, per-user RLS, protected deletion, atomic batch imports, multi-currency precision, receipt rounding, currency locks, transaction CRUD, attachment ownership, and protected Drive credentials.",
  );
} finally {
  for (const user of users) {
    const attachments = await admin
      .from("transaction_attachments")
      .delete()
      .eq("user_id", user.id);
    assert.equal(attachments.error, null);
    const connections = await admin
      .from("drive_connections")
      .delete()
      .eq("user_id", user.id);
    assert.equal(connections.error, null);
    const tx = await admin.from("transactions").delete().eq("user_id", user.id);
    assert.equal(tx.error, null);
    const accounts = await admin
      .from("accounts")
      .delete()
      .eq("user_id", user.id);
    assert.equal(accounts.error, null);
    const auth = await admin.auth.admin.deleteUser(user.id);
    assert.equal(auth.error, null);
  }
  await Promise.all(clients.map((value) => value.auth.signOut()));
}
