const base = process.env.APP_BASE_URL || "http://localhost:3000";

export function bookingCreatedForArtist(params: {
  artistName: string;
  venueName: string;
  eventISO: string; // e.g., booking.eventDate.toISOString()
  hours?: number | null;
  bookingId: string;
}) {
  const when = new Date(params.eventISO).toLocaleString("en-US", { timeZone: "America/Costa_Rica" });
  const link = `${base}/dashboard/artist/gigs/${params.bookingId}`;
  return {
    subject: `New booking request from ${params.venueName}`,
    html: `
      <h2>New booking request</h2>
      <p>Hi ${params.artistName},</p>
      <p><b>${params.venueName}</b> sent you a booking request.</p>
      <p><b>When:</b> ${when}${params.hours ? ` • ${params.hours}h` : ""}</p>
      <p><a href="${link}">View & respond</a></p>
      <hr/>
      <p>Enescena</p>
    `,
    text: `New booking request from ${params.venueName} at ${when}. Respond: ${link}`,
  };
}

export function bookingAcceptedForVenue(params: {
  venueName: string;
  artistName: string;
  eventISO: string;
  hours?: number | null;
  bookingId: string;
}) {
  const when = new Date(params.eventISO).toLocaleString("en-US", { timeZone: "America/Costa_Rica" });
  const link = `${base}/dashboard/venue/bookings/${params.bookingId}`;
  return {
    subject: `${params.artistName} accepted your booking`,
    html: `
      <h2>Booking accepted</h2>
      <p>Hi ${params.venueName},</p>
      <p><b>${params.artistName}</b> accepted your booking.</p>
      <p><b>When:</b> ${when}${params.hours ? ` • ${params.hours}h` : ""}</p>
      <p><a href="${link}">View details</a></p>
      <hr/>
      <p>Enescena</p>
    `,
    text: `${params.artistName} accepted your booking for ${when}. Details: ${link}`,
  };
}

export function bookingDeclinedForVenue(params: {
  venueName: string;
  artistName: string;
  bookingId: string;
}) {
  const link = `${base}/dashboard/venue/bookings/${params.bookingId}`;
  return {
    subject: `${params.artistName} declined your booking`,
    html: `
      <h2>Booking declined</h2>
      <p>Hi ${params.venueName},</p>
      <p><b>${params.artistName}</b> declined your booking request.</p>
      <p><a href="${link}">View details</a></p>
      <hr/>
      <p>Enescena</p>
    `,
    text: `${params.artistName} declined your booking. Details: ${link}`,
  };
}

export function bookingCancelledForArtist(params: {
  artistName: string;
  venueName: string;
  bookingId: string;
}) {
  const link = `${base}/dashboard/artist/gigs/${params.bookingId}`;
  return {
    subject: `Booking canceled by ${params.venueName}`,
    html: `
      <h2>Booking canceled</h2>
      <p>Hi ${params.artistName},</p>
      <p>The venue <b>${params.venueName}</b> canceled the booking request.</p>
      <p><a href="${link}">View details</a></p>
      <hr/>
      <p>Enescena</p>
    `,
    text: `The venue ${params.venueName} canceled the booking. Details: ${link}`,
  };
}

export function eventCancelledForArtist(params: {
  artistName: string;
  venueName: string;
  eventTitle: string;
  bookingId: string;
}) {
  const link = `${base}/dashboard/artist/gigs/${params.bookingId}`;
  return {
    subject: `Event "${params.eventTitle}" has been cancelled`,
    html: `
      <h2>Event cancelled</h2>
      <p>Hi ${params.artistName},</p>
      <p>The venue <b>${params.venueName}</b> has cancelled the event "<b>${params.eventTitle}</b>".</p>
      <p>Your booking for this event has been automatically cancelled.</p>
      <p><a href="${link}">View booking details</a></p>
      <hr/>
      <p>Enescena</p>
    `,
    text: `The event "${params.eventTitle}" at ${params.venueName} has been cancelled. Your booking has been automatically cancelled. Details: ${link}`,
  };
}