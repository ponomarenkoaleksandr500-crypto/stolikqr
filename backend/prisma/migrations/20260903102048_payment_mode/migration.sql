-- CreateEnum
CREATE TYPE "PaymentMode" AS ENUM ('DEMO', 'LIVE');

-- AlterTable
ALTER TABLE "Payment" ADD COLUMN     "mode" "PaymentMode" NOT NULL DEFAULT 'DEMO';
