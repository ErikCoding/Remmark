"use client";

import { FormEvent, useEffect, useState } from "react";
import { LockKeyhole, LogIn } from "lucide-react";
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
    <main className="flex min-h-screen items-center justify-center px-4 py-10">
      <section className="surface w-full max-w-md p-6 md:p-7">
        <div className="mb-8 flex items-center gap-4">
          <span className="flex h-14 w-14 items-center justify-center rounded-2xl bg-ink text-2xl font-black text-white shadow-[0_18px_34px_rgba(18,24,38,0.22)]">R</span>
          <div>
            <h1 className="text-2xl font-black text-ink">Remmark</h1>
            <p className="mt-1 text-sm font-semibold text-muted">Prywatny panel logów budowy</p>
          </div>
        </div>
        <form className="space-y-4" onSubmit={handleSubmit}>
          {(error || authError) ? (
            <p className="rounded-xl bg-red-50 px-3 py-2 text-sm font-semibold text-danger">{error || authError}</p>
          ) : null}
          <Field label="Email">
            <Input autoComplete="email" inputMode="email" type="email" value={email} onChange={(event) => setEmail(event.target.value)} required />
          </Field>
          <Field label="Hasło">
            <Input autoComplete="current-password" type="password" value={password} onChange={(event) => setPassword(event.target.value)} required />
          </Field>
          <Button className="mt-2" disabled={loading} full>
            {loading ? <LockKeyhole className="h-4 w-4" /> : <LogIn className="h-4 w-4" />}
            {loading ? "Logowanie..." : "Zaloguj się"}
          </Button>
        </form>
      </section>
    </main>
  );
}
