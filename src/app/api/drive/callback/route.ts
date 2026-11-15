import { cookies } from "next/headers";
import { timingSafeEqual } from "node:crypto";
import { drive } from "googleapis/build/src/apis/drive/index.js";
import {
  authenticate,
  adminClient,
  oauthClient,
  encryptionKey,
  ApiError,
  privateHeaders,
} from "@/lib/drive/server";
import { decryptSecret, encryptSecret } from "@/lib/drive/security";
export async function GET(request: Request) {
  const jar = await cookies();
  const saved = jar.get("finori-drive-oauth")?.value;
  jar.set("finori-drive-oauth", "", {
    path: "/api/drive",
    maxAge: 0,
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.GOOGLE_REDIRECT_URI?.startsWith("https:") ?? false,
  });
  const origin = process.env.GOOGLE_REDIRECT_URI
    ? new URL(process.env.GOOGLE_REDIRECT_URI).origin
    : new URL(request.url).origin;
  try {
    if (!saved) throw new ApiError(400, "OAuth session expired");
    const session = JSON.parse(decryptSecret(saved, encryptionKey())) as {
      state: string;
      token: string;
      codeVerifier: string;
      expires: number;
    };
    const url = new URL(request.url);
    const state = url.searchParams.get("state") ?? "";
    if (
      Date.now() > session.expires ||
      !state ||
      Buffer.byteLength(state) !== Buffer.byteLength(session.state) ||
      !timingSafeEqual(Buffer.from(state), Buffer.from(session.state))
    )
      throw new ApiError(400, "Invalid OAuth state");
    const code = url.searchParams.get("code");
    if (!code || url.searchParams.has("error"))
      throw new ApiError(400, "Google authorization cancelled");
    const { userId } = await authenticate(
      new Request(request.url, {
        headers: { authorization: `Bearer ${session.token}` },
      }),
    );
    const oauth = oauthClient();
    const { tokens } = await oauth.getToken({
      code,
      codeVerifier: session.codeVerifier,
    });
    if (!tokens.refresh_token)
      throw new ApiError(400, "Offline access required");
    oauth.setCredentials(tokens);
    const api = drive({ version: "v3", auth: oauth });
    const about = await api.about.get({ fields: "user(permissionId)" });
    const googleId = about.data.user?.permissionId;
    if (!googleId) throw new ApiError(400, "Drive account unavailable");
    const admin = adminClient();
    const { data: previous, error: previousError } = await admin
      .from("drive_connections")
      .select("*")
      .eq("user_id", userId)
      .maybeSingle();
    if (previousError) throw previousError;
    if (previous && previous.google_user_id !== googleId) {
      const { count, error } = await admin
        .from("transaction_attachments")
        .select("id", { count: "exact", head: true })
        .eq("user_id", userId);
      if (error || count)
        return Response.redirect(`${origin}/storage?drive=wrong-account`, 303);
    }
    let folderId =
      previous?.google_user_id === googleId ? previous.folder_id : null;
    if (folderId) {
      try {
        const folder = await api.files.get({
          fileId: folderId,
          fields: "id,trashed,mimeType",
        });
        if (
          folder.data.trashed ||
          folder.data.mimeType !== "application/vnd.google-apps.folder"
        )
          folderId = null;
      } catch {
        folderId = null;
      }
    }
    if (!folderId) {
      const folder = await api.files.create({
        requestBody: {
          name: "Finori — Lampiran",
          mimeType: "application/vnd.google-apps.folder",
        },
        fields: "id",
      });
      folderId = folder.data.id ?? null;
    }
    if (!folderId) throw new ApiError(502, "Folder unavailable");
    const { error } = await admin.from("drive_connections").upsert({
      user_id: userId,
      google_user_id: googleId,
      folder_id: folderId,
      refresh_token: encryptSecret(tokens.refresh_token, encryptionKey()),
      connected_at: new Date().toISOString(),
    });
    if (error) throw error;
    return Response.redirect(`${origin}/storage?drive=connected`, 303);
  } catch {
    return new Response(null, {
      status: 303,
      headers: { ...privateHeaders, Location: `${origin}/storage?drive=error` },
    });
  }
}
