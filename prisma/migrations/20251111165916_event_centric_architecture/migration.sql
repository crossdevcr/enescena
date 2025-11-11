/*
  Warnings:

  - You are about to drop the column `budget` on the `Event` table. All the data in the column will be lost.
  - You are about to drop the column `hours` on the `Event` table. All the data in the column will be lost.
  - You are about to drop the `Booking` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `EventArtist` table. If the table is not empty, all the data it contains will be lost.
  - Added the required column `createdBy` to the `Event` table without a default value. This is not possible if the table is not empty.

*/
-- CreateEnum
CREATE TYPE "public"."PerformanceStatus" AS ENUM ('PENDING', 'CONFIRMED', 'DECLINED', 'CANCELLED', 'COMPLETED');

-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "public"."EventStatus" ADD VALUE 'SEEKING_VENUE';
ALTER TYPE "public"."EventStatus" ADD VALUE 'SEEKING_ARTISTS';
ALTER TYPE "public"."EventStatus" ADD VALUE 'PENDING';
ALTER TYPE "public"."EventStatus" ADD VALUE 'CONFIRMED';

-- DropForeignKey
ALTER TABLE "public"."Booking" DROP CONSTRAINT "Booking_artistId_fkey";

-- DropForeignKey
ALTER TABLE "public"."Booking" DROP CONSTRAINT "Booking_eventId_fkey";

-- DropForeignKey
ALTER TABLE "public"."Booking" DROP CONSTRAINT "Booking_venueId_fkey";

-- DropForeignKey
ALTER TABLE "public"."Event" DROP CONSTRAINT "Event_venueId_fkey";

-- DropForeignKey
ALTER TABLE "public"."EventArtist" DROP CONSTRAINT "EventArtist_artistId_fkey";

-- DropForeignKey
ALTER TABLE "public"."EventArtist" DROP CONSTRAINT "EventArtist_eventId_fkey";

-- AlterTable
ALTER TABLE "public"."Event" DROP COLUMN "budget",
DROP COLUMN "hours",
ADD COLUMN     "createdBy" TEXT NOT NULL,
ADD COLUMN     "externalVenueAddress" TEXT,
ADD COLUMN     "externalVenueCity" TEXT,
ADD COLUMN     "externalVenueContact" TEXT,
ADD COLUMN     "externalVenueName" TEXT,
ADD COLUMN     "isPublic" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "totalBudget" INTEGER,
ADD COLUMN     "totalHours" INTEGER,
ALTER COLUMN "venueId" DROP NOT NULL;

-- DropTable
DROP TABLE "public"."Booking";

-- DropTable
DROP TABLE "public"."EventArtist";

-- DropEnum
DROP TYPE "public"."BookingStatus";

-- CreateTable
CREATE TABLE "public"."Performance" (
    "id" TEXT NOT NULL,
    "eventId" TEXT NOT NULL,
    "artistId" TEXT NOT NULL,
    "agreedFee" INTEGER,
    "proposedFee" INTEGER,
    "hours" INTEGER,
    "startTime" TIMESTAMP(3),
    "endTime" TIMESTAMP(3),
    "status" "public"."PerformanceStatus" NOT NULL DEFAULT 'PENDING',
    "notes" TEXT,
    "artistNotes" TEXT,
    "venueNotes" TEXT,
    "equipmentProvided" TEXT,
    "soundcheckTime" TIMESTAMP(3),
    "paymentTerms" TEXT,
    "cancellationTerms" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Performance_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Performance_eventId_idx" ON "public"."Performance"("eventId");

-- CreateIndex
CREATE INDEX "Performance_artistId_idx" ON "public"."Performance"("artistId");

-- CreateIndex
CREATE INDEX "Performance_status_createdAt_idx" ON "public"."Performance"("status", "createdAt");

-- CreateIndex
CREATE INDEX "Performance_artistId_status_idx" ON "public"."Performance"("artistId", "status");

-- CreateIndex
CREATE UNIQUE INDEX "Performance_eventId_artistId_key" ON "public"."Performance"("eventId", "artistId");

-- CreateIndex
CREATE INDEX "Event_createdBy_eventDate_idx" ON "public"."Event"("createdBy", "eventDate");

-- CreateIndex
CREATE INDEX "Event_eventDate_isPublic_idx" ON "public"."Event"("eventDate", "isPublic");

-- AddForeignKey
ALTER TABLE "public"."Event" ADD CONSTRAINT "Event_createdBy_fkey" FOREIGN KEY ("createdBy") REFERENCES "public"."User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Event" ADD CONSTRAINT "Event_venueId_fkey" FOREIGN KEY ("venueId") REFERENCES "public"."Venue"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Performance" ADD CONSTRAINT "Performance_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "public"."Event"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Performance" ADD CONSTRAINT "Performance_artistId_fkey" FOREIGN KEY ("artistId") REFERENCES "public"."Artist"("id") ON DELETE CASCADE ON UPDATE CASCADE;
