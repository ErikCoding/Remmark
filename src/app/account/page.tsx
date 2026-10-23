"use client";

import { FormEvent, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { LogOut } from "lucide-react";
import { AppShell } from "@/components/app/app-shell";
import { PageHeader } from "@/components/app/page-header";
import { Button } from "@/components/ui/button";
import { Field, Input } from "@/components/ui/field";
import { useAuth } from "@/context/auth-context";

export default function AccountPage() {
  const router = useRouter();
  const { user, profile, logout, changePassword, updateName } = useAuth();
  const [name, setName] = useState("");
  const [password, setPassword] = useState("");
  const [nameMessage, setNameMessage] = useState<string | null>(null);
  const [passwordMessage, setPasswordMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (profile?.name) setName(profile.name);
  }, [profile?.name]);

  async function handleName(event: FormEvent) {
    event.preventDefault();
    setError(null);
    setNameMessage(null);
    try {
      await updateName(name);
      setNameMessage("Zapisano.");
    } catch (nameError) {
      setError(nameError instanceof Error ? nameError.message : "Nie udało się zapisać.");
    }
  }

  async function handlePassword(event: FormEvent) {
    event.preventDefault();
    setSaving(true);
    setError(null);
    setPasswordMessage(null);
    try {
      await changePassword(password);
      setPassword("");
      setPasswordMessage("Hasło zmienione.");
    } catch (passwordError) {
      setError(passwordError instanceof Error ? passwordError.message : "Nie udało się zmienić hasła.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <AppShell>
      <PageHeader title="Konto" subtitle={user?.email ?? undefined} />
      <div className="space-y-6">
        {error ? <p className="rounded-xl bg-stop-soft px-3 py-2 text-[15px] font-semibold text-stop">{error}</p> : null}

        <form className="panel space-y-3 p-4" onSubmit={handleName}>
          <Field hint="Pojawia się na raportach PDF." label="Imię i nazwisko">
            <Input value={name} onChange={(event) => setName(event.target.value)} />
          </Field>
          <div className="flex items-center gap-3">
            <Button type="submit">Zapisz</Button>
            {nameMessage ? <span className="text-[15px] font-semibold text-go">{nameMessage}</span> : null}
          </div>
        </form>

        <form className="panel space-y-3 p-4" onSubmit={handlePassword}>
          <Field hint="Minimum 8 znaków. Czasem trzeba się najpierw wylogować i zalogować ponownie." label="Nowe hasło">
            <Input autoComplete="new-password" minLength={8} type="password" value={password} onChange={(event) => setPassword(event.target.value)} />
          </Field>
          <div className="flex items-center gap-3">
            <Button disabled={saving || password.length < 8} type="submit">
              {saving ? "Zmieniam…" : "Zmień hasło"}
            </Button>
            {passwordMessage ? <span className="text-[15px] font-semibold text-go">{passwordMessage}</span> : null}
          </div>
        </form>

        <section className="panel p-4 text-[15px] leading-snug text-steel">
          <p className="mb-1 font-semibold text-ink">Ikona na ekranie telefonu</p>
          <p>iPhone: w Safari dotknij „Udostępnij”, potem „Do ekranu początkowego”.</p>
          <p>Android: w Chrome dotknij menu (trzy kropki), potem „Dodaj do ekranu głównego”.</p>
        </section>

        <Button
          full
          variant="secondary"
          onClick={async () => {
            await logout();
            router.replace("/login");
          }}
        >
          <LogOut className="h-5 w-5" />
          Wyloguj się
        </Button>
      </div>
    </AppShell>
  );
}
