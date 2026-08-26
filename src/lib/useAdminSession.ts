"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { fetchMenuByRestaurantSlug } from "@/lib/api";
import { clearStaffSession, getStaffToken, getStoredStaff, type StoredStaff } from "@/lib/staffAuth";

// Demo Platform v1 is single-tenant - see stolikqr/src/app/page.tsx for the
// same constant used on the Guest App side.
const DEMO_RESTAURANT_SLUG = "demo-restaurant";

/**
 * Shared by every /admin/* page - the same auth-gate/restaurant-name-fetch
 * pattern the Waiter App repeats per-page (see src/app/waiter/page.tsx),
 * factored out here since the Admin App has enough pages that duplicating
 * the role check on each one is a real drift risk.
 */
export function useAdminSession() {
  const router = useRouter();
  const [staff, setStaff] = useState<StoredStaff | null>(null);
  const [restaurantName, setRestaurantName] = useState<string | null>(null);

  const goToLogin = useCallback(() => {
    clearStaffSession();
    router.replace("/admin/login");
  }, [router]);

  useEffect(() => {
    const stored = getStoredStaff();
    const token = getStaffToken();
    if (!stored || !token || stored.role !== "ADMIN") {
      goToLogin();
      return;
    }
    // One-time client-only auth gate, same justification as the Waiter App's
    // identical effect (see src/app/waiter/page.tsx).
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setStaff(stored);
    void fetchMenuByRestaurantSlug(DEMO_RESTAURANT_SLUG).then(
      (menu) => setRestaurantName(menu.restaurant.name.uk),
      (err: unknown) => console.error("Failed to load restaurant name", err),
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps -- runs once on mount, goToLogin is stable via useCallback
  }, []);

  return { staff, restaurantName, logout: goToLogin };
}
