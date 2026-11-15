import assert from "node:assert/strict";
import { randomBytes } from "node:crypto";
import { test } from "node:test";
import {
  decryptSecret,
  detectImage,
  encryptSecret,
  limitedBody,
  MAX_IMAGE_BYTES,
  safeFileName,
} from "./security.ts";
test("OAuth credentials are encrypted with authenticated encryption", () => {
  const key = randomBytes(32).toString("base64");
  const value = "private-refresh-token";
  const encrypted = encryptSecret(value, key);
  assert.equal(encrypted.includes(value), false);
  assert.equal(decryptSecret(encrypted, key), value);
  assert.notEqual(encrypted, encryptSecret(value, key));
  const parts = encrypted.split(".");
  const bytes = Buffer.from(parts[2], "base64url");
  bytes[0] ^= 1;
  parts[2] = bytes.toString("base64url");
  assert.throws(() => decryptSecret(parts.join("."), key));
  assert.throws(() =>
    decryptSecret(encrypted, randomBytes(32).toString("base64")),
  );
  assert.throws(() => encryptSecret(value, "invalid"));
});
test("only bounded JPEG, PNG and WebP signatures are accepted", () => {
  assert.equal(detectImage(new Uint8Array([255, 216, 255, 0])), "image/jpeg");
  assert.equal(
    detectImage(new Uint8Array([137, 80, 78, 71, 13, 10, 26, 10])),
    "image/png",
  );
  assert.equal(detectImage(Buffer.from("RIFF0000WEBPdata")), "image/webp");
  assert.equal(detectImage(Buffer.from("<svg onload='alert(1)'/>")), null);
  assert.equal(detectImage(new Uint8Array()), null);
  assert.equal(detectImage(new Uint8Array(MAX_IMAGE_BYTES + 1)), null);
  assert.equal(safeFileName(" ../receipt\\photo.png\n"), "..receiptphoto.png");
  assert.throws(() => safeFileName("   "));
  assert.throws(() => safeFileName("x".repeat(121)));
});
test("request streams are bounded even without Content-Length", async () => {
  const good = new Request("https://finori.test", {
    method: "POST",
    body: "hello",
  });
  assert.equal((await limitedBody(good, 5)).toString(), "hello");
  await assert.rejects(
    limitedBody(
      new Request("https://finori.test", { method: "POST", body: "too much" }),
      3,
    ),
  );
});
