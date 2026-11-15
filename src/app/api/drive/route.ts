import { CodeChallengeMethod } from "google-auth-library";
import { cookies } from "next/headers";
import { randomBytes } from "node:crypto";
import {
  authenticate,
  adminClient,
  connectedDrive,
  oauthClient,
  encryptionKey,
  ApiError,
  errorResponse,
  privateHeaders,
} from "@/lib/drive/server";
import { encryptSecret } from "@/lib/drive/security";
export async function GET(request: Request) {
  try {
    const { userId } = await authenticate(request);
    let configured = true;
    try {
      oauthClient();
      adminClient();
    } catch {
      configured = false;
    }
    if (!configured)
      return Response.json(
        { configured: false, connected: false },
        { headers: privateHeaders },
      );
    const { data, error } = await adminClient()
      .from("drive_connections")
      .select("folder_id, refresh_token, connected_at")
      .eq("user_id", userId)
      .maybeSingle();
    if (error) throw new ApiError(500, "Status Drive belum dapat dimuat.");
    return Response.json(
      {
        configured,
        connected: Boolean(data?.refresh_token),
        connectedAt: data?.connected_at,
        folderUrl: data?.folder_id
          ? `https://drive.google.com/drive/folders/${encodeURIComponent(data.folder_id)}`
          : null,
      },
      { headers: privateHeaders },
    );
  } catch (cause) {
    return errorResponse(cause);
  }
}
export async function POST(request: Request) {
  try {
    const { token } = await authenticate(request);
    adminClient();
    const oauth = oauthClient();
    const state = randomBytes(32).toString("base64url");
    const { codeVerifier, codeChallenge } =
      await oauth.generateCodeVerifierAsync();
    const redirectUri = new URL(process.env.GOOGLE_REDIRECT_URI!);
    // Next may normalize request.url to localhost; compare the actual HTTP host.
    if (
      (request.headers.get("host") ?? new URL(request.url).host) !==
      redirectUri.host
    )
      throw new ApiError(
        400,
        "Buka aplikasi dari origin yang sama dengan GOOGLE_REDIRECT_URI.",
      );
    const jar = await cookies();
    jar.set(
      "finori-drive-oauth",
      encryptSecret(
        JSON.stringify({
          state,
          token,
          codeVerifier,
          expires: Date.now() + 600000,
        }),
        encryptionKey(),
      ),
      {
        httpOnly: true,
        sameSite: "lax",
        secure: redirectUri.protocol === "https:",
        path: "/api/drive",
        maxAge: 600,
      },
    );
    const url = oauth.generateAuthUrl({
      access_type: "offline",
      prompt: "consent",
      scope: ["https://www.googleapis.com/auth/drive.file"],
      state,
      code_challenge: codeChallenge,
      code_challenge_method: CodeChallengeMethod.S256,
    });
    return Response.json({ url }, { headers: privateHeaders });
  } catch (cause) {
    return errorResponse(cause);
  }
}
export async function DELETE(request: Request) {
  try {
    const { userId } = await authenticate(request);
    const { oauth, admin } = await connectedDrive(userId);
    // Clear the local credential even if Google is temporarily unreachable.
    let revoked = true;
    try {
      await oauth.revokeToken(oauth.credentials.refresh_token!);
    } catch {
      revoked = false;
    }
    const { error } = await admin
      .from("drive_connections")
      .update({ refresh_token: null })
      .eq("user_id", userId);
    if (error) throw new ApiError(500, "Koneksi belum dapat diputus.");
    return Response.json(
      {
        disconnected: true,
        warning: revoked
          ? null
          : "Token lokal dihapus. Cabut juga izin Finori di pengaturan akun Google jika diperlukan.",
      },
      { headers: privateHeaders },
    );
  } catch (cause) {
    return errorResponse(cause);
  }
}
