"use client";

import { FormEvent, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Field, Input } from "@/components/ui/field";
import { useAuth } from "@/context/auth-context";

export default function LoginPage() {
  const router = useRouter();
  const { user, login, error: authError } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (user) router.replace("/dashboard");
  }, [router, user]);

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setLoading(true);
    setError(null);
    try {
      await login(email.trim(), password);
      router.replace("/dashboard");
    } catch (loginError) {
      setError(loginError instanceof Error ? loginError.message : "Nie udało się zalogować.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="flex min-h-screen flex-col justify-center px-4 py-10">
      <div className="mx-auto w-full max-w-sm">
        <div className="mb-8">
          <span className="relative mb-4 flex h-14 w-14 items-center justify-center rounded-xl bg-ink font-cond text-3xl font-bold text-white">
            R
            <span className="absolute inset-x-2.5 bottom-2 h-1 rounded-full bg-vis" />
          </span>
          <h1 className="font-cond text-[40px] font-bold leading-none text-ink">Remmark</h1>
          <p className="mt-2 text-[17px] text-steel">Dziennik pracy na budowie</p>
        </div>
        <form className="space-y-4" onSubmit={handleSubmit}>
          {error || authError ? (
            <p className="rounded-xl bg-stop-soft px-3 py-2 text-[15px] font-semibold text-stop" role="alert">
              {error || authError}
            </p>
          ) : null}
          <Field label="Email">
            <Input autoComplete="email" inputMode="email" required type="email" value={email} onChange={(event) => setEmail(event.target.value)} />
          </Field>
          <Field label="Hasło">
            <Input autoComplete="current-password" required type="password" value={password} onChange={(event) => setPassword(event.target.value)} />
          </Field>
          <Button className="!mt-6" disabled={loading} full size="lg" type="submit" variant="vis">
            {loading ? "Loguję…" : "Zaloguj się"}
          </Button>
        </form>
        <p className="mt-6 text-sm text-steel">Aplikacja zapamięta logowanie na tym telefonie.</p>
      </div>
    </main>
  );
}
