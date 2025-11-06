import { NextResponse } from "next/server";
import { verifyIdToken } from "@/lib/auth/cognito";
import { prisma } from "@/lib/prisma";
import { cookies } from "next/headers";

/**
 * GET /api/events
 * List events for the authenticated venue
 */
export async function GET() {
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

  const events = await prisma.event.findMany({
    where: { venueId: user.venue.id },
    include: {
      eventArtists: {
        include: {
          artist: { select: { id: true, name: true, slug: true } }
        },
        orderBy: { createdAt: "asc" }
      },
      _count: {
        select: { bookings: true }
      }
    },
    orderBy: { eventDate: "desc" },
  });

  return NextResponse.json({ events });
}

/**
 * POST /api/events
 * Create a new event for the authenticated venue
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
    include: { venue: true },
  });
  if (!user || user.role !== "VENUE" || !user.venue) {
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
    status = "DRAFT"
  } = body;

  if (!title || !eventDate) {
    return NextResponse.json({ 
      error: "validation_error",
      message: "Title and event date are required" 
    }, { status: 400 });
  }

  // Parse dates
  let parsedEventDate: Date;
  let parsedEndDate: Date | null = null;

  try {
    parsedEventDate = new Date(eventDate);
    if (Number.isNaN(parsedEventDate.getTime())) {
      throw new Error("Invalid event date");
    }

    if (endDate) {
      parsedEndDate = new Date(endDate);
      if (Number.isNaN(parsedEndDate.getTime())) {
        throw new Error("Invalid end date");
      }
    }
  } catch (e) {
    return NextResponse.json({ 
      error: "validation_error",
      message: "Invalid date format" 
    }, { status: 400 });
  }

  // Generate unique slug
  let slug = title
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

  const event = await prisma.event.create({
    data: {
      venueId: user.venue.id,
      title: String(title),
      slug: finalSlug,
      description: description ? String(description) : null,
      eventDate: parsedEventDate,
      endDate: parsedEndDate,
      hours: hours && !isNaN(Number(hours)) ? Number(hours) : null,
      budget: budget && !isNaN(Number(budget)) ? Number(budget) : null,
      status: ["DRAFT", "PUBLISHED", "CANCELLED", "COMPLETED"].includes(status) ? status : "DRAFT",
    },
    include: {
      eventArtists: {
        include: {
          artist: { select: { id: true, name: true, slug: true } }
        }
      }
    }
  });

  return NextResponse.json({ event });
}