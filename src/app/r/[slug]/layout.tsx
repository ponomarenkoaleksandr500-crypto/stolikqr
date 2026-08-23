import { notFound } from "next/navigation";
import { restaurant } from "@/data/restaurant";
import { categories } from "@/data/categories";
import { dishes } from "@/data/dishes";
import { RestaurantShell } from "@/components/menu/RestaurantShell";

export default async function RestaurantLayout({
  params,
  children,
}: {
  params: Promise<{ slug: string }>;
  children: React.ReactNode;
}) {
  const { slug } = await params;

  if (slug !== restaurant.slug) {
    notFound();
  }

  return (
    <RestaurantShell restaurant={restaurant} categories={categories} dishes={dishes}>
      {children}
    </RestaurantShell>
  );
}
