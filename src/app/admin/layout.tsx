"use client";

import { useEffect, useState } from "react";
import { fetchMenuByRestaurantSlug } from "@/lib/api";

// Demo Platform v1 is single-tenant - see stolikqr/src/app/page.tsx for the
// same constant used on the Guest App side.
const DEMO_RESTAURANT_SLUG = "demo-restaurant";

/**
 * Applies the restaurant's site-wide color theme (see src/lib/themes.ts,
 * src/app/globals.css's [data-theme="..."] blocks) across every /admin/*
 * page, mirroring the Guest App's RestaurantShell. No auth needed - the
 * restaurant's theme is public the same way its menu is.
 */
export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const [themeKey, setThemeKey] = useState<string | undefined>(undefined);

  useEffect(() => {
    void fetchMenuByRestaurantSlug(DEMO_RESTAURANT_SLUG).then(
      (menu) => setThemeKey(menu.restaurant.themeKey),
      (err: unknown) => console.error("Failed to load restaurant theme", err),
    );
  }, []);

  return <div data-theme={themeKey}>{children}</div>;
}
