import { createCipheriv, createDecipheriv, randomBytes } from "node:crypto";

export function encryptSecret(value: string, key: string) {
  const bytes = Buffer.from(key, "base64");
  if (bytes.length !== 32)
    throw new Error("DRIVE_TOKEN_ENCRYPTION_KEY harus berupa 32 byte base64.");
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", bytes, iv);
  const encrypted = Buffer.concat([
    cipher.update(value, "utf8"),
    cipher.final(),
  ]);
  return [iv, cipher.getAuthTag(), encrypted]
    .map((part) => part.toString("base64url"))
    .join(".");
}
export function decryptSecret(value: string, key: string) {
  const parts = value.split(".");
  if (parts.length !== 3) throw new Error("Token tidak valid.");
  const [iv, tag, data] = parts.map((part) => Buffer.from(part, "base64url"));
  const decipher = createDecipheriv(
    "aes-256-gcm",
    Buffer.from(key, "base64"),
    iv,
  );
  decipher.setAuthTag(tag);
  return Buffer.concat([decipher.update(data), decipher.final()]).toString(
    "utf8",
  );
}
export const MAX_IMAGE_BYTES = 5 * 1024 * 1024;
export function detectImage(bytes: Uint8Array): string | null {
  if (!bytes.length || bytes.length > MAX_IMAGE_BYTES) return null;
  if (bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff)
    return "image/jpeg";
  if (
    Buffer.from(bytes.subarray(0, 8)).equals(
      Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]),
    )
  )
    return "image/png";
  if (
    Buffer.from(bytes.subarray(0, 4)).toString() === "RIFF" &&
    Buffer.from(bytes.subarray(8, 12)).toString() === "WEBP"
  )
    return "image/webp";
  return null;
}
export function safeFileName(name: string) {
  const cleaned = name.replace(/[\u0000-\u001f\u007f/\\]/g, "").trim();
  if (!cleaned || cleaned.length > 120)
    throw new Error("Nama file wajib diisi, maksimal 120 karakter.");
  return cleaned;
}
export async function limitedBody(request: Request, limit: number) {
  const reader = request.body?.getReader();
  if (!reader) throw new Error("Isi permintaan kosong.");
  const chunks: Uint8Array[] = [];
  let size = 0;
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    size += value.byteLength;
    if (size > limit) {
      await reader.cancel();
      throw new Error("Ukuran permintaan melebihi batas.");
    }
    chunks.push(value);
  }
  return Buffer.concat(chunks);
}
