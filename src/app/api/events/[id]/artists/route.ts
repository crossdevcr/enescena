import { NextResponse } from "next/server";
import { verifyIdToken } from "@/lib/auth/cognito";
import { prisma } from "@/lib/prisma";
import { cookies } from "next/headers";

/**
 * POST /api/events/[id]/artists
 * Add an artist to an event
 */
export async function POST(req: Request, { params }: { params: { id: string } }) {
  const { id: eventId } = await params;

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

  const event = await prisma.event.findUnique({
    where: { id: eventId },
    select: { id: true, venueId: true, status: true }
  });

  if (!event) {
    return NextResponse.json({ error: "event_not_found" }, { status: 404 });
  }

  if (event.venueId !== user.venue.id) {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }

  const body = await req.json().catch(() => ({}));
  const { artistId, fee, hours, notes } = body;

  if (!artistId) {
    return NextResponse.json({ 
      error: "validation_error",
      message: "Artist ID is required" 
    }, { status: 400 });
  }

  // Verify artist exists
  const artist = await prisma.artist.findUnique({
    where: { id: artistId },
    select: { id: true, name: true }
  });

  if (!artist) {
    return NextResponse.json({ error: "artist_not_found" }, { status: 404 });
  }

  // Check if artist is already added to this event
  const existingEventArtist = await prisma.eventArtist.findUnique({
    where: {
      eventId_artistId: {
        eventId: eventId,
        artistId: artistId
      }
    }
  });

  if (existingEventArtist) {
    return NextResponse.json({ 
      error: "validation_error",
      message: "Artist is already added to this event" 
    }, { status: 400 });
  }

  const eventArtist = await prisma.eventArtist.create({
    data: {
      eventId: eventId,
      artistId: artistId,
      fee: fee && !isNaN(Number(fee)) ? Number(fee) : null,
      hours: hours && !isNaN(Number(hours)) ? Number(hours) : null,
      notes: notes ? String(notes) : null,
      confirmed: false, // Artists need to confirm their participation
    },
    include: {
      artist: { select: { id: true, name: true, slug: true } }
    }
  });

  return NextResponse.json({ eventArtist });
}

/**
 * GET /api/events/[id]/artists
 * Get artists for an event
 */
export async function GET(_req: Request, { params }: { params: { id: string } }) {
  const { id: eventId } = await params;

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

  const event = await prisma.event.findUnique({
    where: { id: eventId },
    select: { id: true, venueId: true }
  });

  if (!event) {
    return NextResponse.json({ error: "event_not_found" }, { status: 404 });
  }

  // Access control: venue owner or event artists can see the list
  const isVenueOwner = user.venue && event.venueId === user.venue.id;
  const isEventArtist = user.artist && await prisma.eventArtist.findUnique({
    where: {
      eventId_artistId: {
        eventId: eventId,
        artistId: user.artist.id
      }
    }
  });

  if (!isVenueOwner && !isEventArtist && user.role !== "ADMIN") {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }

  const eventArtists = await prisma.eventArtist.findMany({
    where: { eventId },
    include: {
      artist: { select: { id: true, name: true, slug: true } }
    },
    orderBy: { createdAt: "asc" }
  });

  return NextResponse.json({ eventArtists });
}