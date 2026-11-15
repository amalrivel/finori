"use client";

import { useState } from "react";
import { Controller, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import type { z } from "zod";
import { createAuthSchema } from "@/lib/form-schemas";
import { Sprout } from "lucide-react";
import { supabase } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
} from "@/components/ui/card";
import {
  Field,
  FieldGroup,
  FieldLabel,
  FieldError,
} from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Alert, AlertTitle } from "@/components/ui/alert";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";

export function AuthForm() {
  const [mode, setMode] = useState("login");
  const [devPending, setDevPending] = useState(false);
  const [notice, setNotice] = useState("");
  const schema = createAuthSchema(mode);
  const form = useForm<z.infer<typeof schema>>({
    resolver: zodResolver(schema),
    defaultValues: { email: "", password: "" },
  });
  const pending = form.formState.isSubmitting || devPending;
  const error = form.formState.errors.root?.message;
  async function submit(values: z.infer<typeof schema>) {
    form.clearErrors("root");
    setNotice("");
    try {
      const result =
        mode === "login"
          ? await supabase.auth.signInWithPassword(values)
          : await supabase.auth.signUp(values);
      if (result.error) throw result.error;
      if (mode === "register" && !result.data.session)
        setNotice("Akun dibuat. Buka email konfirmasi sebelum masuk.");
    } catch (cause) {
      form.setError("root", {
        message:
          cause instanceof Error
            ? cause.message
            : "Tidak dapat masuk. Periksa koneksi dan coba lagi.",
      });
    }
  }
  async function devLogin() {
    setDevPending(true);
    form.clearErrors();
    setNotice("");
    try {
      const response = await fetch("/api/dev-login", { method: "POST" });
      const result = await response.json();
      if (!response.ok)
        throw new Error(result.error ?? "Akun testing belum dapat diakses.");
      const { error } = await supabase.auth.setSession({
        access_token: result.access_token,
        refresh_token: result.refresh_token,
      });
      if (error) throw error;
    } catch (cause) {
      form.setError("root", {
        message:
          cause instanceof Error
            ? cause.message
            : "Tidak dapat masuk ke akun testing.",
      });
    } finally {
      setDevPending(false);
    }
  }
  return (
    <main className="flex min-h-svh items-center justify-center px-4 py-10">
      <Card className="w-full max-w-md">
        <CardHeader>
          <div className="mb-4 flex items-center gap-2 text-2xl font-semibold">
            <Sprout className="size-7 text-primary" />
            finori.
          </div>
          <CardTitle>
            {mode === "login"
              ? "Masuk ke ruang keuanganmu"
              : "Buat akun Finori"}
          </CardTitle>
          <CardDescription>
            Masuk untuk mengelola rekening dan catatan keuangan pribadi Anda.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form
            onSubmit={form.handleSubmit(submit)}
            noValidate
            className="flex flex-col gap-5"
          >
            <ToggleGroup
              value={[mode]}
              onValueChange={(values) => {
                if (values[0]) {
                  setMode(values[0]);
                  form.clearErrors();
                  setNotice("");
                }
              }}
              variant="outline"
              aria-label="Pilih masuk atau daftar"
              disabled={pending}
            >
              <ToggleGroupItem value="login">Masuk</ToggleGroupItem>
              <ToggleGroupItem value="register">Daftar akun</ToggleGroupItem>
            </ToggleGroup>
            <FieldGroup>
              <Controller
                name="email"
                control={form.control}
                render={({ field, fieldState }) => (
                  <Field data-invalid={fieldState.invalid}>
                    <FieldLabel htmlFor="auth-email">Email</FieldLabel>
                    <Input
                      {...field}
                      id="auth-email"
                      type="email"
                      autoComplete="email"
                      disabled={pending}
                      aria-invalid={fieldState.invalid}
                    />
                    {fieldState.invalid && (
                      <FieldError errors={[fieldState.error]} />
                    )}
                  </Field>
                )}
              />
              <Controller
                name="password"
                control={form.control}
                render={({ field, fieldState }) => (
                  <Field data-invalid={fieldState.invalid}>
                    <FieldLabel htmlFor="auth-password">Password</FieldLabel>
                    <Input
                      {...field}
                      id="auth-password"
                      type="password"
                      autoComplete={
                        mode === "login" ? "current-password" : "new-password"
                      }
                      disabled={pending}
                      aria-invalid={fieldState.invalid}
                    />
                    {fieldState.invalid && (
                      <FieldError errors={[fieldState.error]} />
                    )}
                  </Field>
                )}
              />
            </FieldGroup>
            {error && (
              <Alert variant="destructive">
                <AlertTitle>{error}</AlertTitle>
              </Alert>
            )}
            {notice && (
              <p role="status" className="text-sm text-muted-foreground">
                {notice}
              </p>
            )}
            <Button type="submit" size="lg" disabled={pending}>
              {pending
                ? "Memproses…"
                : mode === "login"
                  ? "Masuk"
                  : "Buat akun"}
            </Button>
            {process.env.NODE_ENV === "development" && (
              <div className="flex flex-col gap-2 border-t pt-4">
                <Button
                  type="button"
                  variant="secondary"
                  size="lg"
                  onClick={devLogin}
                  disabled={pending}
                >
                  Masuk akun testing
                </Button>
                <p className="text-xs text-muted-foreground">
                  Khusus development lokal. Data testing tersimpan terpisah dari
                  akun pribadi Anda.
                </p>
              </div>
            )}
          </form>
        </CardContent>
      </Card>
    </main>
  );
}
