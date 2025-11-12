/*
  Warnings:

  - The values [EVENT_VENUE_APPROVAL_REQUEST,EVENT_VENUE_APPROVED,EVENT_VENUE_DECLINED,PERFORMANCE_APPLICATION,PERFORMANCE_ACCEPTED,PERFORMANCE_DECLINED] on the enum `NotificationType` will be removed. If these variants are still used in the database, this will fail.

*/
-- AlterEnum
BEGIN;
CREATE TYPE "public"."NotificationType_new" AS ENUM ('EVENT_REQUEST', 'EVENT_REQUEST_APPROVED', 'EVENT_REQUEST_DECLINED', 'PERFORMANCE_INVITATION', 'PERFORMANCE_INVITATION_ACCEPTED', 'PERFORMANCE_INVITATION_DECLINED', 'PERFORMANCE_CANCELLED', 'EVENT_STATUS_CHANGE');
ALTER TABLE "public"."Notification" ALTER COLUMN "type" TYPE "public"."NotificationType_new" USING ("type"::text::"public"."NotificationType_new");
ALTER TYPE "public"."NotificationType" RENAME TO "NotificationType_old";
ALTER TYPE "public"."NotificationType_new" RENAME TO "NotificationType";
DROP TYPE "public"."NotificationType_old";
COMMIT;
