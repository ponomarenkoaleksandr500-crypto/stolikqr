import { notFound } from "next/navigation";
import { ApiNotFoundError, fetchMenuByRestaurantSlug } from "@/lib/api";
import { CategoryPage } from "@/components/menu/CategoryPage";

export default async function RestaurantCategoryPage({
  params,
}: {
  params: Promise<{ slug: string; categorySlug: string }>;
}) {
  const { slug, categorySlug } = await params;

  let menu;
  try {
    menu = await fetchMenuByRestaurantSlug(slug);
  } catch (error) {
    if (error instanceof ApiNotFoundError) notFound();
    throw error;
  }

  const category = menu.categories.find((c) => c.slug === categorySlug);
  if (!category) {
    notFound();
  }

  const categoryDishes = menu.dishes.filter((dish) => dish.categoryId === category.id);

  return <CategoryPage category={category} dishes={categoryDishes} />;
}
