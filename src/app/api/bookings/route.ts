import { NextResponse } from "next/server";
import { verifyIdToken } from "@/lib/auth/cognito";
import { prisma } from "@/lib/prisma";
import { cookies } from "next/headers";
import { hasArtistConflict } from "@/lib/booking/conflicts";
import { sendEmail } from "@/lib/email/mailer";
import { bookingCreatedForArtist } from "@/lib/email/templates";

export async function POST(req: Request) {
  // Identify current user from cookies
  const jar = await cookies(); // (keep async in your project)
  const idToken = jar.get("id_token")?.value;
  if (!idToken) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const payload = await verifyIdToken(idToken).catch(() => null);
  const email = payload?.email ? String(payload.email) : null;
  if (!email) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const user = await prisma.user.findUnique({
    where: { email },
    include: { venue: true },
  });
  if (!user || user.role !== "VENUE") {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }

  // Friendly redirect if venue profile is missing
  if (!user.venue) {
    const to = new URL("/dashboard/venue/profile", req.url);
    to.searchParams.set("reason", "required");
    return NextResponse.redirect(to, 302);
  }

  // Parse body
  const body = await req.json().catch(() => ({}));
  const artistId = (body.artistId ?? "").toString();
  const eventDateStr = (body.eventDate ?? "").toString();
  const hoursNum = body.hours != null ? Number(body.hours) : null;
  const note = (body.note ?? "").toString().trim() || null;

  if (!artistId) {
    return NextResponse.json({ error: "artistId_required" }, { status: 400 });
  }
  const artist = await prisma.artist.findUnique({ where: { id: artistId } });
  if (!artist) {
    return NextResponse.json({ error: "artist_not_found" }, { status: 404 });
  }

  let eventDate: Date | null = null;
  if (eventDateStr) {
    const d = new Date(eventDateStr);
    if (!Number.isNaN(d.getTime())) eventDate = d;
  }
  if (!eventDate) {
    return NextResponse.json({ error: "invalid_eventDate" }, { status: 400 });
  }

  const hours =
    hoursNum != null && !Number.isNaN(hoursNum) && hoursNum > 0 ? hoursNum : null;

  // 🔒 Availability check against existing ACCEPTED bookings
  const conflict = await hasArtistConflict({
    artistId: artist.id,
    start: eventDate,
    hours,
  });

  if (conflict) {
    return NextResponse.json(
      {
        error: "artist_unavailable",
        message: "The artist is not available at that time. Please pick another time.",
      },
      { status: 409 }
    );
  }

  // Create booking
  const booking = await prisma.booking.create({
    data: {
      artistId: artist.id,
      venueId: user.venue.id,
      eventDate,
      hours,
      note,
      status: "PENDING",
    },
    include: {
      artist: {
        select: {
          name: true,
          slug: true,
          user: { select: { email: true, name: true } },
        },
      },
      venue: { select: { name: true } },
    },
  });

  (async () => {
    try {
      const to = booking.artist?.user?.email;
      if (to) {
        const tmpl = bookingCreatedForArtist({
          artistName: booking.artist.user?.name || booking.artist.name || "there",
          venueName: booking.venue?.name || "a venue",
          eventISO: booking.eventDate.toISOString(),
          hours: booking.hours ?? undefined,
          bookingId: booking.id,
        });
        await sendEmail({ to, ...tmpl });
      }
    } catch (e) {
      console.error("[email] bookingCreatedForArtist failed", e);
    }
  })();

  return NextResponse.json({ ok: true, booking });
}