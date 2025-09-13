-- CreateTable
CREATE TABLE "public"."ArtistUnavailability" (
    "id" TEXT NOT NULL,
    "artistId" TEXT NOT NULL,
    "start" TIMESTAMP(3) NOT NULL,
    "end" TIMESTAMP(3) NOT NULL,
    "reason" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ArtistUnavailability_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ArtistUnavailability_artistId_start_end_idx" ON "public"."ArtistUnavailability"("artistId", "start", "end");

-- AddForeignKey
ALTER TABLE "public"."ArtistUnavailability" ADD CONSTRAINT "ArtistUnavailability_artistId_fkey" FOREIGN KEY ("artistId") REFERENCES "public"."Artist"("id") ON DELETE CASCADE ON UPDATE CASCADE;
