
-- DropIndex
DROP INDEX "GuestSession_tableId_idx";

-- AlterTable
ALTER TABLE "Dish" ADD COLUMN     "tags" JSONB;

-- AlterTable
ALTER TABLE "GuestSession" ADD COLUMN     "deviceToken" TEXT NOT NULL;

-- AlterTable
ALTER TABLE "ModifierChoice" ADD COLUMN     "exclusive" BOOLEAN NOT NULL DEFAULT false;

-- AlterTable
ALTER TABLE "ModifierGroup" DROP COLUMN "exclusive";

-- CreateIndex
CREATE INDEX "GuestSession_tableId_deviceToken_idx" ON "GuestSession"("tableId", "deviceToken");

