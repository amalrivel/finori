import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { encryptSecret } from "../src/lib/drive/security.ts";
import { createClient } from "@supabase/supabase-js";

process.loadEnvFile(".env.local");
const base = process.env.FINORI_TEST_BASE_URL ?? "http://127.0.0.1:3100";
for (const url of [base, process.env.NEXT_PUBLIC_SUPABASE_URL])
  assert.ok(
    ["127.0.0.1", "localhost", "[::1]"].includes(new URL(url).hostname),
    "Tests must target local services only.",
  );
const options = { auth: { persistSession: false, autoRefreshToken: false } };
const admin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SECRET_KEY,
  options,
);
const clients = [0, 1].map(() =>
  createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
    options,
  ),
);
const users = [];
let transactionId;
try {
  for (const client of clients) {
    const result = await client.auth.signUp({
      email: `finori-api-${randomUUID()}@example.test`,
      password: randomUUID() + "Aa1!",
    });
    assert.equal(result.error, null, result.error?.message);
    users.push({
      id: result.data.user.id,
      token: result.data.session.access_token,
    });
  }
  const account = await clients[0]
    .from("accounts")
    .insert({ name: "API test", kind: "Tunai", currency: "JPY" })
    .select()
    .single();
  assert.equal(account.error, null, account.error?.message);
  const transaction = await clients[0]
    .from("transactions")
    .insert({
      account_id: account.data.id,
      currency: "JPY",
      amount: -100,
      category: "Lainnya",
      name: "API test transaction",
      date: "2026-11-15",
    })
    .select()
    .single();
  assert.equal(transaction.error, null, transaction.error?.message);
  transactionId = transaction.data.id;
  const headers = { Authorization: `Bearer ${users[0].token}`, Origin: base };
  const path = `${base}/api/transactions/${transactionId}/attachments`;
  assert.equal((await fetch(`${base}/api/drive`)).status, 401);
  assert.equal((await fetch(path)).status, 401);
  const status = await fetch(`${base}/api/drive`, { headers });
  assert.equal(status.status, 200);
  assert.ok(status.headers.get("cache-control").includes("no-store"));
  const connection = await status.json();
  const own = await fetch(path, { headers });
  assert.equal(own.status, 200);
  assert.deepEqual((await own.json()).attachments, []);
  const denied = await fetch(path, {
    headers: { Authorization: `Bearer ${users[1].token}` },
  });
  assert.equal(denied.status, 404);
  const id = randomUUID();
  for (const method of ["GET", "PATCH", "DELETE"]) {
    const response = await fetch(`${path}/${id}`, {
      method,
      headers: { Authorization: `Bearer ${users[1].token}` },
    });
    assert.equal(response.status, 404);
  }
  const originDenied = await fetch(`${base}/api/drive`, {
    method: "POST",
    headers: { ...headers, Origin: "https://untrusted.example" },
  });
  assert.equal(originDenied.status, 403);
  if (!connection.configured) {
    assert.equal(
      (await fetch(`${base}/api/drive`, { method: "POST", headers })).status,
      503,
    );
    const file = new FormData();
    file.set(
      "file",
      new Blob(["not a real image"], { type: "image/png" }),
      "test.png",
    );
    assert.equal(
      (await fetch(path, { method: "POST", headers, body: file })).status,
      409,
    );
  }
  if (process.env.FINORI_TEST_GOOGLE_STUB === "1") {
    const start = await fetch(`${base}/api/drive`, { method: "POST", headers });
    assert.equal(start.status, 200);
    const authorization = new URL((await start.json()).url);
    assert.equal(
      authorization.searchParams.get("client_id"),
      "finori-test-client",
      "Stub tests must only use dummy Google configuration.",
    );
    assert.equal(
      authorization.searchParams.get("scope"),
      "https://www.googleapis.com/auth/drive.file",
    );
    assert.equal(
      authorization.searchParams.get("code_challenge_method"),
      "S256",
    );
    assert.ok(authorization.searchParams.get("code_challenge"));
    const cookie = start.headers.get("set-cookie");
    assert.ok(cookie.includes("HttpOnly"));
    assert.ok(!cookie.includes(users[0].token));
    const invalidState = await fetch(
      `${base}/api/drive/callback?state=wrong&code=invalid`,
      { headers: { Cookie: cookie.split(";")[0] }, redirect: "manual" },
    );
    assert.equal(invalidState.status, 303);
    assert.equal(
      new URL(invalidState.headers.get("location")).searchParams.get("drive"),
      "error",
    );
    const inserted = await admin.from("drive_connections").upsert({
      user_id: users[0].id,
      google_user_id: "stub-google",
      folder_id: "stub-folder",
      refresh_token: encryptSecret(
        "stub-refresh",
        process.env.DRIVE_TOKEN_ENCRYPTION_KEY,
      ),
    });
    assert.equal(inserted.error, null, inserted.error?.message);
    const invalid = new FormData();
    invalid.set(
      "file",
      new Blob(["<svg/>"], { type: "image/png" }),
      "fake.png",
    );
    assert.equal(
      (await fetch(path, { method: "POST", headers, body: invalid })).status,
      415,
    );
    const tooLarge = await fetch(path, {
      method: "POST",
      headers: { ...headers, "Content-Type": "application/octet-stream" },
      body: new Uint8Array(5 * 1024 * 1024 + 65537),
    });
    assert.equal(tooLarge.status, 413);
    const attachments = Array.from({ length: 10 }, (_, index) => ({
      user_id: users[0].id,
      transaction_id: transactionId,
      google_user_id: "stub-google",
      drive_file_id: `stub-${randomUUID()}`,
      slot: index + 1,
      name: "test.png",
      mime_type: "image/png",
      size: 100,
    }));
    const insertedAttachments = await admin
      .from("transaction_attachments")
      .insert(attachments)
      .select();
    assert.equal(
      insertedAttachments.error,
      null,
      insertedAttachments.error?.message,
    );
    const invalidName = await fetch(
      `${path}/${insertedAttachments.data[0].id}`,
      {
        method: "PATCH",
        headers: { ...headers, "Content-Type": "application/json" },
        body: JSON.stringify({ name: "" }),
      },
    );
    assert.equal(invalidName.status, 400);
    const full = new FormData();
    full.set("file", new Blob(["x"], { type: "image/png" }), "test.png");
    assert.equal(
      (await fetch(path, { method: "POST", headers, body: full })).status,
      400,
    );
    console.log(
      "PASS: encrypted OAuth state cookie, PKCE, forged-state rejection, invalid image/rename/oversized body, and ten-attachment limit (dummy Google config; no Google API requests).",
    );
  }
  const callback = await fetch(
    `${base}/api/drive/callback?state=invalid&code=invalid`,
    { redirect: "manual" },
  );
  assert.equal(callback.status, 303);
  assert.equal(new URL(callback.headers.get("location")).pathname, "/storage");
  assert.ok(callback.headers.get("set-cookie").includes("Path=/api/drive"));
  assert.ok(callback.headers.get("set-cookie").includes("Max-Age=0"));
  console.log(
    "PASS: authenticated Drive status, private cache headers, ownership, cross-origin denial, missing-config handling, and invalid OAuth callback.",
  );
  console.log(
    "SKIP: real Google authorization/upload until personal OAuth credentials are configured.",
  );
} finally {
  for (const user of users) {
    for (const table of [
      "transaction_attachments",
      "drive_connections",
      "transactions",
      "accounts",
    ]) {
      const result = await admin.from(table).delete().eq("user_id", user.id);
      assert.equal(result.error, null, result.error?.message);
    }
    assert.equal((await admin.auth.admin.deleteUser(user.id)).error, null);
  }
  await Promise.all(clients.map((client) => client.auth.signOut()));
}
