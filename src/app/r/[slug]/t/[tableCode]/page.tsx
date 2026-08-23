import { notFound } from "next/navigation";
import { restaurant } from "@/data/restaurant";
import { categories } from "@/data/categories";
import { dishes } from "@/data/dishes";
import { TableSessionBootstrap } from "@/components/table/TableSessionBootstrap";
import { DigitalTableHome } from "@/components/table/DigitalTableHome";

export default async function DigitalTablePage({
  params,
}: {
  params: Promise<{ slug: string; tableCode: string }>;
}) {
  const { slug, tableCode } = await params;

  if (slug !== restaurant.slug) {
    notFound();
  }

  return (
    <>
      <TableSessionBootstrap restaurantSlug={slug} tableCode={tableCode} />
      <DigitalTableHome
        restaurant={restaurant}
        tableCode={tableCode}
        dishes={dishes}
        firstCategorySlug={categories[0].slug}
      />
    </>
  );
}
