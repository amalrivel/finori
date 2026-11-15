import { randomBytes } from "node:crypto";
import { readFileSync, writeFileSync, existsSync } from "node:fs";
import { createClient } from "@supabase/supabase-js";

if (existsSync(".env.local")) process.loadEnvFile(".env.local");
if (process.env.NODE_ENV === "production")
  throw new Error("Akun testing hanya untuk development.");
const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
if (
  !url ||
  !["localhost", "127.0.0.1", "[::1]"].includes(new URL(url).hostname)
)
  throw new Error("Gunakan Supabase lokal untuk akun testing.");
const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
if (!key) throw new Error("Publishable key Supabase lokal belum diatur.");
const email = process.env.DEV_TEST_EMAIL || "testing@finori.test";
const password =
  process.env.DEV_TEST_PASSWORD || randomBytes(24).toString("hex");
const client = createClient(url, key, {
  auth: {
    persistSession: false,
    autoRefreshToken: false,
    detectSessionInUrl: false,
  },
});
let needsConfirmation = false;
const login = await client.auth.signInWithPassword({ email, password });
if (!login.data.session) {
  const { data, error } = await client.auth.signUp({ email, password });
  if (error)
    throw new Error(
      `Akun testing belum dapat disiapkan: ${error.message}. Akun yang sudah ada tidak direset.`,
    );
  needsConfirmation = !data.session;
}
let environment = existsSync(".env.local")
  ? readFileSync(".env.local", "utf8")
  : "";
for (const [name, value] of Object.entries({
  DEV_TEST_EMAIL: email,
  DEV_TEST_PASSWORD: password,
})) {
  const pattern = new RegExp(`^${name}=.*$`, "m");
  environment = pattern.test(environment)
    ? environment.replace(pattern, () => `${name}=${value}`)
    : `${environment.trimEnd()}\n${name}=${value}\n`;
}
writeFileSync(".env.local", environment, { mode: 0o600 });
if (needsConfirmation)
  throw new Error(
    "Konfirmasikan email akun testing di inbox Supabase lokal, lalu jalankan kembali perintah ini. Credential sudah disimpan secara privat.",
  );
await client.auth.signOut({ scope: "local" });
console.log(
  `Akun testing siap: ${email}. Credential privat disimpan di .env.local. Jalankan npm run dev, lalu klik Masuk akun testing.`,
);
