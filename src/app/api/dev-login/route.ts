import { createClient } from "@supabase/supabase-js";

const loopbackHosts = new Set(["localhost", "127.0.0.1", "[::1]"]);

export async function POST(request: Request) {
  const headers = { "Cache-Control": "no-store" };
  if (process.env.NODE_ENV !== "development")
    return new Response(null, { status: 404, headers });
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const requestHost = request.headers.get("host") ?? new URL(request.url).host;
  try {
    if (
      !url ||
      !loopbackHosts.has(new URL(url).hostname) ||
      !loopbackHosts.has(new URL(`http://${requestHost}`).hostname)
    )
      return new Response(null, { status: 404, headers });
  } catch {
    return new Response(null, { status: 404, headers });
  }
  if (
    request.headers.get("origin") !==
    new URL(`${new URL(request.url).protocol}//${requestHost}`).origin
  )
    return new Response(null, { status: 403, headers });
  const email = process.env.DEV_TEST_EMAIL;
  const password = process.env.DEV_TEST_PASSWORD;
  const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
  if (!email || !password || !key)
    return Response.json(
      {
        error:
          "Jalankan npm run dev:account untuk menyiapkan akun testing lokal.",
      },
      { status: 503, headers },
    );
  try {
    const client = createClient(url, key, {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
        detectSessionInUrl: false,
      },
    });
    const { data, error } = await client.auth.signInWithPassword({
      email,
      password,
    });
    if (error || !data.session)
      return Response.json(
        {
          error:
            "Akun testing belum dapat diakses. Pastikan Supabase lokal aktif dan jalankan npm run dev:account.",
        },
        { status: 502, headers },
      );
    return Response.json(
      {
        access_token: data.session.access_token,
        refresh_token: data.session.refresh_token,
      },
      { headers },
    );
  } catch {
    return Response.json(
      { error: "Tidak dapat menghubungi Supabase lokal." },
      { status: 502, headers },
    );
  }
}
