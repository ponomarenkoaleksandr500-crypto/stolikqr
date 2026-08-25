"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { staffLogin } from "@/lib/api";
import { storeStaffSession } from "@/lib/staffAuth";

export default function WaiterLoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    setError(null);
    setIsSubmitting(true);
    try {
      const result = await staffLogin(email, password);
      storeStaffSession(result.accessToken, result.staff);
      router.push("/waiter");
    } catch {
      setError("Невірний email або пароль");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-paper px-4">
      <form
        onSubmit={handleSubmit}
        className="w-full max-w-sm rounded-2xl border border-ink-100 bg-surface p-6 shadow-sm"
      >
        <h1 className="font-display text-xl font-semibold text-ink-900">Вхід для персоналу</h1>
        <p className="mt-1 text-sm text-ink-500">StolikQR — Waiter App</p>

        <div className="mt-5 flex flex-col gap-3">
          <input
            type="email"
            required
            autoComplete="email"
            placeholder="Email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="h-11 rounded-xl border border-ink-200 bg-paper px-4 text-sm text-ink-900 outline-none focus:border-accent-500"
          />
          <input
            type="password"
            required
            autoComplete="current-password"
            placeholder="Пароль"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="h-11 rounded-xl border border-ink-200 bg-paper px-4 text-sm text-ink-900 outline-none focus:border-accent-500"
          />
        </div>

        {error && <p className="mt-3 text-sm text-accent-600">{error}</p>}

        <button
          type="submit"
          disabled={isSubmitting}
          className="mt-5 flex h-11 w-full items-center justify-center rounded-full bg-accent-500 text-sm font-semibold text-white transition-colors hover:bg-accent-600 disabled:cursor-not-allowed disabled:opacity-70"
        >
          {isSubmitting ? "Вхід…" : "Увійти"}
        </button>
      </form>
    </div>
  );
}
