"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";
import { RestaurantHeader } from "@/components/restaurant/RestaurantHeader";
import { CategoryNav } from "./CategoryNav";
import { CartBar } from "@/components/cart/CartBar";
import { CartDrawer } from "@/components/cart/CartDrawer";
import { useCart } from "@/cart/CartProvider";
import { useTableSession } from "@/table/TableSessionProvider";
import { TableBottomNav } from "@/components/table/TableBottomNav";
import { WaiterFab } from "@/components/table/WaiterFab";
import { AnalyticsProvider, useAnalytics } from "@/lib/analytics";
import type { Category, Dish, Restaurant } from "@/types/menu";

export function RestaurantShell({
  restaurant,
  categories,
  dishes,
  children,
}: {
  restaurant: Restaurant;
  categories: Category[];
  dishes: Dish[];
  children: React.ReactNode;
}) {
  return (
    <AnalyticsProvider restaurantId={restaurant.id}>
      <RestaurantShellBody restaurant={restaurant} categories={categories} dishes={dishes}>
        {children}
      </RestaurantShellBody>
    </AnalyticsProvider>
  );
}

function RestaurantShellBody({
  restaurant,
  categories,
  dishes,
  children,
}: {
  restaurant: Restaurant;
  categories: Category[];
  dishes: Dish[];
  children: React.ReactNode;
}) {
  const { isOpen, close } = useCart();
  const { isTableMode, session } = useTableSession();
  const pathname = usePathname();
  const { track } = useAnalytics();

  // The Digital Table home route (/r/[slug]/t/[code]) gets its own compact
  // top bar (see DigitalTableHome) instead of the full restaurant hero -
  // RestaurantHeader already did its job when the guest first scanned in.
  const isTableHome = pathname === `/r/${restaurant.slug}/t/${session?.tableCode}`;

  // RestaurantShell is the shared layout for every /r/[slug]/... route (see
  // RestaurantLayout) - it doesn't remount on category navigation, so this
  // fires exactly once per guest landing on the menu, unlike CATEGORY_VIEWED
  // which lives on the page component that DOES remount per category.
  useEffect(() => {
    track("MENU_OPENED");
    // eslint-disable-next-line react-hooks/exhaustive-deps -- fire once on mount only
  }, []);

  return (
    <div data-theme={restaurant.themeKey} className="flex min-h-full flex-col bg-paper">
      {!isTableHome && (
        <>
          <RestaurantHeader restaurant={restaurant} />
          <CategoryNav restaurantSlug={restaurant.slug} categories={categories} />
        </>
      )}
      <main className="flex-1 pb-24">{children}</main>
      {isTableMode && session ? (
        <>
          <WaiterFab />
          <TableBottomNav
            restaurantSlug={restaurant.slug}
            tableCode={session.tableCode}
            firstCategorySlug={categories[0]?.slug ?? ""}
          />
        </>
      ) : (
        <CartBar />
      )}
      {isOpen && <CartDrawer onClose={close} dishes={dishes} />}
    </div>
  );
}
