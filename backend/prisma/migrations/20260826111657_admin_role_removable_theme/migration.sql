-- CreateEnum
CREATE TYPE "StaffRole" AS ENUM ('WAITER', 'ADMIN');

-- AlterTable
ALTER TABLE "DishIngredient" ADD COLUMN     "removable" BOOLEAN NOT NULL DEFAULT true;

-- AlterTable
ALTER TABLE "Restaurant" ADD COLUMN     "themeKey" TEXT NOT NULL DEFAULT 'classic';

-- AlterTable
ALTER TABLE "StaffUser" ADD COLUMN     "role" "StaffRole" NOT NULL DEFAULT 'WAITER';
