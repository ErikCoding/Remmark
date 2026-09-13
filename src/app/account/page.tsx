"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { AppShell } from "@/components/app/app-shell";
import { PageHeader } from "@/components/app/page-header";
import { Button } from "@/components/ui/button";
import { Field, Input } from "@/components/ui/field";
import { useAuth } from "@/context/auth-context";
import { initials } from "@/lib/utils/text";

export default function AccountPage() {
  const router = useRouter();
  const { user, profile, logout, changePassword } = useAuth();
  const [password, setPassword] = useState("");
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  async function handleLogout() {
    await logout();
    router.replace("/login");
  }

  async function handlePassword(event: FormEvent) {
    event.preventDefault();
    setSaving(true);
    setError(null);
    setMessage(null);
    try {
      await changePassword(password);
      setPassword("");
      setMessage("Hasło zostało zmienione.");
    } catch (passwordError) {
      setError(passwordError instanceof Error ? passwordError.message : "Nie udało się zmienić hasła.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <AppShell>
      <PageHeader title="Konto" subtitle="Profil użytkownika i ustawienia sesji." />
      <div className="space-y-5">
        <section className="surface-flat p-4 shadow-[0_12px_30px_rgba(15,23,42,0.05)]">
          <div className="flex items-center gap-4">
            <span className="flex h-14 w-14 items-center justify-center rounded-2xl bg-slate-100 text-xl font-black text-ink">
              {initials(profile?.name || user?.email)}
            </span>
            <div>
              <h2 className="font-bold text-ink">{profile?.name ?? "Użytkownik Remmark"}</h2>
              <p className="text-sm text-muted">{profile?.email || user?.email}</p>
            </div>
          </div>
          <Button className="mt-5" variant="secondary" onClick={handleLogout} full>
            Wyloguj się
          </Button>
        </section>
        <form className="surface-flat p-4 shadow-[0_12px_30px_rgba(15,23,42,0.05)]" onSubmit={handlePassword}>
          <h2 className="font-black text-ink">Zmiana hasła</h2>
          <p className="mt-1 text-sm font-medium leading-6 text-muted">Firebase może wymagać świeżego logowania przed zmianą hasła.</p>
          {message ? <p className="mt-4 rounded-xl bg-emerald-50 px-3 py-2 text-sm font-semibold text-success">{message}</p> : null}
          {error ? <p className="mt-4 rounded-xl bg-red-50 px-3 py-2 text-sm font-semibold text-danger">{error}</p> : null}
          <div className="mt-4">
            <Field label="Nowe hasło">
              <Input minLength={8} type="password" value={password} onChange={(event) => setPassword(event.target.value)} />
            </Field>
          </div>
          <Button className="mt-4" disabled={saving || password.length < 8}>
            {saving ? "Zapisywanie..." : "Zmień hasło"}
          </Button>
        </form>
      </div>
    </AppShell>
  );
}
