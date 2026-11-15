import "server-only";
import { createClient } from "@supabase/supabase-js";
import { auth, drive } from "googleapis/build/src/apis/drive/index.js";
import type { Database } from "@/lib/supabase/database.types";
import { decryptSecret } from "./security";

export class ApiError extends Error {
  constructor(
    public status: number,
    message: string,
  ) {
    super(message);
  }
}
export const privateHeaders = { "Cache-Control": "private, no-store" };
const clientOptions = {
  auth: {
    persistSession: false,
    autoRefreshToken: false,
    detectSessionInUrl: false,
  },
};
export function adminClient() {
  const key = process.env.SUPABASE_SECRET_KEY;
  if (!key)
    throw new ApiError(503, "Konfigurasi server Supabase belum tersedia.");
  return createClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    key,
    clientOptions,
  );
}
export function encryptionKey() {
  const key = process.env.DRIVE_TOKEN_ENCRYPTION_KEY;
  if (!key || Buffer.from(key, "base64").length !== 32)
    throw new ApiError(503, "Kunci enkripsi Drive belum dikonfigurasi.");
  return key;
}
export function oauthClient() {
  const { GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET, GOOGLE_REDIRECT_URI } =
    process.env;
  if (!GOOGLE_CLIENT_ID || !GOOGLE_CLIENT_SECRET || !GOOGLE_REDIRECT_URI)
    throw new ApiError(
      503,
      "Isi konfigurasi Google OAuth sesuai docs/google-drive.md terlebih dahulu.",
    );
  encryptionKey();
  const uri = new URL(GOOGLE_REDIRECT_URI);
  if (
    uri.protocol !== "https:" &&
    !["localhost", "127.0.0.1"].includes(uri.hostname)
  )
    throw new ApiError(503, "Redirect OAuth harus HTTPS atau localhost.");
  return new auth.OAuth2(
    GOOGLE_CLIENT_ID,
    GOOGLE_CLIENT_SECRET,
    GOOGLE_REDIRECT_URI,
  );
}
export async function authenticate(request: Request) {
  const origin = request.headers.get("origin");
  const expectedOrigin = process.env.GOOGLE_REDIRECT_URI
    ? new URL(process.env.GOOGLE_REDIRECT_URI).origin
    : `${new URL(request.url).protocol}//${request.headers.get("host") ?? new URL(request.url).host}`;
  if (request.method !== "GET" && origin && origin !== expectedOrigin)
    throw new ApiError(403, "Origin tidak diizinkan.");
  const token = request.headers
    .get("authorization")
    ?.match(/^Bearer (.+)$/i)?.[1];
  if (!token) throw new ApiError(401, "Silakan masuk kembali.");
  const client = createClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
    {
      ...clientOptions,
      global: { headers: { Authorization: `Bearer ${token}` } },
    },
  );
  const { data, error } = await client.auth.getUser(token);
  if (error || !data.user)
    throw new ApiError(401, "Sesi tidak valid. Silakan masuk kembali.");
  return { client, userId: data.user.id, token };
}
export async function ownedTransaction(request: Request, id: string) {
  if (!/^[0-9a-f-]{36}$/i.test(id))
    throw new ApiError(404, "Transaksi tidak ditemukan.");
  const session = await authenticate(request);
  const { data, error } = await session.client
    .from("transactions")
    .select("id")
    .eq("id", id)
    .single();
  if (error || !data) throw new ApiError(404, "Transaksi tidak ditemukan.");
  return session;
}
export async function connectedDrive(userId: string) {
  const admin = adminClient();
  const { data, error } = await admin
    .from("drive_connections")
    .select("*")
    .eq("user_id", userId)
    .maybeSingle();
  if (error) throw new ApiError(500, "Tidak dapat membaca koneksi Drive.");
  if (!data?.refresh_token)
    throw new ApiError(
      409,
      "Hubungkan Google Drive melalui halaman Penyimpanan terlebih dahulu.",
    );
  const oauth = oauthClient();
  oauth.setCredentials({
    refresh_token: decryptSecret(data.refresh_token, encryptionKey()),
  });
  return {
    api: drive({ version: "v3", auth: oauth }),
    oauth,
    connection: data,
    admin,
  };
}
export function errorResponse(cause: unknown) {
  if (cause instanceof ApiError)
    return Response.json(
      { error: cause.message },
      { status: cause.status, headers: privateHeaders },
    );
  const googleError = (cause as { response?: { data?: { error?: string } } })
    ?.response?.data?.error;
  if (googleError === "invalid_grant")
    return Response.json(
      {
        error:
          "Izin Google Drive kedaluwarsa atau dicabut. Hubungkan ulang melalui Penyimpanan.",
      },
      { status: 409, headers: privateHeaders },
    );
  const code =
    (cause as { response?: { status?: number }; code?: number })?.response
      ?.status ?? (cause as { code?: number })?.code;
  const message =
    code === 404
      ? "File atau folder tidak tersedia di Drive. Periksa Drive pribadi Anda."
      : code === 401 || code === 403
        ? "Akses Google Drive ditolak. Hubungkan ulang dan periksa izin akun Google."
        : "Operasi belum berhasil. Periksa koneksi dan coba lagi; data belum dikonfirmasi tersimpan.";
  return Response.json(
    { error: message },
    { status: 502, headers: privateHeaders },
  );
}
