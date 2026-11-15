"use client";

import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { Controller, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { apiRequest } from "@/lib/api-client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Field, FieldLabel, FieldError } from "@/components/ui/field";
import { Alert, AlertTitle, AlertDescription } from "@/components/ui/alert";

type Attachment = {
  id: string;
  name: string;
  mime_type: string;
  size: number;
  created_at: string;
  slot: number;
};
const renameSchema = z.object({
  name: z
    .string()
    .trim()
    .min(1, "Nama wajib diisi.")
    .max(120, "Maksimal 120 karakter.")
    .regex(
      /^[^\u0000-\u001f\u007f/\\]+$/,
      "Nama tidak boleh memuat slash atau karakter kontrol.",
    ),
});

export function TransactionAttachments({
  transactionId,
  onBusyChange,
}: {
  transactionId: string;
  onBusyChange: (value: boolean) => void;
}) {
  const path = `/api/transactions/${transactionId}/attachments`;
  const [rows, setRows] = useState<Attachment[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [pending, setPending] = useState(false);
  const [editing, setEditing] = useState<string | null>(null);
  const [deleting, setDeleting] = useState<string | null>(null);
  const [preview, setPreview] = useState<{
    id: string;
    name: string;
    url: string;
  } | null>(null);
  const mounted = useRef(false);
  const fileInput = useRef<HTMLInputElement>(null);
  const form = useForm({
    resolver: zodResolver(renameSchema),
    defaultValues: { name: "" },
  });
  useEffect(() => {
    mounted.current = true;
    apiRequest(path)
      .then((response) => response.json())
      .then((value) => {
        if (mounted.current) setRows(value.attachments);
      })
      .catch((cause) => {
        if (mounted.current) setError(cause.message);
      })
      .finally(() => {
        if (mounted.current) setLoading(false);
      });
    return () => {
      mounted.current = false;
    };
  }, [path]);
  useEffect(
    () => () => {
      if (preview) URL.revokeObjectURL(preview.url);
    },
    [preview],
  );
  async function run(action: () => Promise<void>) {
    setPending(true);
    onBusyChange(true);
    setError("");
    setNotice("");
    try {
      await action();
    } catch (cause) {
      setError(
        cause instanceof Error ? cause.message : "Operasi lampiran gagal.",
      );
    } finally {
      setPending(false);
      onBusyChange(false);
    }
  }
  return (
    <section
      aria-label="Lampiran gambar"
      className="flex min-w-0 flex-col gap-4 border-t pt-4"
    >
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h3 className="font-medium">Lampiran gambar ({rows.length}/10)</h3>
        <Button
          variant="link"
          size="sm"
          nativeButton={false}
          render={<Link href="/storage" />}
        >
          Pengaturan Drive
        </Button>
      </div>
      <p className="text-xs leading-5 text-muted-foreground">
        JPEG, PNG, atau WebP, maksimal 5 MB per gambar. Gambar disimpan privat
        di Google Drive yang Anda hubungkan.
      </p>
      {error && (
        <Alert variant="destructive">
          <AlertTitle>Lampiran belum dapat diproses</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}
      {notice && (
        <p role="status" className="text-sm">
          {notice}
        </p>
      )}
      {loading ? (
        <p role="status" className="text-sm text-muted-foreground">
          Memuat lampiran…
        </p>
      ) : (
        !rows.length && (
          <p className="text-sm text-muted-foreground">
            Belum ada gambar terkait transaksi ini.
          </p>
        )
      )}
      <ul className="flex flex-col gap-3">
        {rows.map((row) => (
          <li
            key={row.id}
            className="flex min-w-0 flex-col gap-3 rounded-lg border p-3"
          >
            <div>
              <p className="font-medium wrap-break-word">{row.name}</p>
              <p className="mt-1 text-xs text-muted-foreground">
                {row.mime_type} ·{" "}
                {(row.size / 1024).toLocaleString("id-ID", {
                  maximumFractionDigits: 0,
                })}{" "}
                KB
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              <Button
                variant="outline"
                size="sm"
                disabled={pending}
                onClick={() =>
                  run(async () => {
                    const response = await apiRequest(`${path}/${row.id}`);
                    const url = URL.createObjectURL(await response.blob());
                    if (!mounted.current) {
                      URL.revokeObjectURL(url);
                      return;
                    }
                    setPreview({ id: row.id, name: row.name, url });
                  })
                }
              >
                Lihat gambar
              </Button>
              <Button
                variant="outline"
                size="sm"
                disabled={pending}
                onClick={() => {
                  setEditing(row.id);
                  form.reset({ name: row.name });
                }}
              >
                Ubah nama
              </Button>
              <Button
                variant="destructive"
                size="sm"
                disabled={pending}
                onClick={() => setDeleting(row.id)}
              >
                Hapus lampiran
              </Button>
            </div>
            {editing === row.id && (
              <form
                noValidate
                onSubmit={form.handleSubmit((values) =>
                  run(async () => {
                    await apiRequest(`${path}/${row.id}`, {
                      method: "PATCH",
                      headers: { "Content-Type": "application/json" },
                      body: JSON.stringify(values),
                    });
                    setRows((current) =>
                      current.map((value) =>
                        value.id === row.id
                          ? { ...value, name: values.name }
                          : value,
                      ),
                    );
                    setEditing(null);
                    setNotice("Nama lampiran diperbarui.");
                  }),
                )}
                className="flex flex-col gap-3"
              >
                <Controller
                  control={form.control}
                  name="name"
                  render={({ field, fieldState }) => (
                    <Field data-invalid={fieldState.invalid}>
                      <FieldLabel htmlFor={`attachment-name-${row.id}`}>
                        Nama gambar
                      </FieldLabel>
                      <Input
                        {...field}
                        id={`attachment-name-${row.id}`}
                        disabled={pending}
                        aria-invalid={fieldState.invalid}
                      />
                      <FieldError errors={[fieldState.error]} />
                    </Field>
                  )}
                />
                <div className="flex gap-2">
                  <Button type="submit" size="sm" disabled={pending}>
                    Simpan nama
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    disabled={pending}
                    onClick={() => setEditing(null)}
                  >
                    Batal
                  </Button>
                </div>
              </form>
            )}
            {deleting === row.id && (
              <Alert>
                <AlertTitle>Pindahkan gambar ini ke sampah Drive?</AlertTitle>
                <AlertDescription>
                  Gambar tidak lagi terkait transaksi. File dapat dipulihkan
                  melalui sampah Drive.
                </AlertDescription>
                <div className="mt-3 flex gap-2">
                  <Button
                    variant="destructive"
                    size="sm"
                    disabled={pending}
                    onClick={() =>
                      run(async () => {
                        await apiRequest(`${path}/${row.id}`, {
                          method: "DELETE",
                        });
                        setRows((current) =>
                          current.filter((value) => value.id !== row.id),
                        );
                        if (preview?.id === row.id) setPreview(null);
                        setDeleting(null);
                        setNotice(
                          "Lampiran dihapus dan gambar dipindahkan ke sampah Drive.",
                        );
                      })
                    }
                  >
                    Ya, hapus lampiran
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={pending}
                    onClick={() => setDeleting(null)}
                  >
                    Batal
                  </Button>
                </div>
              </Alert>
            )}
          </li>
        ))}
      </ul>
      {preview && (
        <figure className="flex flex-col gap-2 rounded-lg border p-3">
          <figcaption className="text-sm font-medium wrap-break-word">
            {preview.name}
          </figcaption>
          <Image
            src={preview.url}
            alt={`Lampiran transaksi: ${preview.name}`}
            width={1200}
            height={900}
            unoptimized
            className="max-h-96 w-full object-contain"
          />
          <Button variant="ghost" size="sm" onClick={() => setPreview(null)}>
            Tutup gambar
          </Button>
          <Button
            variant="outline"
            size="sm"
            nativeButton={false}
            render={<a href={preview.url} download={preview.name} />}
          >
            Unduh gambar
          </Button>
        </figure>
      )}
      <Field>
        <FieldLabel htmlFor={`attachment-upload-${transactionId}`}>
          Tambah gambar
        </FieldLabel>
        <Input
          ref={fileInput}
          id={`attachment-upload-${transactionId}`}
          type="file"
          accept="image/jpeg,image/png,image/webp"
          disabled={pending || loading || rows.length >= 10}
          onChange={(event) => {
            const file = event.target.files?.[0];
            if (!file) return;
            if (file.size > 5 * 1024 * 1024) {
              setError("Gambar maksimal 5 MB.");
              event.target.value = "";
              return;
            }
            event.target.value = "";
            void run(async () => {
              const body = new FormData();
              body.set("file", file);
              const result = await (
                await apiRequest(path, { method: "POST", body })
              ).json();
              setRows((current) =>
                [...current, result.attachment].sort((a, b) => a.slot - b.slot),
              );
              if (fileInput.current) fileInput.current.value = "";
              setNotice("Gambar berhasil dilampirkan.");
            });
          }}
        />
      </Field>
      {pending && (
        <p role="status" className="text-sm text-muted-foreground">
          Memproses lampiran…
        </p>
      )}
    </section>
  );
}
