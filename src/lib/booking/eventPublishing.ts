import { prisma } from "@/lib/prisma";
import { Event, EventArtist, Artist } from "@prisma/client";
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

  // Check if we have all required event data
  if (!event.eventDate) {
    throw new Error("Event must have an event date to create booking requests");
  }

  // Get venue information for email
  const venue = await prisma.venue.findUnique({
    where: { id: event.venueId },
    select: { name: true }
  });

  // Create booking requests for each artist that doesn't already have one
  for (const eventArtist of event.eventArtists) {
    // Check if booking request already exists for this artist and event
    const existingBooking = await prisma.booking.findFirst({
      where: {
        artistId: eventArtist.artistId,
        eventId: event.id
      }
    });

    if (!existingBooking) {
      // Create a booking request
      const bookingId = `b_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
      
      const booking = await prisma.booking.create({
        data: {
          id: bookingId,
          eventDate: event.eventDate,
          hours: event.hours,
          note: `Booking request for event: ${event.title}`,
          status: "PENDING",
          venueId: event.venueId,
          artistId: eventArtist.artistId,
          eventId: event.id
        },
        include: {
          artist: {
            select: {
              name: true,
              user: { select: { email: true, name: true } }
            }
          }
        }
      });

      console.log(`Created booking request for artist ${eventArtist.artist.name} for event ${event.title}`);

      // Send email notification to artist (async, don't block)
      (async () => {
        try {
          const artistEmail = booking.artist?.user?.email;
          if (artistEmail) {
            const tmpl = bookingCreatedForArtist({
              artistName: booking.artist.user?.name || booking.artist.name || "there",
              venueName: venue?.name || "a venue",
              eventISO: booking.eventDate.toISOString(),
              hours: booking.hours ?? undefined,
              bookingId: booking.id,
            });
            await sendEmail({ to: artistEmail, ...tmpl });
            console.log(`Email notification sent to ${booking.artist.name} for event ${event.title}`);
          } else {
            console.log(`No email address found for artist ${booking.artist.name}`);
          }
        } catch (error) {
          console.error(`Failed to send email notification to artist ${booking.artist.name}:`, error);
        }
      })();
    } else {
      console.log(`Booking request already exists for artist ${eventArtist.artist.name} for event ${event.title}`);
    }
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
          user: { select: { email: true } }
        } 
      }
    }
  });

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
  try {
    revalidatePath(`/dashboard/venue/events/${eventId}`);
    revalidatePath(`/dashboard/venue/events`);
    revalidatePath(`/dashboard/venue/bookings`);
    revalidatePath(`/dashboard/artist/gigs`);
  } catch (error) {
    console.error("Failed to revalidate pages after event cancellation:", error);
  }

  // Send email notifications to all affected artists (async, don't block)
  (async () => {
    const { eventCancelledForArtist } = await import("@/lib/email/templates");
    const { sendEmail } = await import("@/lib/email/mailer");

    for (const booking of bookingsToCancel) {
      try {
        const artistEmail = booking.artist?.user?.email;
        if (artistEmail) {
          const tmpl = eventCancelledForArtist({
            artistName: booking.artist?.name || "there",
            venueName: event.venue?.name || "the venue",
            eventTitle: event.title || "the event",
            bookingId: booking.id,
          });
          const res = await sendEmail({ to: artistEmail, ...tmpl });
          if (!res.ok) {
            console.error(`[email] Failed to send event cancellation email to ${artistEmail} for booking ${booking.id}`);
          } else {
            console.log(`Sent event cancellation email to ${artistEmail} for booking ${booking.id}`);
          }
        }
      } catch (error) {
        console.error(`[email] Error sending event cancellation email for booking ${booking.id}:`, error);
      }
    }
  })();
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

  // Check if booking request already exists for this artist and event
  const existingBooking = await prisma.booking.findFirst({
    where: {
      artistId: artistId,
      eventId: event.id
    }
  });

  if (existingBooking) {
    console.log(`Booking already exists for artist ${artistId} in event ${eventId}`);
    return;
  }

  // Create a booking request
  const bookingId = `b_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
  
  const booking = await prisma.booking.create({
    data: {
      id: bookingId,
      eventDate: event.eventDate,
      hours: event.hours,
      note: `Booking request for event: ${event.title}`,
      status: "PENDING",
      venueId: event.venueId,
      artistId: artistId,
      eventId: event.id
    }
  });

  console.log(`Created booking request ${bookingId} for artist ${artist.name} for event ${event.title}`);

  // Revalidate relevant pages to update the UI
  try {
    revalidatePath(`/dashboard/venue/events/${eventId}`);
    revalidatePath(`/dashboard/venue/events`);
    revalidatePath(`/dashboard/venue/bookings`);
    revalidatePath(`/dashboard/artist/gigs`);
  } catch (error) {
    console.error("Failed to revalidate pages after booking creation:", error);
  }

  // Send email notification to artist (async, don't block)
  (async () => {
    try {
      const artistEmail = artist.user?.email;
      if (artistEmail) {
        const tmpl = bookingCreatedForArtist({
          artistName: artist.user?.name || artist.name || "there",
          venueName: venue?.name || "a venue",
          eventISO: event.eventDate.toISOString(),
          hours: event.hours ?? undefined,
          bookingId: booking.id,
        });
        const res = await sendEmail({ to: artistEmail, ...tmpl });
        if (!res.ok) {
          console.error(`[email] Failed to send booking creation email to ${artistEmail} for booking ${booking.id}`);
        } else {
          console.log(`Sent booking creation email to ${artistEmail} for booking ${booking.id}`);
        }
      }
    } catch (error) {
      console.error(`[email] Error sending booking creation email for booking ${booking.id}:`, error);
    }
  })();
}