import { NextResponse } from "next/server";
import { verifyIdToken } from "@/lib/auth/cognito";
import { prisma } from "@/lib/prisma";
import { cookies } from "next/headers";
import { validateEventCreation } from "@/lib/events/eventUtils";
import { ApprovalWorkflows } from "@/lib/events/approvalWorkflows";

/**
 * GET /api/events
 * List events - supports filtering by creator (venue/artist) and public events
 */
export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const publicOnly = searchParams.get('public') === 'true';
  const createdByMe = searchParams.get('createdByMe') === 'true';

  // For public events, no authentication required
  if (publicOnly) {
    try {
      const events = await prisma.event.findMany({
        where: { 
          isPublic: true,
        },
        select: {
          id: true,
          title: true,
          slug: true,
          description: true,
          eventDate: true,
          endDate: true,
          status: true,
          venue: { select: { id: true, name: true, slug: true, city: true } },
          externalVenueName: true,
          externalVenueAddress: true,
          externalVenueCity: true,
        },
        orderBy: { eventDate: "desc" },
      });

      return NextResponse.json({ events });
    } catch (error) {
      console.error('Public events query error:', error);
      return NextResponse.json({ error: 'Failed to fetch events' }, { status: 500 });
    }
  }

  // For user-specific events, require authentication
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
  if (!user) {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }

  let whereClause: any = {};

  if (createdByMe) {
    // Events created by this user
    whereClause.createdBy = user.id;
  } else {
    // Events relevant to this user based on their role
    if (user.role === "VENUE" && user.venue) {
      whereClause = {
        OR: [
          { venueId: user.venue.id }, // Events at their venue
          { createdBy: user.id },     // Events they created
        ]
      };
    } else if (user.role === "ARTIST" && user.artist) {
      // For now, simplify to just events they created and public seeking artists events
      // We'll add performance relationship queries once Prisma types are resolved
      whereClause = {
        OR: [
          { createdBy: user.id },     // Events they created
          { AND: [{ status: "SEEKING_ARTISTS" }, { isPublic: true }] }, // Public events seeking artists
        ]
      };
    } else {
      // Admin or other roles see all events
      whereClause = {};
    }
  }

  try {
    const events = await prisma.event.findMany({
      where: whereClause,
      select: {
        id: true,
        title: true,
        slug: true,
        description: true,
        eventDate: true,
        endDate: true,
        status: true,
        isPublic: true,
        createdBy: true,
        venue: { select: { id: true, name: true, slug: true, city: true } },
        externalVenueName: true,
        externalVenueAddress: true,
        externalVenueCity: true,
      },
      orderBy: { eventDate: "desc" },
    });

    return NextResponse.json({ events });
  } catch (error) {
    console.error('Events query error:', error);
    return NextResponse.json({ error: 'Failed to fetch events' }, { status: 500 });
  }
}

/**
 * POST /api/events
 * Create a new event (supports venues and artists)
 */
export async function POST(req: Request) {
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
  if (!user) {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }

  const body = await req.json().catch(() => ({}));
  
  // Use our validation utility
  const validation = validateEventCreation({
    createdBy: user.id,
    title: body.title,
    eventDate: new Date(body.eventDate),
    venueId: body.venueId,
    externalVenueName: body.externalVenueName,
    externalVenueAddress: body.externalVenueAddress,
    description: body.description,
    totalHours: body.totalHours,
    totalBudget: body.totalBudget,
    isPublic: body.isPublic,
  });

  if (!validation.valid) {
    return NextResponse.json({ 
      error: "validation_error",
      message: validation.errors.join(", ")
    }, { status: 400 });
  }

  // Generate unique slug
  let slug = body.title
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-");

  let slugCounter = 1;
  let finalSlug = slug;
  while (await prisma.event.findUnique({ where: { slug: finalSlug } })) {
    finalSlug = `${slug}-${slugCounter}`;
    slugCounter++;
  }

  try {
    // Determine initial status based on user type and venue
    let needsVenueApproval = false
    
    // If artist creates event at an internal venue, it needs venue approval
    if (user.role === "ARTIST" && body.venueId) {
      needsVenueApproval = true
    }
    
    const event = await prisma.event.create({
      data: {
        createdBy: user.id,
        title: body.title,
        slug: finalSlug,
        description: body.description || null,
        eventDate: new Date(body.eventDate),
        endDate: body.endDate ? new Date(body.endDate) : null,
        venueId: body.venueId || null,
        externalVenueName: body.externalVenueName || null,
        externalVenueAddress: body.externalVenueAddress || null,
        externalVenueCity: body.externalVenueCity || null,
        totalHours: body.totalHours || null,
        totalBudget: body.totalBudget || null,
        isPublic: body.isPublic ?? true,
        status: "DRAFT",
      },
      select: {
        id: true,
        title: true,
        slug: true,
        description: true,
        eventDate: true,
        endDate: true,
        status: true,
        isPublic: true,
        venue: { select: { id: true, name: true, slug: true } },
        externalVenueName: true,
        externalVenueAddress: true,
        externalVenueCity: true,
      }
    });

    // If artist creating event at internal venue, request venue approval
    if (needsVenueApproval && body.venueId) {
      const approvals = new ApprovalWorkflows(prisma)
      await approvals.requestVenueApproval(event.id, body.venueId)
    }

    return NextResponse.json({ 
      success: true, 
      event,
      message: needsVenueApproval ? "Event created and venue approval requested" : "Event created successfully"
    });
  } catch (error) {
    console.error('Event creation error:', error);
    return NextResponse.json(
      { error: "creation_failed", message: "Failed to create event" },
      { status: 500 }
    );
  }
}