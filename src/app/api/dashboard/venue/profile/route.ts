import { NextResponse } from "next/server";
import { verifyIdToken } from "@/lib/auth/cognito";
import { prisma } from "@/lib/prisma";
import { slugify, ensureUniqueVenueSlug } from "@/lib/text";

export async function POST(req: Request) {
  const cookieHeader = req.headers.get("cookie") || "";
  const idToken = cookieHeader.match(/(?:^|;\s*)id_token=([^;]+)/)?.[1];
  const payload = idToken ? await verifyIdToken(idToken).catch(() => null) : null;
  const email = payload?.email ? String(payload.email) : null;
  if (!email) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const user = await prisma.user.findUnique({ where: { email } });
  if (!user || user.role !== "VENUE") {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }

  const body = await req.json().catch(() => ({}));
  const name = (body.name ?? "").toString().trim();
  if (!name || name.length < 2) {
    return NextResponse.json({ error: "name_required" }, { status: 400 });
  }

  const city = (body.city ?? "").toString().trim() || null;
  const address = (body.address ?? "").toString().trim() || null;
  const about = (body.about ?? "").toString().trim() || null;

  const existing = await prisma.venue.findUnique({ where: { userId: user.id } });

  if (existing) {
    // Keep slug stable on updates
    const venue = await prisma.venue.update({
      where: { userId: user.id },
      data: { name, city, address, about },
    });
    return NextResponse.json({ ok: true, venue });
  }

  // Create with unique slug
  const base = slugify(name);
  const unique = await ensureUniqueVenueSlug(base, prisma);
  const venue = await prisma.venue.create({
    data: { userId: user.id, name, slug: unique, city, address, about },
  });
  return NextResponse.json({ ok: true, venue });
}