import { NextResponse } from "next/server";
import { verifyIdToken } from "@/lib/auth/cognito";
import { prisma } from "@/lib/prisma";
import { cookies } from "next/headers";
import { revalidatePath } from "next/cache";
import { sendEmail } from "@/lib/email/mailer";
import { bookingCancelledForArtist } from "@/lib/email/templates";

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

  // Get related bookings with details for cancellation
  const relatedBookings = await prisma.booking.findMany({
    where: {
      eventId: eventId,
      artistId: artistId,
      status: { in: ["PENDING", "ACCEPTED"] } // Only cancel active bookings
    },
    include: {
      artist: { 
        select: { 
          name: true,
          user: { select: { email: true } }
        } 
      },
      venue: { select: { name: true } }
    }
  });

  // Cancel related bookings if any
  if (relatedBookings.length > 0) {
    await prisma.booking.updateMany({
      where: {
        eventId: eventId,
        artistId: artistId,
        status: { in: ["PENDING", "ACCEPTED"] }
      },
      data: {
        status: "CANCELLED"
      }
    });

    console.log(`Cancelled ${relatedBookings.length} bookings for artist ${artistId} removed from event ${eventId}`);

    // Send cancellation emails to the artist (async, don't block)
    (async () => {
      for (const booking of relatedBookings) {
        try {
          const artistEmail = booking.artist?.user?.email;
          if (artistEmail) {
            const tmpl = bookingCancelledForArtist({
              artistName: booking.artist?.name || "there",
              venueName: booking.venue?.name || "the venue",
              bookingId: booking.id,
            });
            const res = await sendEmail({ to: artistEmail, ...tmpl });
            if (!res.ok) {
              console.error(`[email] Failed to send cancellation email to ${artistEmail} for booking ${booking.id}`);
            }
          }
        } catch (error) {
          console.error(`[email] Error sending cancellation email for booking ${booking.id}:`, error);
        }
      }
    })();
  }

  // Remove the artist from the event
  await prisma.eventArtist.delete({
    where: {
      eventId_artistId: {
        eventId: eventId,
        artistId: artistId
      }
    }
  });

  // Revalidate relevant pages to update the UI
  try {
    revalidatePath(`/dashboard/venue/events/${eventId}`);
    revalidatePath(`/dashboard/venue/events`);
    revalidatePath(`/dashboard/venue/bookings`);
    revalidatePath(`/dashboard/artist/gigs`);
  } catch (error) {
    console.error("Failed to revalidate pages after removing artist:", error);
  }

  return NextResponse.json({ ok: true, cancelledBookings: relatedBookings.length });
}