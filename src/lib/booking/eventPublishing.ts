import { prisma } from "@/lib/prisma";
import { Event, EventArtist, Artist, Booking } from "@prisma/client";
import { sendEmail } from "@/lib/email/mailer";
import { bookingCreatedForArtist } from "@/lib/email/templates";
import { revalidatePath } from "next/cache";

interface EventWithArtists extends Event {
  eventArtists: (EventArtist & {
    artist: Pick<Artist, "id" | "name" | "slug"> & {
      user: { email: string; name: string } | null;
    };
  })[];
}

interface ArtistWithUser {
  id: string;
  name: string;
  user: { email: string; name: string | null } | null;
}

interface BookingWithArtist extends Booking {
  artist: ArtistWithUser | null;
}

/**
 * Revalidates all relevant cache paths after booking/event changes
 */
function revalidateEventPaths(eventId: string): void {
  try {
    revalidatePath(`/dashboard/venue/events/${eventId}`);
    revalidatePath(`/dashboard/venue/events`);
    revalidatePath(`/dashboard/venue/bookings`);
    revalidatePath(`/dashboard/artist/gigs`);
  } catch (error) {
    console.error("Failed to revalidate pages:", error);
  }
}

/**
 * Generates a unique booking ID
 */
function generateBookingId(): string {
  return `b_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
}

/**
 * Sends booking creation email notification to an artist
 */
async function sendBookingCreatedEmail(
  booking: BookingWithArtist,
  venue: { name: string } | null,
  event: { title: string | null; eventDate: Date; hours: number | null }
): Promise<void> {
  try {
    const artistEmail = booking.artist?.user?.email;
    if (!artistEmail || !booking.artist) {
      console.log(`No email address found for artist ${booking.artist?.name || 'unknown'}`);
      return;
    }

    const tmpl = bookingCreatedForArtist({
      artistName: booking.artist.user?.name || booking.artist.name || "there",
      venueName: venue?.name || "a venue",
      eventISO: event.eventDate.toISOString(),
      hours: event.hours ?? undefined,
      bookingId: booking.id,
    });
    
    const res = await sendEmail({ to: artistEmail, ...tmpl });
    if (!res.ok) {
      console.error(`[email] Failed to send booking creation email to ${artistEmail} for booking ${booking.id}`);
    } else {
      console.log(`Email notification sent to ${booking.artist.name} for event ${event.title}`);
    }
  } catch (error) {
    console.error(`Failed to send email notification to artist ${booking.artist?.name || 'unknown'}:`, error);
  }
}

/**
 * Sends event cancellation email notification to an artist
 */
async function sendEventCancelledEmail(
  booking: BookingWithArtist,
  eventTitle: string | null,
  venueName: string | null
): Promise<void> {
  try {
    const artistEmail = booking.artist?.user?.email;
    if (!artistEmail || !booking.artist) {
      return;
    }

    const { eventCancelledForArtist } = await import("@/lib/email/templates");
    const tmpl = eventCancelledForArtist({
      artistName: booking.artist.name || "there",
      venueName: venueName || "the venue",
      eventTitle: eventTitle || "the event",
      bookingId: booking.id,
    });
    
    const res = await sendEmail({ to: artistEmail, ...tmpl });
    if (!res.ok) {
      console.error(`[email] Failed to send event cancellation email to ${artistEmail} for booking ${booking.id}`);
    } else {
      console.log(`Sent event cancellation email to ${artistEmail} for booking ${booking.id}`);
    }
  } catch (error) {
    console.error(`[email] Error sending event cancellation email for booking ${booking.id}:`, error);
  }
}

/**
 * Creates a single booking request for an artist and event
 */
async function createSingleBooking(
  eventId: string,
  artistId: string,
  event: { id: string; title: string | null; eventDate: Date; hours: number | null; venueId: string },
  artist: ArtistWithUser,
  venue: { name: string } | null,
  includeArtistInResponse: boolean = true
): Promise<void> {
  // Check if booking request already exists
  const existingBooking = await prisma.booking.findFirst({
    where: {
      artistId: artistId,
      eventId: event.id
    }
  });

  if (existingBooking) {
    console.log(`Booking request already exists for artist ${artist.name} for event ${event.title}`);
    return;
  }

  // Create booking request
  const bookingId = generateBookingId();
  
  const bookingData = {
    data: {
      id: bookingId,
      eventDate: event.eventDate,
      hours: event.hours,
      note: `Booking request for event: ${event.title}`,
      status: "PENDING" as const,
      venueId: event.venueId,
      artistId: artistId,
      eventId: event.id
    },
    ...(includeArtistInResponse && {
      include: {
        artist: {
          select: {
            name: true,
            user: { select: { email: true, name: true } }
          }
        }
      }
    })
  };

  const booking = await prisma.booking.create(bookingData) as BookingWithArtist;

  console.log(`Created booking request for artist ${artist.name} for event ${event.title}`);

  // Send email notification (async, don't block)  
  // Create booking object with artist info for email if not included in response
  const bookingForEmail = includeArtistInResponse 
    ? booking 
    : { 
        ...booking, 
        artist: { 
          id: artist.id, 
          name: artist.name, 
          user: artist.user 
        } 
      } as BookingWithArtist;
      
  setImmediate(() => sendBookingCreatedEmail(bookingForEmail, venue, event));
}

/**
 * Creates booking requests for all artists in an event when it's published
 */
export async function createBookingRequestsForEvent(eventId: string): Promise<void> {
  // Get the event with all its artists
  const event = await prisma.event.findUnique({
    where: { id: eventId },
    include: {
      eventArtists: {
        where: { confirmed: false }, // Only create bookings for unconfirmed artists
        include: {
          artist: { 
            select: { 
              id: true, 
              name: true, 
              slug: true,
              user: { select: { email: true, name: true } }
            } 
          }
        }
      }
    }
  }) as EventWithArtists | null;

  if (!event) {
    throw new Error("Event not found");
  }

  if (event.status !== "PUBLISHED") {
    throw new Error("Event must be published to create booking requests");
  }

  if (!event.eventDate) {
    throw new Error("Event must have an event date to create booking requests");
  }

  // Get venue information for email
  const venue = await prisma.venue.findUnique({
    where: { id: event.venueId },
    select: { name: true }
  });

  // Create booking requests for each artist using the shared function
  for (const eventArtist of event.eventArtists) {
    await createSingleBooking(
      eventId,
      eventArtist.artistId,
      event,
      eventArtist.artist,
      venue
    );
  }
}

/**
 * Cancels all pending and accepted booking requests for an event when it's unpublished or cancelled
 */
export async function cancelBookingRequestsForEvent(eventId: string): Promise<void> {
  // Get event details for email notifications
  const event = await prisma.event.findUnique({
    where: { id: eventId },
    include: {
      venue: { select: { name: true } }
    }
  });

  if (!event) {
    console.error(`Event ${eventId} not found when trying to cancel bookings`);
    return;
  }

  // Get all bookings that need to be cancelled (PENDING and ACCEPTED)
  const bookingsToCancel = await prisma.booking.findMany({
    where: {
      eventId: eventId,
      status: { in: ["PENDING", "ACCEPTED"] }
    },
    include: {
      artist: { 
        select: { 
          id: true, 
          name: true,
          user: { select: { email: true, name: true } }
        } 
      }
    }
  }) as BookingWithArtist[];

  if (bookingsToCancel.length === 0) {
    console.log(`No bookings to cancel for event ${eventId}`);
    return;
  }

  // Cancel all pending and accepted bookings for this event
  await prisma.booking.updateMany({
    where: {
      eventId: eventId,
      status: { in: ["PENDING", "ACCEPTED"] }
    },
    data: {
      status: "CANCELLED"
    }
  });

  // Reset EventArtist confirmation status for all artists
  await prisma.eventArtist.updateMany({
    where: { eventId: eventId },
    data: { confirmed: false }
  });

  console.log(`Cancelled ${bookingsToCancel.length} booking requests for event ${eventId}`);

  // Revalidate relevant pages to update the UI
  revalidateEventPaths(eventId);

  // Send email notifications to all affected artists (async, don't block)
  setImmediate(async () => {
    for (const booking of bookingsToCancel) {
      await sendEventCancelledEmail(booking, event.title, event.venue?.name || null);
    }
  });
}

/**
 * Creates a booking request for a single artist when added to a published event
 */
export async function createBookingRequestForArtist(eventId: string, artistId: string): Promise<void> {
  // Get the event details
  const event = await prisma.event.findUnique({
    where: { id: eventId },
    select: {
      id: true,
      title: true,
      status: true,
      eventDate: true,
      hours: true,
      venueId: true
    }
  });

  if (!event) {
    throw new Error("Event not found");
  }

  if (event.status !== "PUBLISHED") {
    throw new Error("Event must be published to create booking requests");
  }

  if (!event.eventDate) {
    throw new Error("Event must have an event date to create booking requests");
  }

  // Get artist details
  const artist = await prisma.artist.findUnique({
    where: { id: artistId },
    select: {
      id: true,
      name: true,
      user: { select: { email: true, name: true } }
    }
  });

  if (!artist) {
    throw new Error("Artist not found");
  }

  // Get venue information for email
  const venue = await prisma.venue.findUnique({
    where: { id: event.venueId },
    select: { name: true }
  });

  // Create booking using the shared function (without artist include for this case)
  await createSingleBooking(eventId, artistId, event, artist, venue, false);

  // Revalidate relevant pages to update the UI
  revalidateEventPaths(eventId);
}