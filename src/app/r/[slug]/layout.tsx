import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { ApiNotFoundError, fetchMenuByRestaurantSlug } from "@/lib/api";
import { RestaurantShell } from "@/components/menu/RestaurantShell";

// A guest who just scanned a table's QR code should see that restaurant's
// own name in the browser tab - not the generic platform title from the
// root layout, which would read as "this is a demo of a platform" rather
// than "this is this restaurant's own app".
export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  try {
    const menu = await fetchMenuByRestaurantSlug(slug);
    return { title: menu.restaurant.name.uk };
  } catch {
    return {};
  }
}

export default async function RestaurantLayout({
  params,
  children,
}: {
  params: Promise<{ slug: string }>;
  children: React.ReactNode;
}) {
  const { slug } = await params;

  let menu;
  try {
    menu = await fetchMenuByRestaurantSlug(slug);
  } catch (error) {
    if (error instanceof ApiNotFoundError) notFound();
    throw error;
  }

  return (
    <RestaurantShell restaurant={menu.restaurant} categories={menu.categories} dishes={menu.dishes}>
      {children}
    </RestaurantShell>
  );
}
