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
      await login(email, password);
      router.replace("/dashboard");
    } catch (loginError) {
      setError(loginError instanceof Error ? loginError.message : "Nie udało się zalogować.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-paper px-4 py-10">
      <section className="w-full max-w-sm rounded-lg border border-line bg-white p-5 shadow-soft">
        <div className="mb-8 flex items-center gap-3">
          <span className="flex h-12 w-12 items-center justify-center rounded-lg bg-brand-600 text-xl font-bold text-white">R</span>
          <div>
            <h1 className="text-xl font-bold text-ink">Remmark</h1>
            <p className="text-sm text-muted">Zaloguj się do aplikacji</p>
          </div>
        </div>
        <form className="space-y-4" onSubmit={handleSubmit}>
          {(error || authError) ? (
            <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-danger">{error || authError}</p>
          ) : null}
          <Field label="Email">
            <Input autoComplete="email" inputMode="email" type="email" value={email} onChange={(event) => setEmail(event.target.value)} required />
          </Field>
          <Field label="Hasło">
            <Input autoComplete="current-password" type="password" value={password} onChange={(event) => setPassword(event.target.value)} required />
          </Field>
          <Button disabled={loading} full>
            {loading ? "Logowanie..." : "Zaloguj się"}
          </Button>
        </form>
      </section>
    </main>
  );
}
