import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { verifyIdToken } from "@/lib/auth/cognito";
import { cookies } from "next/headers";

// Allowed transitions (MVP): Artist can ACCEPT or DECLINE a PENDING booking
const ALLOWED_ACTIONS = new Set(["ACCEPT", "DECLINE"] as const);
type Action = "ACCEPT" | "DECLINE";

export async function PATCH(
  req: Request,
  { params }: { params: { id: string } }
) {
  const id = params.id;

  // Auth
  const jar = await cookies();
  const idToken = jar.get("id_token")?.value;
  if (!idToken) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const payload = await verifyIdToken(idToken).catch(() => null);
  const email = payload?.email ? String(payload.email) : null;
  if (!email) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const me = await prisma.user.findUnique({
    where: { email },
    include: { artist: true, venue: true },
  });
  if (!me || me.role !== "ARTIST" || !me.artist) {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }

  // Load booking and ensure it belongs to this artist
  const booking = await prisma.booking.findUnique({
    where: { id },
    select: { id: true, status: true, artistId: true },
  });
  if (!booking) return NextResponse.json({ error: "not_found" }, { status: 404 });
  if (booking.artistId !== me.artist.id) {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }
  if (booking.status !== "PENDING") {
    return NextResponse.json({ error: "invalid_state" }, { status: 400 });
  }

  // Parse action
  const body = await req.json().catch(() => ({}));
  const action: Action | undefined = body?.action;
  if (!action || !ALLOWED_ACTIONS.has(action)) {
    return NextResponse.json({ error: "invalid_action" }, { status: 400 });
  }

  const nextStatus = action === "ACCEPT" ? "ACCEPTED" : "DECLINED";

  const updated = await prisma.booking.update({
    where: { id },
    data: { status: nextStatus },
    select: { id: true, status: true },
  });

  return NextResponse.json({ ok: true, booking: updated });
}