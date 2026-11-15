"use client";
import { supabase } from "@/lib/supabase/client";
export async function apiRequest(path: string, init: RequestInit = {}) {
  const { data, error } = await supabase.auth.getSession();
  if (error || !data.session) throw new Error("Silakan masuk kembali.");
  const headers = new Headers(init.headers);
  headers.set("Authorization", `Bearer ${data.session.access_token}`);
  const response = await fetch(path, { ...init, headers, cache: "no-store" });
  if (!response.ok) {
    const body = await response.json().catch(() => null);
    throw new Error(body?.error ?? "Permintaan belum berhasil. Coba lagi.");
  }
  return response;
}
