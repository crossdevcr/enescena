import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { verifyIdToken } from "@/lib/auth/cognito";
import { prisma } from "@/lib/prisma";

export async function POST(req: Request) {
  const jar = await cookies();
  const idToken = jar.get("id_token")?.value;
  if (!idToken) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const payload = await verifyIdToken(idToken).catch(() => null);
  const email = payload?.email ? String(payload.email) : null;
  if (!email) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const me = await prisma.user.findUnique({
    where: { email },
    include: { artist: true },
  });
  if (!me || me.role !== "ARTIST" || !me.artist) {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }

  const body = await req.json().catch(() => ({}));
  const startStr = String(body.start || "");
  const endStr = String(body.end || "");
  const reason = (body.reason || "").toString().trim() || null;

  const start = new Date(startStr);
  const end = new Date(endStr);
  if (!startStr || !endStr || Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) {
    return NextResponse.json({ error: "invalid_datetime" }, { status: 400 });
  }
  if (end <= start) {
    return NextResponse.json({ error: "end_before_start" }, { status: 400 });
  }

  const created = await prisma.artistUnavailability.create({
    data: {
      artistId: me.artist.id,
      start,
      end,
      reason,
    },
    select: { id: true, start: true, end: true, reason: true },
  });

  return NextResponse.json({ ok: true, block: created }, { status: 201 });
}