import { notFound } from "next/navigation";
import { ApiNotFoundError, fetchMenuByQrToken, resolveTableByCode } from "@/lib/api";
import { TableSessionBootstrap } from "@/components/table/TableSessionBootstrap";
import { DigitalTableHome } from "@/components/table/DigitalTableHome";

export default async function DigitalTablePage({
  params,
}: {
  params: Promise<{ slug: string; tableCode: string }>;
}) {
  const { slug, tableCode } = await params;

  let qrToken: string;
  try {
    // The only place slug+tableCode (today's URL) are used - everything
    // after this is resolved through the qrToken alone.
    ({ qrToken } = await resolveTableByCode(slug, tableCode));
  } catch (error) {
    if (error instanceof ApiNotFoundError) notFound();
    throw error;
  }

  const menu = await fetchMenuByQrToken(qrToken);

  return (
    <>
      <TableSessionBootstrap restaurantSlug={slug} tableCode={tableCode} qrToken={qrToken} />
      <DigitalTableHome
        restaurant={menu.restaurant}
        tableCode={tableCode}
        dishes={menu.dishes}
        firstCategorySlug={menu.categories[0]?.slug ?? ""}
      />
    </>
  );
}
