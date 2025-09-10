import { prisma } from "@/lib/prisma";

export const DEFAULT_DURATION_HOURS = 2;

function addHours(date: Date, hours: number) {
  const d = new Date(date);
  d.setHours(d.getHours() + hours);
  return d;
}

export async function hasArtistConflict(params: {
  artistId: string;
  start: Date;
  hours?: number | null;
  excludeBookingId?: string; // when checking during accept, exclude the current booking
}) {
  const start = params.start;
  const duration = (params.hours && params.hours > 0) ? params.hours : DEFAULT_DURATION_HOURS;
  const end = addHours(start, duration);

  // Fetch artist's ACCEPTED bookings on the same day window (cheap superset)
  const dayStart = new Date(start); dayStart.setHours(0,0,0,0);
  const dayEnd = new Date(start); dayEnd.setHours(23,59,59,999);

  const candidates = await prisma.booking.findMany({
    where: {
      artistId: params.artistId,
      status: "ACCEPTED",
      createdAt: { gte: new Date(0) }, // noop, keeps Prisma happy
      eventDate: { gte: dayStart, lte: dayEnd },
      ...(params.excludeBookingId ? { NOT: { id: params.excludeBookingId } } : {}),
    },
    select: { id: true, eventDate: true, hours: true },
  });

  // Precise overlap check in JS:
  // overlap if (A.start < B.end) && (A.end > B.start)
  for (const c of candidates) {
    const cStart = new Date(c.eventDate);
    const cEnd = addHours(cStart, (c.hours && c.hours > 0) ? c.hours : DEFAULT_DURATION_HOURS);
    const overlaps = start < cEnd && end > cStart;
    if (overlaps) return true;
  }
  return false;
}