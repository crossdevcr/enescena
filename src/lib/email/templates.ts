const base = process.env.APP_BASE_URL || "http://localhost:3000";

// Email templates for the new invitation/request system

export function performanceInvitationForArtist(params: {
  artistName: string;
  venueName: string;
  eventTitle: string;
  eventISO: string;
  hours?: number | null;
  performanceId: string;
}) {
  const when = new Date(params.eventISO).toLocaleString("en-US", { timeZone: "America/Costa_Rica" });
  const link = `${base}/dashboard/artist/events/${params.performanceId}`;
  return {
    subject: `Performance invitation from ${params.venueName}`,
    html: `
      <h2>Performance invitation</h2>
      <p>Hi ${params.artistName},</p>
      <p><b>${params.venueName}</b> invited you to perform at "<b>${params.eventTitle}</b>".</p>
      <p><b>When:</b> ${when}${params.hours ? ` • ${params.hours}h` : ""}</p>
      <p><a href="${link}">View & respond</a></p>
      <hr/>
      <p>Enescena</p>
    `,
    text: `Performance invitation from ${params.venueName} for "${params.eventTitle}" at ${when}. Respond: ${link}`,
  };
}

export function invitationAcceptedForVenue(params: {
  venueName: string;
  artistName: string;
  eventTitle: string;
  eventISO: string;
  hours?: number | null;
  performanceId: string;
  eventId: string;
}) {
  const when = new Date(params.eventISO).toLocaleString("en-US", { timeZone: "America/Costa_Rica" });
  const link = `${base}/dashboard/venue/events/${params.eventId}`;
  return {
    subject: `${params.artistName} accepted your invitation`,
    html: `
      <h2>Invitation accepted</h2>
      <p>Hi ${params.venueName},</p>
      <p><b>${params.artistName}</b> accepted your invitation to perform at "<b>${params.eventTitle}</b>".</p>
      <p><b>When:</b> ${when}${params.hours ? ` • ${params.hours}h` : ""}</p>
      <p><a href="${link}">View event details</a></p>
      <hr/>
      <p>Enescena</p>
    `,
    text: `${params.artistName} accepted your invitation for "${params.eventTitle}" at ${when}. Details: ${link}`,
  };
}

export function invitationDeclinedForVenue(params: {
  venueName: string;
  artistName: string;
  eventTitle: string;
  performanceId: string;
  eventId: string;
}) {
  const link = `${base}/dashboard/venue/events/${params.eventId}`;
  return {
    subject: `${params.artistName} declined your invitation`,
    html: `
      <h2>Invitation declined</h2>
      <p>Hi ${params.venueName},</p>
      <p><b>${params.artistName}</b> declined your invitation to perform at "<b>${params.eventTitle}</b>".</p>
      <p><a href="${link}">View event details</a></p>
      <hr/>
      <p>Enescena</p>
    `,
    text: `${params.artistName} declined your invitation for "${params.eventTitle}". Details: ${link}`,
  };
}

export function eventRequestForVenue(params: {
  venueName: string;
  artistName: string;
  eventTitle: string;
  eventISO: string;
  budget?: number | null;
  eventId: string;
}) {
  const when = new Date(params.eventISO).toLocaleString("en-US", { timeZone: "America/Costa_Rica" });
  const link = `${base}/dashboard/venue/events/${params.eventId}`;
  return {
    subject: `Event request from ${params.artistName}`,
    html: `
      <h2>Event request</h2>
      <p>Hi ${params.venueName},</p>
      <p><b>${params.artistName}</b> requested to create an event at your venue.</p>
      <p><b>Event:</b> ${params.eventTitle}</p>
      <p><b>When:</b> ${when}</p>
      ${params.budget ? `<p><b>Budget:</b> $${params.budget}</p>` : ''}
      <p><a href="${link}">View & respond</a></p>
      <hr/>
      <p>Enescena</p>
    `,
    text: `Event request from ${params.artistName} for "${params.eventTitle}" at ${when}. Respond: ${link}`,
  };
}

export function eventRequestApprovedForArtist(params: {
  artistName: string;
  venueName: string;
  eventTitle: string;
  eventISO: string;
  eventId: string;
}) {
  const when = new Date(params.eventISO).toLocaleString("en-US", { timeZone: "America/Costa_Rica" });
  const link = `${base}/dashboard/artist/events/${params.eventId}`;
  return {
    subject: `Event request approved by ${params.venueName}`,
    html: `
      <h2>Event request approved</h2>
      <p>Hi ${params.artistName},</p>
      <p><b>${params.venueName}</b> approved your event request for "<b>${params.eventTitle}</b>".</p>
      <p><b>When:</b> ${when}</p>
      <p><a href="${link}">View event details</a></p>
      <hr/>
      <p>Enescena</p>
    `,
    text: `Your event request "${params.eventTitle}" at ${params.venueName} for ${when} has been approved. Details: ${link}`,
  };
}

export function eventRequestDeclinedForArtist(params: {
  artistName: string;
  venueName: string;
  eventTitle: string;
  reason?: string;
  eventId: string;
}) {
  const link = `${base}/dashboard/artist/events/${params.eventId}`;
  return {
    subject: `Event request declined by ${params.venueName}`,
    html: `
      <h2>Event request declined</h2>
      <p>Hi ${params.artistName},</p>
      <p><b>${params.venueName}</b> declined your event request for "<b>${params.eventTitle}</b>".</p>
      ${params.reason ? `<p><b>Reason:</b> ${params.reason}</p>` : ''}
      <p><a href="${link}">View details</a></p>
      <hr/>
      <p>Enescena</p>
    `,
    text: `Your event request "${params.eventTitle}" at ${params.venueName} has been declined. Details: ${link}`,
  };
}

export function performanceCancelledForArtist(params: {
  artistName: string;
  venueName: string;
  eventTitle: string;
  wasConfirmed: boolean;
  reason?: string;
  eventId: string;
}) {
  const link = `${base}/dashboard/artist/events`;
  const subject = params.wasConfirmed 
    ? `Performance cancelled - ${params.eventTitle}`
    : `Performance invitation cancelled - ${params.eventTitle}`;
  const heading = params.wasConfirmed ? "Performance cancelled" : "Performance invitation cancelled";
  const message = params.wasConfirmed
    ? `We're sorry to inform you that your confirmed performance at "<b>${params.eventTitle}</b>" at ${params.venueName} has been cancelled.`
    : `We're sorry to inform you that your invitation to perform at "<b>${params.eventTitle}</b>" at ${params.venueName} has been cancelled.`;
  const textMessage = params.wasConfirmed ? 'confirmed performance' : 'invitation to perform';

  return {
    subject,
    html: `
      <h2>${heading}</h2>
      <p>Hi ${params.artistName},</p>
      <p>${message}</p>
      ${params.reason ? `<p><b>Reason:</b> ${params.reason}</p>` : ''}
      <p>We apologize for any inconvenience this may cause.</p>
      <p><a href="${link}">View your other events</a></p>
      <hr/>
      <p>Enescena</p>
    `,
    text: `Your ${textMessage} at "${params.eventTitle}" has been cancelled${params.reason ? `: ${params.reason}` : ''}. View your other events at ${link}`,
  };
}