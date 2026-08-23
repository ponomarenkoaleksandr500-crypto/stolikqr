import { notFound } from "next/navigation";
import { categories } from "@/data/categories";
import { dishes } from "@/data/dishes";
import { CategoryPage } from "@/components/menu/CategoryPage";

export default async function RestaurantCategoryPage({
  params,
}: {
  params: Promise<{ slug: string; categorySlug: string }>;
}) {
  const { categorySlug } = await params;

  const category = categories.find((c) => c.slug === categorySlug);
  if (!category) {
    notFound();
  }

  const categoryDishes = dishes.filter((dish) => dish.categoryId === category.id);

  return <CategoryPage category={category} dishes={categoryDishes} />;
}
