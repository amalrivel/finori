"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { apiRequest } from "@/lib/api-client";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
} from "@/components/ui/card";
import { Alert, AlertTitle, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
type Status = {
  configured: boolean;
  connected: boolean;
  connectedAt?: string;
  folderUrl?: string;
};
export function DriveSettings() {
  const [status, setStatus] = useState<Status | null>(null);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [pending, setPending] = useState(false);
  const [confirmDisconnect, setConfirmDisconnect] = useState(false);
  useEffect(() => {
    let active = true;
    apiRequest("/api/drive")
      .then((response) => response.json())
      .then((value) => {
        if (!active) return;
        setStatus(value);
        const result = new URLSearchParams(window.location.search).get("drive");
        if (result === "connected")
          setNotice(
            "Google Drive berhasil dihubungkan. Buka Detail transaksi untuk menambahkan gambar.",
          );
        if (result === "error")
          setError(
            "Koneksi Google Drive belum berhasil atau dibatalkan. Periksa konfigurasi OAuth dan coba hubungkan kembali.",
          );
        if (result === "wrong-account")
          setError(
            "Masih ada lampiran pada akun Google sebelumnya. Hubungkan kembali akun tersebut agar seluruh gambar tetap dapat diakses.",
          );
      })
      .catch((cause) => {
        if (active) setError(cause.message);
      });
    return () => {
      active = false;
    };
  }, []);
  async function connect() {
    setPending(true);
    setError("");
    try {
      const result = await (
        await apiRequest("/api/drive", { method: "POST" })
      ).json();
      window.location.assign(result.url);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Koneksi gagal.");
    } finally {
      setPending(false);
    }
  }
  async function disconnect() {
    setPending(true);
    setError("");
    try {
      const result = await (
        await apiRequest("/api/drive", { method: "DELETE" })
      ).json();
      setStatus((current) =>
        current ? { ...current, connected: false } : current,
      );
      setConfirmDisconnect(false);
      setNotice(
        result.warning ??
          "Koneksi diputus. File tetap ada di Drive pribadi dan metadata lampiran tetap tersimpan.",
      );
    } catch (cause) {
      setError(
        cause instanceof Error ? cause.message : "Koneksi belum dapat diputus.",
      );
    } finally {
      setPending(false);
    }
  }
  return (
    <div className="flex max-w-3xl flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold">Penyimpanan lampiran</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Hubungkan Google Drive pribadi untuk menyimpan gambar struk dan bukti
          transaksi.
        </p>
      </div>
      {error && (
        <Alert variant="destructive">
          <AlertTitle>Perlu diperiksa</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}
      {notice && (
        <Alert>
          <AlertTitle>Status penyimpanan</AlertTitle>
          <AlertDescription>{notice}</AlertDescription>
        </Alert>
      )}
      <Card>
        <CardHeader>
          <CardTitle>Google Drive</CardTitle>
          <CardDescription>
            Gambar privat, terhubung langsung dengan transaksi Anda.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          {!status ? (
            <p role="status">
              {error
                ? "Status belum dapat dimuat. Muat ulang halaman untuk mencoba lagi."
                : "Memeriksa koneksi…"}
            </p>
          ) : (
            <>
              <Badge variant="secondary" className="w-fit">
                {status.connected ? "Terhubung" : "Belum terhubung"}
              </Badge>
              {!status.configured && (
                <Alert>
                  <AlertTitle>Setup Google Cloud diperlukan</AlertTitle>
                  <AlertDescription>
                    Konfigurasi OAuth belum tersedia di server. Ikuti panduan{" "}
                    <code>docs/google-drive.md</code> di proyek ini, isi
                    konfigurasi privat, lalu jalankan ulang aplikasi. Tidak
                    perlu mengirim secret lewat chat.
                  </AlertDescription>
                </Alert>
              )}
              <p className="text-sm leading-6 text-muted-foreground">
                Finori meminta akses hanya pada file yang dibuat melalui
                aplikasi. Foto tidak dibagikan ke publik. Transaksi dan rincian
                barang tetap disimpan di Supabase; gambar disimpan di folder
                “Finori — Lampiran” pada Drive Anda.
              </p>
              <div className="flex flex-wrap gap-2">
                <Button
                  onClick={connect}
                  disabled={pending || !status.configured}
                >
                  {pending
                    ? "Memproses…"
                    : status.connected
                      ? "Hubungkan ulang Google Drive"
                      : "Hubungkan Google Drive"}
                </Button>
                {status.connected && (
                  <Button
                    variant="outline"
                    disabled={pending}
                    onClick={() => setConfirmDisconnect(true)}
                  >
                    Putuskan koneksi
                  </Button>
                )}
                {status.connected && status.folderUrl && (
                  <Button
                    variant="outline"
                    nativeButton={false}
                    render={
                      <a
                        href={status.folderUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                      />
                    }
                  >
                    Buka folder Drive
                  </Button>
                )}
              </div>
              {confirmDisconnect && (
                <Alert>
                  <AlertTitle>Putuskan koneksi Drive?</AlertTitle>
                  <AlertDescription>
                    Gambar tetap di Drive. Untuk membuka atau mengelola lampiran
                    melalui Finori, hubungkan kembali akun Google yang sama.
                  </AlertDescription>
                  <div className="mt-3 flex gap-2">
                    <Button
                      variant="destructive"
                      disabled={pending}
                      onClick={disconnect}
                    >
                      Ya, putuskan
                    </Button>
                    <Button
                      variant="outline"
                      disabled={pending}
                      onClick={() => setConfirmDisconnect(false)}
                    >
                      Batal
                    </Button>
                  </div>
                </Alert>
              )}
            </>
          )}
          <Button
            variant="link"
            className="self-start"
            nativeButton={false}
            render={<Link href="/transactions" />}
          >
            Kembali ke transaksi
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
