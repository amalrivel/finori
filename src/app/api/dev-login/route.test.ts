import assert from "node:assert/strict";
import { test } from "node:test";
import { POST } from "./route.ts";

test("development login is unavailable in production and against non-local hosts", async () => {
  const saved = { ...process.env };
  const request = (origin = "http://localhost:3000", host = "localhost:3000") =>
    new Request("http://127.0.0.1:3000/api/dev-login", {
      method: "POST",
      headers: { origin, host },
    });
  try {
    Object.assign(process.env, {
      NODE_ENV: "production",
      NEXT_PUBLIC_SUPABASE_URL: "http://127.0.0.1:54321",
    });
    assert.equal((await POST(request())).status, 404);
    Object.assign(process.env, {
      NODE_ENV: "development",
      NEXT_PUBLIC_SUPABASE_URL: "https://project.supabase.co",
    });
    assert.equal((await POST(request())).status, 404);
    process.env.NEXT_PUBLIC_SUPABASE_URL = "http://127.0.0.1:54321";
    assert.equal(
      (await POST(request("https://malicious.example"))).status,
      403,
    );
    assert.equal(
      (await POST(request("http://app.example", "app.example"))).status,
      404,
    );
    delete process.env.DEV_TEST_EMAIL;
    delete process.env.DEV_TEST_PASSWORD;
    const missing = await POST(request());
    assert.equal(missing.status, 503);
    assert.equal(missing.headers.get("cache-control"), "no-store");
    assert.match((await missing.json()).error, /dev:account/);
  } finally {
    for (const key of Object.keys(process.env))
      if (!(key in saved)) delete process.env[key];
    Object.assign(process.env, saved);
  }
});
