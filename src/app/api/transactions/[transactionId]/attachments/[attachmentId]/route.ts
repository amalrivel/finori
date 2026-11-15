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
type Context = {
  params: Promise<{ transactionId: string; attachmentId: string }>;
};
async function load(request: Request, context: Context) {
  const { transactionId, attachmentId } = await context.params;
  const { client, userId } = await ownedTransaction(request, transactionId);
  const { data, error } = await client
    .from("transaction_attachments")
    .select("*")
    .eq("id", attachmentId)
    .eq("transaction_id", transactionId)
    .single();
  if (error || !data) throw new ApiError(404, "Lampiran tidak ditemukan.");
  const connection = await connectedDrive(userId);
  if (data.google_user_id !== connection.connection.google_user_id)
    throw new ApiError(
      409,
      "Hubungkan akun Google Drive semula untuk membuka lampiran ini.",
    );
  return { ...connection, attachment: data, userId };
}
export async function GET(request: Request, context: Context) {
  try {
    const { api, attachment } = await load(request, context);
    const file = await api.files.get({
      fileId: attachment.drive_file_id,
      fields: "size,mimeType,trashed",
    });
    if (file.data.trashed)
      throw new ApiError(404, "Gambar berada di sampah Drive.");
    if (
      Number(file.data.size) > MAX_IMAGE_BYTES ||
      file.data.mimeType !== attachment.mime_type
    )
      throw new ApiError(
        415,
        "File di Drive telah berubah format atau melebihi 5 MB.",
      );
    const stream = await api.files.get(
      { fileId: attachment.drive_file_id, alt: "media" },
      { responseType: "stream" },
    );
    const chunks: Buffer[] = [];
    let size = 0;
    for await (const chunk of stream.data) {
      const bytes = Buffer.from(chunk);
      size += bytes.length;
      if (size > MAX_IMAGE_BYTES) {
        stream.data.destroy();
        throw new ApiError(413, "Gambar melebihi 5 MB.");
      }
      chunks.push(bytes);
    }
    const bytes = Buffer.concat(chunks);
    if (detectImage(bytes) !== attachment.mime_type)
      throw new ApiError(415, "Isi gambar tidak lagi sesuai format lampiran.");
    return new Response(new Uint8Array(bytes), {
      headers: {
        ...privateHeaders,
        "Content-Type": attachment.mime_type,
        "Content-Length": String(bytes.length),
        "Content-Disposition": `inline; filename*=UTF-8''${encodeURIComponent(attachment.name)}`,
        "X-Content-Type-Options": "nosniff",
        "Content-Security-Policy": "default-src 'none'; sandbox",
      },
    });
  } catch (cause) {
    return errorResponse(cause);
  }
}
export async function PATCH(request: Request, context: Context) {
  try {
    const { api, admin, attachment, userId } = await load(request, context);
    let name: string;
    try {
      const value = JSON.parse((await limitedBody(request, 1024)).toString());
      name = safeFileName(typeof value.name === "string" ? value.name : "");
    } catch {
      throw new ApiError(
        400,
        "Nama gambar wajib diisi, maksimal 120 karakter.",
      );
    }
    await api.files.update({
      fileId: attachment.drive_file_id,
      requestBody: { name },
    });
    const { error } = await admin
      .from("transaction_attachments")
      .update({ name })
      .eq("id", attachment.id)
      .eq("user_id", userId);
    if (error) {
      try {
        await api.files.update({
          fileId: attachment.drive_file_id,
          requestBody: { name: attachment.name },
        });
      } catch {
        throw new ApiError(
          502,
          "Nama belum tersinkron. Periksa nama gambar di Drive sebelum mencoba lagi.",
        );
      }
      throw new ApiError(500, "Nama lampiran belum disimpan.");
    }
    return Response.json({ updated: true }, { headers: privateHeaders });
  } catch (cause) {
    return errorResponse(cause);
  }
}
export async function DELETE(request: Request, context: Context) {
  try {
    const { api, admin, attachment, userId } = await load(request, context);
    try {
      await api.files.update({
        fileId: attachment.drive_file_id,
        requestBody: { trashed: true },
      });
    } catch (cause) {
      if (
        (cause as { response?: { status?: number } })?.response?.status !== 404
      )
        throw cause;
    }
    const { error } = await admin
      .from("transaction_attachments")
      .delete()
      .eq("id", attachment.id)
      .eq("user_id", userId);
    if (error) {
      try {
        await api.files.update({
          fileId: attachment.drive_file_id,
          requestBody: { trashed: false },
        });
      } catch {
        throw new ApiError(
          502,
          "Metadata belum terhapus. Gambar mungkin berada di sampah Drive; pulihkan di Drive bila diperlukan.",
        );
      }
      throw new ApiError(500, "Lampiran belum dapat dihapus.");
    }
    return Response.json({ deleted: true }, { headers: privateHeaders });
  } catch (cause) {
    return errorResponse(cause);
  }
}
