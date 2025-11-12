import { NextResponse } from "next/server";import { NextResponse } from "next/server";

import { verifyIdToken } from "@/lib/auth/cognito";import { verifyIdToken } from "@/lib/auth/cognito";

import { prisma } from "@/lib/prisma";import { prisma } from "@/lib/prisma";

import { cookies } from "next/headers";import { cookies } from "next/headers";

import { revalidatePath } from "next/cache";import { revalidatePath } from "next/cache";

import { ApprovalWorkflows } from "@/lib/events/approvalWorkflows";import { ApprovalWorkflows } from "@/lib/events/approvalWorkflows";



/**/**

 * POST /api/events/[id]/artists * POST /api/events/[id]/artists

 * Invite an artist to perform at an event (creates performance invitation) * Add an artist to an event

 */ */

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {

  const { id: eventId } = await params;  const { id: eventId } = await params;



  const jar = await cookies();  const jar = await cookies();

  const idToken = jar.get("id_token")?.value;  const idToken = jar.get("id_token")?.value;

  if (!idToken) return NextResponse.json({ error: "unauthorized" }, { status: 401 });  if (!idToken) return NextResponse.json({ error: "unauthorized" }, { status: 401 });



  const payload = await verifyIdToken(idToken).catch(() => null);  const payload = await verifyIdToken(idToken).catch(() => null);

  const email = payload?.email ? String(payload.email) : null;  const email = payload?.email ? String(payload.email) : null;

  if (!email) return NextResponse.json({ error: "unauthorized" }, { status: 401 });  if (!email) return NextResponse.json({ error: "unauthorized" }, { status: 401 });



  const user = await prisma.user.findUnique({  const user = await prisma.user.findUnique({

    where: { email },    where: { email },

    include: { venue: true },    include: { venue: true },

  });  });

  if (!user || user.role !== "VENUE" || !user.venue) {  if (!user || user.role !== "VENUE" || !user.venue) {

    return NextResponse.json({ error: "forbidden" }, { status: 403 });    return NextResponse.json({ error: "forbidden" }, { status: 403 });

  }  }



  const event = await prisma.event.findUnique({  const event = await prisma.event.findUnique({

    where: { id: eventId },    where: { id: eventId },

    select: { id: true, venueId: true, status: true }    select: { id: true, venueId: true, status: true }

  });  });



  if (!event) {  if (!event) {

    return NextResponse.json({ error: "not_found" }, { status: 404 });    return NextResponse.json({ error: "event_not_found" }, { status: 404 });

  }  }



  if (event.venueId !== user.venue.id) {  if (event.venueId !== user.venue.id) {

    return NextResponse.json({ error: "forbidden" }, { status: 403 });    return NextResponse.json({ error: "forbidden" }, { status: 403 });

  }  }



  const body = await req.json();  const body = await req.json().catch(() => ({}));

  const { artistId, proposedFee, hours, notes } = body;  const { artistId, fee, hours, notes } = body;

  

  if (!artistId || typeof artistId !== "string") {  if (!artistId) {

    return NextResponse.json({ error: "validation_error", message: "artistId is required" }, { status: 400 });    return NextResponse.json({ 

  }      error: "validation_error",

      message: "Artist ID is required" 

  // Check if artist exists    }, { status: 400 });

  const artist = await prisma.artist.findUnique({ where: { id: artistId } });  }

  if (!artist) {

    return NextResponse.json({ error: "not_found", message: "Artist not found" }, { status: 404 });  // Verify artist exists

  }  const artist = await prisma.artist.findUnique({

    where: { id: artistId },

  // Check if this artist already has a performance for this event    select: { id: true, name: true }

  const existingPerformance = await prisma.performance.findUnique({  });

    where: {

      eventId_artistId: { eventId, artistId }  if (!artist) {

    }    return NextResponse.json({ error: "artist_not_found" }, { status: 404 });

  });  }



  if (existingPerformance) {  // Check if artist is already added to this event

    return NextResponse.json({ error: "validation_error", message: "Artist already invited to this event" }, { status: 400 });  const existingEventArtist = await prisma.eventArtist.findUnique({

  }    where: {

      eventId_artistId: {

  try {        eventId: eventId,

    // Use ApprovalWorkflows to send invitation        artistId: artistId

    const workflows = new ApprovalWorkflows(prisma);      }

    const performanceData = {    }

      proposedFee: proposedFee ? Number(proposedFee) : undefined,  });

      hours: hours ? Number(hours) : undefined,

      venueNotes: notes || undefined  if (existingEventArtist) {

    };    return NextResponse.json({ 

      error: "validation_error",

    const result = await workflows.inviteArtistToPerform(eventId, artistId, user.id, performanceData);      message: "Artist is already added to this event" 

        }, { status: 400 });

    if (!result.success) {  }

      return NextResponse.json({ error: "workflow_error", message: result.message }, { status: 400 });

    }  const eventArtist = await prisma.eventArtist.create({

    data: {

    // Revalidate event pages to show the new invitation      eventId: eventId,

    try {      artistId: artistId,

      revalidatePath(`/dashboard/venue/events/${eventId}`);      fee: fee && !isNaN(Number(fee)) ? Number(fee) : null,

      revalidatePath(`/dashboard/venue/events`);      hours: hours && !isNaN(Number(hours)) ? Number(hours) : null,

    } catch (error) {      notes: notes ? String(notes) : null,

      console.error("Failed to revalidate pages after inviting artist:", error);      confirmed: false, // Artists need to confirm their participation

    }    },

    include: {

    return NextResponse.json({       artist: { select: { id: true, name: true, slug: true } }

      success: true,     }

      message: result.message,  });

      performanceId: result.performanceId 

    });  // If the event is already published, send invitation to the new artist

  if (event.status === "PUBLISHED") {

  } catch (error) {    try {

    console.error(`Failed to invite artist ${artistId} to event ${eventId}:`, error);      const workflows = new ApprovalWorkflows(prisma);

    return NextResponse.json({ error: "internal_error", message: "Failed to send invitation" }, { status: 500 });      await workflows.sendPerformanceInvitation(eventId, artistId);

  }      console.log(`Sent performance invitation to artist ${artistId} for published event ${eventId}`);

}    } catch (error) {

      console.error(`Failed to send performance invitation to artist ${artistId} in event ${eventId}:`, error);

/**      // Don't fail the artist addition if invitation sending fails

 * GET /api/events/[id]/artists    }

 * Get performances for an event (artists invited/confirmed for the event)  }

 */

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {  // Revalidate event pages to show the new artist

  const { id: eventId } = await params;  try {

    revalidatePath(`/dashboard/venue/events/${eventId}`);

  const jar = await cookies();    revalidatePath(`/dashboard/venue/events`);

  const idToken = jar.get("id_token")?.value;  } catch (error) {

  if (!idToken) return NextResponse.json({ error: "unauthorized" }, { status: 401 });    console.error("Failed to revalidate pages after adding artist:", error);

  }

  const payload = await verifyIdToken(idToken).catch(() => null);

  const email = payload?.email ? String(payload.email) : null;  return NextResponse.json({ eventArtist });

  if (!email) return NextResponse.json({ error: "unauthorized" }, { status: 401 });}



  const user = await prisma.user.findUnique({/**

    where: { email }, * GET /api/events/[id]/artists

    include: { venue: true, artist: true }, * Get artists for an event

  }); */

  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });export async function GET(_req: Request, { params }: { params: { id: string } }) {

  const { id: eventId } = await params;

  // Check if user has access to this event

  const event = await prisma.event.findUnique({  const jar = await cookies();

    where: { id: eventId },  const idToken = jar.get("id_token")?.value;

    select: { id: true, venueId: true, performances: true }  if (!idToken) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  });

  const payload = await verifyIdToken(idToken).catch(() => null);

  if (!event) {  const email = payload?.email ? String(payload.email) : null;

    return NextResponse.json({ error: "not_found" }, { status: 404 });  if (!email) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  }

  const user = await prisma.user.findUnique({

  // Allow access if user is venue owner or one of the performing artists    where: { email },

  const isVenueOwner = user.role === "VENUE" && user.venue && event.venueId === user.venue.id;    include: { venue: true, artist: true },

  const isEventArtist = user.artist && event.performances.some(p => p.artistId === user.artist!.id);  });

  const isAdmin = user.role === "ADMIN";  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });



  if (!isVenueOwner && !isEventArtist && !isAdmin) {  const event = await prisma.event.findUnique({

    return NextResponse.json({ error: "forbidden" }, { status: 403 });    where: { id: eventId },

  }    select: { id: true, venueId: true }

  });

  const performances = await prisma.performance.findMany({

    where: { eventId },  if (!event) {

    include: {    return NextResponse.json({ error: "event_not_found" }, { status: 404 });

      artist: {   }

        select: { 

          id: true,   // Access control: venue owner or event artists can see the list

          name: true,   const isVenueOwner = user.venue && event.venueId === user.venue.id;

          slug: true,  const isEventArtist = user.artist && await prisma.eventArtist.findUnique({

          genre: true,    where: {

          description: true       eventId_artistId: {

        }         eventId: eventId,

      }        artistId: user.artist.id

    },      }

    orderBy: { createdAt: 'desc' }    }

  });  });



  return NextResponse.json({ performances });  if (!isVenueOwner && !isEventArtist && user.role !== "ADMIN") {

}    return NextResponse.json({ error: "forbidden" }, { status: 403 });
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