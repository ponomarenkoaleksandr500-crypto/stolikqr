"use client";

import { unlockWaiterAlert } from "@/lib/waiterAlert";
import { useEffect, useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { fetchMenuByRestaurantSlug, staffLogin } from "@/lib/api";
import { storeStaffSession } from "@/lib/staffAuth";

// Demo Platform v1 is single-tenant - see stolikqr/src/app/page.tsx for the
// same constant used on the Guest App side.
const DEMO_RESTAURANT_SLUG = "demo-restaurant";

export default function WaiterLoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [restaurantName, setRestaurantName] = useState<string | null>(null);

  useEffect(() => {
    void fetchMenuByRestaurantSlug(DEMO_RESTAURANT_SLUG).then(
      (menu) => setRestaurantName(menu.restaurant.name.uk),
      (err: unknown) => console.error("Failed to load restaurant name", err),
    );
  }, []);

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    // Authorise the call alert here: this submit is a real user gesture, it
    // is the one tap every waiter makes, and Next.js keeps the same JS
    // context across the client-side navigation to /waiter - so the audio
    // element unlocked here is still unlocked on the floor plan.
    unlockWaiterAlert();
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
    <div className="flex min-h-dvh items-center justify-center bg-paper px-4">
      <form
        onSubmit={handleSubmit}
        className="w-full max-w-sm rounded-lg border border-ink-100 bg-surface p-6 shadow-sm"
      >
        <h1 className="font-display text-xl font-semibold text-ink-900">Вхід для персоналу</h1>
        <p className="mt-1 text-sm text-ink-500">{restaurantName ?? "…"}</p>

        <div className="mt-5 flex flex-col gap-3">
          <input
            type="email"
            required
            autoComplete="email"
            placeholder="Email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="h-11 rounded-md border border-ink-400 bg-paper px-4 text-sm text-ink-900 placeholder:text-ink-500 outline-none focus:border-accent-500"
          />
          <input
            type="password"
            required
            autoComplete="current-password"
            placeholder="Пароль"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="h-11 rounded-md border border-ink-400 bg-paper px-4 text-sm text-ink-900 placeholder:text-ink-500 outline-none focus:border-accent-500"
          />
        </div>

        {error && <p className="mt-3 text-sm text-accent-600">{error}</p>}

        <button
          type="submit"
          disabled={isSubmitting}
          className="mt-5 flex h-11 w-full items-center justify-center rounded-full bg-accent-600 text-sm font-semibold text-on-accent transition-colors hover:bg-accent-700 disabled:cursor-not-allowed disabled:opacity-70"
        >
          {isSubmitting ? "Вхід…" : "Увійти"}
        </button>
      </form>
    </div>
  );
}
