import { NextResponse } from "next/server";
import { verifyIdToken } from "@/lib/auth/cognito";
import { prisma } from "@/lib/prisma";
import { cookies } from "next/headers";

/**
 * PATCH /api/events/[id]/artists/[artistId]
 * Update event-artist relationship
 */
export async function PATCH(
  req: Request, 
  { params }: { params: { id: string; artistId: string } }
) {
  const { id: eventId, artistId } = await params;

  const jar = await cookies();
  const idToken = jar.get("id_token")?.value;
  if (!idToken) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const payload = await verifyIdToken(idToken).catch(() => null);
  const email = payload?.email ? String(payload.email) : null;
  if (!email) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const user = await prisma.user.findUnique({
    where: { email },
    include: { venue: true, artist: true },
  });
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const eventArtist = await prisma.eventArtist.findUnique({
    where: {
      eventId_artistId: {
        eventId: eventId,
        artistId: artistId
      }
    },
    include: {
      event: { select: { venueId: true } }
    }
  });

  if (!eventArtist) {
    return NextResponse.json({ error: "not_found" }, { status: 404 });
  }

  // Access control: venue owner or the artist themselves
  const isVenueOwner = user.venue && eventArtist.event.venueId === user.venue.id;
  const isArtistSelf = user.artist && artistId === user.artist.id;

  if (!isVenueOwner && !isArtistSelf && user.role !== "ADMIN") {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }

  const body = await req.json().catch(() => ({}));
  const updateData: any = {};

  // Venue can update fee, hours, notes
  if (isVenueOwner) {
    const { fee, hours, notes } = body;
    if (fee !== undefined) updateData.fee = fee && !isNaN(Number(fee)) ? Number(fee) : null;
    if (hours !== undefined) updateData.hours = hours && !isNaN(Number(hours)) ? Number(hours) : null;
    if (notes !== undefined) updateData.notes = notes ? String(notes) : null;
  }

  // Artist can update confirmation status and notes
  if (isArtistSelf) {
    const { confirmed, notes } = body;
    if (confirmed !== undefined) updateData.confirmed = Boolean(confirmed);
    if (notes !== undefined) updateData.notes = notes ? String(notes) : null;
  }

  const updatedEventArtist = await prisma.eventArtist.update({
    where: {
      eventId_artistId: {
        eventId: eventId,
        artistId: artistId
      }
    },
    data: updateData,
    include: {
      artist: { select: { id: true, name: true, slug: true } }
    }
  });

  return NextResponse.json({ eventArtist: updatedEventArtist });
}

/**
 * DELETE /api/events/[id]/artists/[artistId]
 * Remove artist from event (venue owner only)
 */
export async function DELETE(
  _req: Request, 
  { params }: { params: { id: string; artistId: string } }
) {
  const { id: eventId, artistId } = await params;

  const jar = await cookies();
  const idToken = jar.get("id_token")?.value;
  if (!idToken) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const payload = await verifyIdToken(idToken).catch(() => null);
  const email = payload?.email ? String(payload.email) : null;
  if (!email) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const user = await prisma.user.findUnique({
    where: { email },
    include: { venue: true },
  });
  if (!user || user.role !== "VENUE" || !user.venue) {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }

  const eventArtist = await prisma.eventArtist.findUnique({
    where: {
      eventId_artistId: {
        eventId: eventId,
        artistId: artistId
      }
    },
    include: {
      event: { select: { venueId: true } }
    }
  });

  if (!eventArtist) {
    return NextResponse.json({ error: "not_found" }, { status: 404 });
  }

  if (eventArtist.event.venueId !== user.venue.id) {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }

  // Check if there are related bookings
  const relatedBookings = await prisma.booking.count({
    where: {
      eventId: eventId,
      artistId: artistId
    }
  });

  if (relatedBookings > 0) {
    return NextResponse.json({ 
      error: "validation_error",
      message: "Cannot remove artist with existing bookings for this event" 
    }, { status: 400 });
  }

  await prisma.eventArtist.delete({
    where: {
      eventId_artistId: {
        eventId: eventId,
        artistId: artistId
      }
    }
  });

  return NextResponse.json({ ok: true });
}