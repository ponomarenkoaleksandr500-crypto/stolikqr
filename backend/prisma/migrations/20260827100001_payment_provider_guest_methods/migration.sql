-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "PaymentProvider" ADD VALUE 'CARD';
ALTER TYPE "PaymentProvider" ADD VALUE 'APPLE_PAY';
ALTER TYPE "PaymentProvider" ADD VALUE 'GOOGLE_PAY';
ALTER TYPE "PaymentProvider" ADD VALUE 'EXPIRENZA';
