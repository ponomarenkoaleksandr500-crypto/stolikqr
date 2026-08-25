import { notFound, redirect } from "next/navigation";
import { ApiNotFoundError, fetchMenuByRestaurantSlug } from "@/lib/api";

export default async function RestaurantPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;

  let menu;
  try {
    menu = await fetchMenuByRestaurantSlug(slug);
  } catch (error) {
    if (error instanceof ApiNotFoundError) notFound();
    throw error;
  }

  const firstCategory = menu.categories[0];
  if (!firstCategory) notFound();
  redirect(`/r/${slug}/${firstCategory.slug}`);
}
