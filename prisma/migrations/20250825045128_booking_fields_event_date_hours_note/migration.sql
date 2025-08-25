/*
  Warnings:

  - You are about to drop the column `date` on the `Booking` table. All the data in the column will be lost.
  - You are about to drop the column `offer` on the `Booking` table. All the data in the column will be lost.
  - Added the required column `eventDate` to the `Booking` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "public"."Booking" DROP COLUMN "date",
DROP COLUMN "offer",
ADD COLUMN     "eventDate" TIMESTAMP(3) NOT NULL,
ADD COLUMN     "hours" INTEGER,
ADD COLUMN     "note" TEXT;

-- CreateIndex
CREATE INDEX "Booking_artistId_createdAt_idx" ON "public"."Booking"("artistId", "createdAt");

-- CreateIndex
CREATE INDEX "Booking_venueId_createdAt_idx" ON "public"."Booking"("venueId", "createdAt");

-- CreateIndex
CREATE INDEX "Booking_status_createdAt_idx" ON "public"."Booking"("status", "createdAt");
