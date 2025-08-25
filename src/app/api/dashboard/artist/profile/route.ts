import { NextResponse } from "next/server";
import { verifyIdToken } from "@/lib/auth/cognito";
import { prisma } from "@/lib/prisma";
import { parseGenres, slugify, ensureUniqueArtistSlug } from "@/lib/text";

export async function POST(req: Request) {
  // Identify current user from id_token cookie
  const cookieHeader = req.headers.get("cookie") || "";
  const idToken = cookieHeader.match(/(?:^|;\s*)id_token=([^;]+)/)?.[1];
  const payload = idToken ? await verifyIdToken(idToken).catch(() => null) : null;
  const email = payload?.email ? String(payload.email) : null;
  if (!email) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const user = await prisma.user.findUnique({ where: { email } });
  if (!user || user.role !== "ARTIST") {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }

  const body = await req.json().catch(() => ({}));
  const name = (body.name ?? "").toString().trim();
  if (!name || name.length < 2) {
    return NextResponse.json({ error: "name_required" }, { status: 400 });
  }

  const city = (body.city ?? "").toString().trim() || null;
  const genres = parseGenres((body.genres ?? "").toString());
  const rateNum = body.rate != null ? Number(body.rate) : null;
  const rate =
    rateNum != null && !Number.isNaN(rateNum) && rateNum >= 0 ? rateNum : null;
  const bio = (body.bio ?? "").toString().trim() || null;

  const existing = await prisma.artist.findUnique({ where: { userId: user.id } });

  if (existing) {
    // Keep slug stable on updates
    const artist = await prisma.artist.update({
      where: { userId: user.id },
      data: { name, city, genres, rate, bio },
    });
    return NextResponse.json({ ok: true, artist });
  }

  // Create with unique slug
  const base = slugify(name);
  const unique = await ensureUniqueArtistSlug(base, prisma);
  const artist = await prisma.artist.create({
    data: { userId: user.id, name, slug: unique, city, genres, rate, bio },
  });
  return NextResponse.json({ ok: true, artist });
}