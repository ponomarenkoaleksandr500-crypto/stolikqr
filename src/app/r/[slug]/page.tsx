import { redirect } from "next/navigation";
import { categories } from "@/data/categories";

export default async function RestaurantPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  redirect(`/r/${slug}/${categories[0].slug}`);
}
