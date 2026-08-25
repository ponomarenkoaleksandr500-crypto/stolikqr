-- AlterTable
ALTER TABLE "WaiterCall" ADD COLUMN     "guestSessionId" TEXT,
ADD COLUMN     "inProgressAt" TIMESTAMP(3);

-- AddForeignKey
ALTER TABLE "WaiterCall" ADD CONSTRAINT "WaiterCall_guestSessionId_fkey" FOREIGN KEY ("guestSessionId") REFERENCES "GuestSession"("id") ON DELETE SET NULL ON UPDATE CASCADE;

