import { prisma } from "@/lib/prisma";
import { Event, EventArtist, Artist } from "@prisma/client";
import { sendEmail } from "@/lib/email/mailer";
import { bookingCreatedForArtist } from "@/lib/email/templates";

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
 * Cancels all pending booking requests for an event when it's unpublished or cancelled
 */
export async function cancelBookingRequestsForEvent(eventId: string): Promise<void> {
  // Cancel all pending bookings for this event
  await prisma.booking.updateMany({
    where: {
      eventId: eventId,
      status: "PENDING"
    },
    data: {
      status: "CANCELLED"
    }
  });

  console.log(`Cancelled pending booking requests for event ${eventId}`);
}