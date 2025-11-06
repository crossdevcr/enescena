import { NextResponse } from "next/server";
import { verifyIdToken } from "@/lib/auth/cognito";
import { prisma } from "@/lib/prisma";
import { cookies } from "next/headers";

/**
 * GET /api/events/[id]
 * Get event details
 */
export async function GET(_req: Request, { params }: { params: { id: string } }) {
  const { id } = await params;

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

  const event = await prisma.event.findUnique({
    where: { id },
    include: {
      venue: { select: { id: true, name: true, slug: true } },
      eventArtists: {
        include: {
          artist: { select: { id: true, name: true, slug: true } }
        },
        orderBy: { createdAt: "asc" }
      },
      bookings: {
        include: {
          artist: { select: { id: true, name: true, slug: true } }
        },
        orderBy: { createdAt: "desc" }
      }
    }
  });

  if (!event) {
    return NextResponse.json({ error: "not_found" }, { status: 404 });
  }

  // Access control: venue owner or admin can see all details, artists can see if they're part of the event
  const isVenueOwner = user.venue && event.venueId === user.venue.id;
  const isEventArtist = user.artist && event.eventArtists.some(ea => ea.artistId === user.artist?.id);
  const isAdmin = user.role === "ADMIN";

  if (!isVenueOwner && !isEventArtist && !isAdmin) {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }

  return NextResponse.json({ event });
}

/**
 * PATCH /api/events/[id]
 * Update event details (venue owner only)
 */
export async function PATCH(req: Request, { params }: { params: { id: string } }) {
  const { id } = await params;

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

  const event = await prisma.event.findUnique({
    where: { id },
    select: { id: true, venueId: true, slug: true }
  });

  if (!event) {
    return NextResponse.json({ error: "not_found" }, { status: 404 });
  }

  if (event.venueId !== user.venue.id) {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }

  const body = await req.json().catch(() => ({}));
  const {
    title,
    description,
    eventDate,
    endDate,
    hours,
    budget,
    status
  } = body;

  const updateData: any = {};

  if (title !== undefined) updateData.title = String(title);
  if (description !== undefined) updateData.description = description ? String(description) : null;
  if (hours !== undefined) updateData.hours = hours && !isNaN(Number(hours)) ? Number(hours) : null;
  if (budget !== undefined) updateData.budget = budget && !isNaN(Number(budget)) ? Number(budget) : null;
  
  if (status !== undefined && ["DRAFT", "PUBLISHED", "CANCELLED", "COMPLETED"].includes(status)) {
    updateData.status = status;
  }

  // Handle date updates
  if (eventDate !== undefined) {
    try {
      const parsedEventDate = new Date(eventDate);
      if (Number.isNaN(parsedEventDate.getTime())) {
        throw new Error("Invalid event date");
      }
      updateData.eventDate = parsedEventDate;
    } catch (e) {
      return NextResponse.json({ 
        error: "validation_error",
        message: "Invalid event date format" 
      }, { status: 400 });
    }
  }

  if (endDate !== undefined) {
    if (endDate) {
      try {
        const parsedEndDate = new Date(endDate);
        if (Number.isNaN(parsedEndDate.getTime())) {
          throw new Error("Invalid end date");
        }
        updateData.endDate = parsedEndDate;
      } catch (e) {
        return NextResponse.json({ 
          error: "validation_error",
          message: "Invalid end date format" 
        }, { status: 400 });
      }
    } else {
      updateData.endDate = null;
    }
  }

  // Update slug if title changed
  if (title !== undefined) {
    let slug = String(title)
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9\s-]/g, "")
      .replace(/\s+/g, "-")
      .replace(/-+/g, "-");

    // Only update slug if it's different and ensure uniqueness
    if (slug !== event.slug) {
      let slugCounter = 1;
      let finalSlug = slug;
      while (await prisma.event.findUnique({ where: { slug: finalSlug } })) {
        finalSlug = `${slug}-${slugCounter}`;
        slugCounter++;
      }
      updateData.slug = finalSlug;
    }
  }

  const updatedEvent = await prisma.event.update({
    where: { id },
    data: updateData,
    include: {
      eventArtists: {
        include: {
          artist: { select: { id: true, name: true, slug: true } }
        }
      }
    }
  });

  return NextResponse.json({ event: updatedEvent });
}

/**
 * DELETE /api/events/[id]
 * Delete event (venue owner only)
 */
export async function DELETE(_req: Request, { params }: { params: { id: string } }) {
  const { id } = await params;

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

  const event = await prisma.event.findUnique({
    where: { id },
    select: { id: true, venueId: true }
  });

  if (!event) {
    return NextResponse.json({ error: "not_found" }, { status: 404 });
  }

  if (event.venueId !== user.venue.id) {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }

  // Check if event has bookings
  const bookingsCount = await prisma.booking.count({
    where: { eventId: id }
  });

  if (bookingsCount > 0) {
    return NextResponse.json({ 
      error: "validation_error",
      message: "Cannot delete event with existing bookings" 
    }, { status: 400 });
  }

  await prisma.event.delete({ where: { id } });

  return NextResponse.json({ ok: true });
}