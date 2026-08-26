"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const NAV_ITEMS: { href: string; label: string }[] = [
  { href: "/admin/menu", label: "Меню" },
  { href: "/admin/theme", label: "Тема" },
  { href: "/admin/analytics", label: "Аналітика" },
];

/** Shared by every /admin/* page - mirrors the per-page header pattern already used by the Waiter App. */
export function AdminHeader({
  restaurantName,
  staffName,
  onLogout,
}: {
  restaurantName: string | null;
  staffName: string;
  onLogout: () => void;
}) {
  const pathname = usePathname();

  return (
    <header className="sticky top-0 z-10 flex flex-col gap-3 border-b border-ink-100 bg-surface px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
      <div>
        <p className="font-display text-lg font-semibold text-ink-900">{restaurantName ?? "…"}</p>
        <p className="text-xs text-ink-500">{staffName} · Адмін</p>
      </div>
      <div className="flex flex-wrap items-center gap-2">
        {NAV_ITEMS.map((item) => {
          const active = pathname?.startsWith(item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex h-11 items-center rounded-full border px-4 text-xs font-semibold transition-colors ${
                active
                  ? "border-ink-950 bg-ink-950 text-paper"
                  : "border-ink-200 text-ink-600 hover:bg-ink-50"
              }`}
            >
              {item.label}
            </Link>
          );
        })}
        <button
          type="button"
          onClick={onLogout}
          className="flex h-11 items-center rounded-full border border-ink-200 px-4 text-xs font-semibold text-ink-600 transition-colors hover:bg-ink-50"
        >
          Вийти
        </button>
      </div>
    </header>
  );
}
