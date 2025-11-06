import { prisma } from "@/lib/prisma";

/**
 * Creates an event automatically when an individual booking (without eventId) is accepted
 * This allows individual bookings to be converted to events seamlessly
 */
export async function createEventForBooking(bookingId: string) {
  const booking = await prisma.booking.findUnique({
    where: { id: bookingId },
    select: {
      id: true,
      eventId: true,
      eventDate: true,
      hours: true,
      note: true,
      artistId: true,
      venueId: true,
      artist: { select: { name: true } },
      venue: { select: { name: true } },
    },
  });

  if (!booking) {
    throw new Error("Booking not found");
  }

  // If booking already has an event, no need to create one
  if (booking.eventId) {
    return booking.eventId;
  }

  const artistName = booking.artist?.name || "Artist";
  const venueName = booking.venue?.name || "Venue";
  const eventTitle = `${artistName} at ${venueName}`;
  
  // Create a unique slug for the auto-generated event
  let eventSlug = eventTitle
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-");
  
  // Ensure slug uniqueness
  let slugCounter = 1;
  let finalSlug = eventSlug;
  while (await prisma.event.findUnique({ where: { slug: finalSlug } })) {
    finalSlug = `${eventSlug}-${slugCounter}`;
    slugCounter++;
  }

  // Create the event
  const newEvent = await prisma.event.create({
    data: {
      venueId: booking.venueId,
      title: eventTitle,
      slug: finalSlug,
      description: booking.note || `Performance by ${artistName}`,
      eventDate: booking.eventDate,
      endDate: booking.hours 
        ? new Date(booking.eventDate.getTime() + (booking.hours * 60 * 60 * 1000))
        : null,
      hours: booking.hours,
      status: "PUBLISHED", // Auto-publish since booking was accepted
    },
  });

  // Create EventArtist relationship
  await prisma.eventArtist.create({
    data: {
      eventId: newEvent.id,
      artistId: booking.artistId,
      fee: null, // Can be set later
      hours: booking.hours,
      confirmed: true, // Since booking was accepted
    },
  });

  // Update the booking to link to the new event
  await prisma.booking.update({
    where: { id: bookingId },
    data: { eventId: newEvent.id },
  });

  return newEvent.id;
}