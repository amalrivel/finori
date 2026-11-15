import { Readable } from "node:stream";
import {
  ApiError,
  connectedDrive,
  errorResponse,
  ownedTransaction,
  privateHeaders,
} from "@/lib/drive/server";
import {
  detectImage,
  limitedBody,
  MAX_IMAGE_BYTES,
  safeFileName,
} from "@/lib/drive/security";
type Context = { params: Promise<{ transactionId: string }> };
export async function GET(request: Request, context: Context) {
  try {
    const { transactionId } = await context.params;
    const { client } = await ownedTransaction(request, transactionId);
    const { data, error } = await client
      .from("transaction_attachments")
      .select("id,name,mime_type,size,created_at,slot")
      .eq("transaction_id", transactionId)
      .order("slot");
    if (error) throw new ApiError(500, "Lampiran belum dapat dimuat.");
    return Response.json({ attachments: data }, { headers: privateHeaders });
  } catch (cause) {
    return errorResponse(cause);
  }
}
export async function POST(request: Request, context: Context) {
  try {
    const { transactionId } = await context.params;
    const { userId, client } = await ownedTransaction(request, transactionId);
    const { api, connection, admin } = await connectedDrive(userId);
    if (!connection.folder_id)
      throw new ApiError(
        409,
        "Folder Drive tidak tersedia. Hubungkan ulang Drive.",
      );
    const { data: existing, error: countError } = await client
      .from("transaction_attachments")
      .select("slot")
      .eq("transaction_id", transactionId);
    if (countError) throw new ApiError(500, "Lampiran belum dapat diperiksa.");
    const slot = Array.from({ length: 10 }, (_, index) => index + 1).find(
      (value) => !existing.some((row) => row.slot === value),
    );
    if (!slot) throw new ApiError(400, "Maksimal 10 gambar per transaksi.");
    let body: Buffer;
    try {
      body = await limitedBody(request, MAX_IMAGE_BYTES + 65536);
    } catch {
      throw new ApiError(413, "Gambar maksimal 5 MB.");
    }
    const form = await new Request(request.url, {
      method: "POST",
      headers: { "content-type": request.headers.get("content-type") ?? "" },
      body: new Uint8Array(body),
    }).formData();
    const file = form.get("file");
    if (!(file instanceof File) || file.size > MAX_IMAGE_BYTES)
      throw new ApiError(
        400,
        "Pilih gambar JPEG, PNG, atau WebP maksimal 5 MB.",
      );
    const bytes = new Uint8Array(await file.arrayBuffer());
    const mime = detectImage(bytes);
    if (!mime || file.type !== mime)
      throw new ApiError(
        415,
        "Isi file harus sesuai format JPEG, PNG, atau WebP. SVG tidak didukung.",
      );
    let name: string;
    try {
      name = safeFileName(file.name);
    } catch {
      throw new ApiError(
        400,
        "Nama gambar wajib diisi, maksimal 120 karakter.",
      );
    }
    const uploaded = await api.files.create({
      requestBody: {
        name,
        parents: [connection.folder_id],
        appProperties: { finoriTransaction: transactionId },
      },
      media: { mimeType: mime, body: Readable.from(Buffer.from(bytes)) },
      fields: "id",
    });
    const fileId = uploaded.data.id;
    if (!fileId) throw new ApiError(502, "Drive belum mengonfirmasi unggahan.");
    const { data, error } = await admin
      .from("transaction_attachments")
      .insert({
        user_id: userId,
        transaction_id: transactionId,
        drive_file_id: fileId,
        google_user_id: connection.google_user_id,
        slot,
        name,
        mime_type: mime,
        size: bytes.length,
      })
      .select("id,name,mime_type,size,created_at,slot")
      .single();
    if (error) {
      try {
        await api.files.update({ fileId, requestBody: { trashed: true } });
      } catch {
        throw new ApiError(
          502,
          "Metadata gagal disimpan. Unggahan mungkin masih ada di folder Finori; periksa Drive sebelum mengulang.",
        );
      }
      throw new ApiError(
        409,
        "Lampiran belum disimpan. Muat ulang daftar dan coba lagi.",
      );
    }
    return Response.json(
      { attachment: data },
      { status: 201, headers: privateHeaders },
    );
  } catch (cause) {
    return errorResponse(cause);
  }
}
