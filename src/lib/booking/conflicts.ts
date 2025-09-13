// src/lib/booking/conflicts.ts
import { prisma } from "@/lib/prisma";

export const DEFAULT_DURATION_HOURS: number = 2;

function addHours(date: Date, hours: number) {
  const d = new Date(date);
  d.setHours(d.getHours() + hours);
  return d;
}

export async function hasArtistConflict(params: {
  artistId: string;
  start: Date;
  hours?: number | null;
  excludeBookingId?: string;
}): Promise<boolean> {
  const start = params.start;
  const duration = params.hours && params.hours > 0 ? params.hours : DEFAULT_DURATION_HOURS;
  const end = addHours(start, duration);

  // Day window to keep queries small
  const dayStart = new Date(start); dayStart.setHours(0, 0, 0, 0);
  const dayEnd = new Date(start);   dayEnd.setHours(23, 59, 59, 999);

  // 1) Existing ACCEPTED bookings
  const bookings = await prisma.booking.findMany({
    where: {
      artistId: params.artistId,
      status: "ACCEPTED",
      eventDate: { gte: dayStart, lte: dayEnd },
      ...(params.excludeBookingId ? { NOT: { id: params.excludeBookingId } } : {}),
    },
    select: { eventDate: true, hours: true },
  });

  // 2) Artist blackout windows (unavailability)
  const blocks = await prisma.artistUnavailability.findMany({
    where: {
      artistId: params.artistId,
      // overlapping with [start, end)
      // We fetch same-day-ish windows for cheapness; it’s a superset
      OR: [
        { start: { gte: dayStart, lte: dayEnd } },
        { end:   { gte: dayStart, lte: dayEnd } },
        { AND: [{ start: { lt: dayStart } }, { end: { gt: dayEnd } }] },
      ],
    },
    select: { start: true, end: true },
  });

  // overlap: (A.start < B.end) && (A.end > B.start)
  for (const b of bookings) {
    const bStart = new Date(b.eventDate);
    const bEnd = addHours(bStart, b.hours && b.hours > 0 ? b.hours : DEFAULT_DURATION_HOURS);
    if (start < bEnd && end > bStart) return true;
  }
  for (const blk of blocks) {
    const uStart = new Date(blk.start);
    const uEnd = new Date(blk.end);
    if (start < uEnd && end > uStart) return true;
  }
  return false;
}