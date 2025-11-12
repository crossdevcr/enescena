-- CreateEnum
CREATE TYPE "public"."NotificationType" AS ENUM ('EVENT_VENUE_APPROVAL_REQUEST', 'EVENT_VENUE_APPROVED', 'EVENT_VENUE_DECLINED', 'PERFORMANCE_APPLICATION', 'PERFORMANCE_ACCEPTED', 'PERFORMANCE_DECLINED', 'PERFORMANCE_CANCELLED', 'EVENT_STATUS_CHANGE');

-- AlterEnum
ALTER TYPE "public"."EventStatus" ADD VALUE 'PENDING_VENUE_APPROVAL';

-- CreateTable
CREATE TABLE "public"."Notification" (
    "id" TEXT NOT NULL,
    "type" "public"."NotificationType" NOT NULL,
    "userId" TEXT NOT NULL,
    "eventId" TEXT,
    "performanceId" TEXT,
    "title" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "actionUrl" TEXT,
    "isRead" BOOLEAN NOT NULL DEFAULT false,
    "readAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Notification_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Notification_userId_isRead_idx" ON "public"."Notification"("userId", "isRead");

-- CreateIndex
CREATE INDEX "Notification_type_createdAt_idx" ON "public"."Notification"("type", "createdAt");

-- AddForeignKey
ALTER TABLE "public"."Notification" ADD CONSTRAINT "Notification_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Notification" ADD CONSTRAINT "Notification_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "public"."Event"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Notification" ADD CONSTRAINT "Notification_performanceId_fkey" FOREIGN KEY ("performanceId") REFERENCES "public"."Performance"("id") ON DELETE CASCADE ON UPDATE CASCADE;
