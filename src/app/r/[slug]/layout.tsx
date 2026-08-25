import { notFound } from "next/navigation";
import { ApiNotFoundError, fetchMenuByRestaurantSlug } from "@/lib/api";
import { RestaurantShell } from "@/components/menu/RestaurantShell";

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
