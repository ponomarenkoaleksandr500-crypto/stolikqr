-- AlterEnum
BEGIN;
CREATE TYPE "OrderStatus_new" AS ENUM ('NEW', 'ACCEPTED', 'PREPARING', 'READY', 'SERVED');
ALTER TABLE "public"."Order" ALTER COLUMN "status" DROP DEFAULT;
ALTER TABLE "public"."OrderItem" ALTER COLUMN "status" DROP DEFAULT;
ALTER TABLE "Order" ALTER COLUMN "status" TYPE "OrderStatus_new" USING ("status"::text::"OrderStatus_new");
ALTER TABLE "OrderItem" ALTER COLUMN "status" TYPE "OrderStatus_new" USING ("status"::text::"OrderStatus_new");
ALTER TYPE "OrderStatus" RENAME TO "OrderStatus_old";
ALTER TYPE "OrderStatus_new" RENAME TO "OrderStatus";
DROP TYPE "public"."OrderStatus_old";
ALTER TABLE "Order" ALTER COLUMN "status" SET DEFAULT 'NEW';
ALTER TABLE "OrderItem" ALTER COLUMN "status" SET DEFAULT 'NEW';
COMMIT;

-- AlterTable
ALTER TABLE "Order" ALTER COLUMN "status" SET DEFAULT 'NEW';

-- AlterTable
ALTER TABLE "OrderItem" DROP COLUMN "batchIndex",
DROP COLUMN "completedAt",
DROP COLUMN "excludedIngredientIds",
DROP COLUMN "readyAt",
DROP COLUMN "selectedModifiers",
DROP COLUMN "startedAt",
DROP COLUMN "unitPriceSnapshot",
ADD COLUMN     "basePriceSnapshot" DECIMAL(10,2) NOT NULL,
ADD COLUMN     "dishSlug" TEXT NOT NULL,
ADD COLUMN     "emojiSnapshot" TEXT,
ADD COLUMN     "excludedIngredientsSnapshot" JSONB,
ADD COLUMN     "excludedSummarySnapshot" JSONB,
ADD COLUMN     "gradientSnapshot" TEXT,
ADD COLUMN     "modifiersSnapshot" JSONB,
ADD COLUMN     "selectionsSummarySnapshot" JSONB,
ALTER COLUMN "status" SET DEFAULT 'NEW';

