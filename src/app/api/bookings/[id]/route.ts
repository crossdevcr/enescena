import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { verifyIdToken } from "@/lib/auth/cognito";
import { cookies } from "next/headers";
import { hasArtistConflict } from "@/lib/booking/conflicts";

type Action = "ACCEPT" | "DECLINE" | "CANCEL";

export async function PATCH(
  req: Request,
  { params }: { params: { id: string } }
) {
  const id = params.id;

  // Auth
  const jar = await cookies();
  const idToken = jar.get("id_token")?.value;
  if (!idToken) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const payload = await verifyIdToken(idToken).catch(() => null);
  const email = payload?.email ? String(payload.email) : null;
  if (!email) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const me = await prisma.user.findUnique({
    where: { email },
    include: { artist: true, venue: true },
  });
  if (!me) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  // Booking (basic fields)
  const booking = await prisma.booking.findUnique({
    where: { id },
    select: { id: true, status: true, artistId: true, venueId: true },
  });
  if (!booking) return NextResponse.json({ error: "not_found" }, { status: 404 });

  // Parse action
  const body = await req.json().catch(() => ({}));
  const action: Action | undefined = body?.action;
  if (!action || !["ACCEPT", "DECLINE", "CANCEL"].includes(action)) {
    return NextResponse.json({ error: "invalid_action" }, { status: 400 });
  }

  // Artist can ACCEPT/DECLINE when PENDING (must own the artistId)
  if (me.role === "ARTIST" && me.artist) {
    if (booking.artistId !== me.artist.id) {
      return NextResponse.json({ error: "forbidden" }, { status: 403 });
    }
    if (booking.status !== "PENDING") {
      return NextResponse.json({ error: "invalid_state" }, { status: 400 });
    }

    if (action === "ACCEPT") {
      // Load full booking time window to check conflicts
      const full = await prisma.booking.findUnique({
        where: { id },
        select: { id: true, eventDate: true, hours: true, artistId: true },
      });
      if (!full) return NextResponse.json({ error: "not_found" }, { status: 404 });

      const conflict = await hasArtistConflict({
        artistId: full.artistId,
        start: full.eventDate,
        hours: full.hours ?? undefined,
        excludeBookingId: full.id, // exclude self while checking
      });

      if (conflict) {
        return NextResponse.json(
          {
            error: "artist_unavailable",
            message: "This time conflicts with another accepted booking.",
          },
          { status: 409 }
        );
      }

      const updated = await prisma.booking.update({
        where: { id },
        data: { status: "ACCEPTED" },
        select: { id: true, status: true },
      });
      return NextResponse.json({ ok: true, booking: updated });
    }

    if (action === "DECLINE") {
      const updated = await prisma.booking.update({
        where: { id },
        data: { status: "DECLINED" },
        select: { id: true, status: true },
      });
      return NextResponse.json({ ok: true, booking: updated });
    }

    return NextResponse.json({ error: "invalid_action_for_role" }, { status: 400 });
  }

  // Venue can CANCEL when PENDING (must own the venueId)
  if (me.role === "VENUE" && me.venue) {
    if (booking.venueId !== me.venue.id) {
      return NextResponse.json({ error: "forbidden" }, { status: 403 });
    }
    if (booking.status !== "PENDING") {
      return NextResponse.json({ error: "invalid_state" }, { status: 400 });
    }
    if (action === "CANCEL") {
      const updated = await prisma.booking.update({
        where: { id },
        data: { status: "CANCELLED" },
        select: { id: true, status: true },
      });
      return NextResponse.json({ ok: true, booking: updated });
    }
    return NextResponse.json({ error: "invalid_action_for_role" }, { status: 400 });
  }

  return NextResponse.json({ error: "forbidden" }, { status: 403 });
}