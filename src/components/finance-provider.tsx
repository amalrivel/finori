"use client";

import { createContext, useContext, useEffect, useState } from "react";
import { ArrowDownLeft, ArrowUpRight, type LucideIcon } from "lucide-react";
import type { Session } from "@supabase/supabase-js";
import type { Account, TransactionDraft } from "@/lib/finance";
import { supabase } from "@/lib/supabase/client";
import {
  accountFromRow,
  accountToRow,
  transactionFromRow,
  transactionToRow,
} from "@/lib/supabase/records";
import { AuthForm } from "@/components/auth-form";
import { Alert, AlertTitle, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";

type Transaction = TransactionDraft & { id: string; icon: LucideIcon };
type Snapshot = {
  userId: string | null;
  accounts: Account[];
  transactions: Transaction[];
};
const withIcon = (
  transaction: TransactionDraft & { id: string },
): Transaction => ({
  ...transaction,
  icon: transaction.amount > 0 ? ArrowDownLeft : ArrowUpRight,
});

const FinanceContext = createContext<{
  accounts: Account[];
  transactions: Transaction[];
  email: string;
  saveAccount: (account: Account) => Promise<void>;
  deleteAccount: (id: string) => Promise<void>;
  addTransactions: (transactions: TransactionDraft[]) => Promise<void>;
  signOut: () => Promise<void>;
} | null>(null);

async function readFinance(userId: string): Promise<Snapshot> {
  const snapshot: Snapshot = { userId, accounts: [], transactions: [] };
  for (let offset = 0; ; offset += 1000) {
    const [accounts, transactions] = await Promise.all([
      supabase
        .from("accounts")
        .select("*")
        .order("created_at")
        .order("id")
        .range(offset, offset + 999),
      supabase
        .from("transactions")
        .select("*")
        .order("created_at")
        .order("id")
        .range(offset, offset + 999),
    ]);
    if (accounts.error) throw accounts.error;
    if (transactions.error) throw transactions.error;
    snapshot.accounts.push(...accounts.data.map(accountFromRow));
    snapshot.transactions.push(
      ...transactions.data.map((row) => withIcon(transactionFromRow(row))),
    );
    if (accounts.data.length < 1000 && transactions.data.length < 1000)
      return snapshot;
  }
}

export function FinanceProvider({ children }: { children: React.ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [ready, setReady] = useState(false);
  const [snapshot, setSnapshot] = useState<Snapshot>({
    userId: null,
    accounts: [],
    transactions: [],
  });
  const [failure, setFailure] = useState<{
    userId: string;
    message: string;
  } | null>(null);
  const [retry, setRetry] = useState(0);
  const userId = session?.user.id;

  useEffect(() => {
    let active = true;
    const { data } = supabase.auth.onAuthStateChange((_event, next) => {
      if (active) {
        setSession(next);
        setReady(true);
      }
    });
    supabase.auth.getSession().then(({ data, error }) => {
      if (active) {
        setSession(error ? null : data.session);
        setReady(true);
      }
    });
    return () => {
      active = false;
      data.subscription.unsubscribe();
    };
  }, []);

  useEffect(() => {
    if (!userId) return;
    let active = true;
    readFinance(userId)
      .then((next) => {
        if (active) {
          setSnapshot(next);
          setFailure(null);
        }
      })
      .catch((cause) => {
        if (active)
          setFailure({
            userId,
            message:
              cause instanceof Error
                ? cause.message
                : String(cause.message ?? "Tidak dapat memuat data Supabase."),
          });
      });
    return () => {
      active = false;
    };
  }, [userId, retry]);

  async function saveAccount(account: Account) {
    if (!userId) throw new Error("Silakan masuk kembali.");
    const row = accountToRow(account, userId);
    const existing = snapshot.accounts.some(
      (current) => current.id === account.id,
    );
    const query = existing
      ? supabase
          .from("accounts")
          .update({
            currency: row.currency,
            name: row.name,
            kind: row.kind,
            description: row.description,
            opening_balance: row.opening_balance,
          })
          .eq("id", account.id)
      : supabase.from("accounts").insert(row);
    const { data, error } = await query.select().single();
    if (error) throw new Error(error.message);
    const saved = accountFromRow(data);
    setSnapshot((current) =>
      current.userId === userId
        ? {
            ...current,
            accounts: existing
              ? current.accounts.map((value) =>
                  value.id === saved.id ? saved : value,
                )
              : [...current.accounts, saved],
          }
        : current,
    );
  }

  async function deleteAccount(id: string) {
    const { error } = await supabase
      .from("accounts")
      .delete()
      .eq("id", id)
      .select()
      .single();
    if (error)
      throw new Error(
        error.code === "23503"
          ? "Rekening ini memiliki transaksi dan tidak dapat dihapus."
          : error.message,
      );
    setSnapshot((current) =>
      current.userId === userId
        ? {
            ...current,
            accounts: current.accounts.filter((account) => account.id !== id),
          }
        : current,
    );
  }

  async function addTransactions(transactions: TransactionDraft[]) {
    if (!userId) throw new Error("Silakan masuk kembali.");
    if (!transactions.length || transactions.length > 500)
      throw new Error("Simpan 1–500 transaksi sekaligus.");
    const { data, error } = await supabase
      .from("transactions")
      .insert(
        transactions.map((transaction) =>
          transactionToRow(transaction, userId),
        ),
      )
      .select();
    if (error) throw new Error(error.message);
    const saved = data.map((row) => withIcon(transactionFromRow(row)));
    setSnapshot((current) =>
      current.userId === userId
        ? { ...current, transactions: [...current.transactions, ...saved] }
        : current,
    );
  }

  async function signOut() {
    const { error } = await supabase.auth.signOut();
    if (error) throw new Error(error.message);
    setSnapshot({ userId: null, accounts: [], transactions: [] });
  }

  if (!ready)
    return (
      <div role="status" className="p-8 text-center text-muted-foreground">
        Menyiapkan sesi Finori…
      </div>
    );
  if (!session) return <AuthForm />;
  if (failure && failure.userId === userId)
    return (
      <div className="mx-auto flex min-h-svh max-w-lg flex-col justify-center gap-4 px-4">
        <Alert variant="destructive">
          <AlertTitle>Data belum dapat dimuat</AlertTitle>
          <AlertDescription>{failure.message}</AlertDescription>
        </Alert>
        <Button onClick={() => setRetry((value) => value + 1)}>
          Coba lagi
        </Button>
      </div>
    );
  if (snapshot.userId !== userId)
    return (
      <div role="status" className="p-8 text-center text-muted-foreground">
        Memuat rekening dan transaksi…
      </div>
    );
  return (
    <FinanceContext.Provider
      value={{
        accounts: snapshot.accounts,
        transactions: snapshot.transactions,
        email: session.user.email ?? "",
        saveAccount,
        deleteAccount,
        addTransactions,
        signOut,
      }}
    >
      {children}
    </FinanceContext.Provider>
  );
}

export function useFinance() {
  const context = useContext(FinanceContext);
  if (!context)
    throw new Error("useFinance harus dipakai di dalam FinanceProvider");
  return context;
}
