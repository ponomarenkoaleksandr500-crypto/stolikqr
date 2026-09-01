"use client";

import { useEffect, useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { fetchMenuByRestaurantSlug, staffLogin } from "@/lib/api";
import { storeStaffSession } from "@/lib/staffAuth";

// Demo Platform v1 is single-tenant - see stolikqr/src/app/page.tsx for the
// same constant used on the Guest App side.
const DEMO_RESTAURANT_SLUG = "demo-restaurant";

export default function AdminLoginPage() {
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
    setError(null);
    setIsSubmitting(true);
    try {
      const result = await staffLogin(email, password);
      // A WAITER account authenticates fine (same shared login) but has no
      // business in the Admin App - the backend's AdminGuard would refuse
      // every request anyway, so refuse entry here too rather than dropping
      // them into a shell full of 403s.
      if (result.staff.role !== "ADMIN") {
        setError("У вас немає доступу до адмін-панелі");
        return;
      }
      storeStaffSession(result.accessToken, result.staff);
      router.push("/admin");
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
        <h1 className="font-display text-xl font-semibold text-ink-900">Адмін-панель</h1>
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
