import { NextResponse } from "next/server";
import { getTokens } from "@/lib/auth/cookies";
import { verifyIdToken } from "@/lib/auth/cognito";
import { prisma } from "@/lib/prisma";
import { slugify, parseGenres } from "@/lib/text";

export async function POST(req: Request) {
  // identify current user
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
  if (!name) return NextResponse.json({ error: "name_required" }, { status: 400 });

  const city = (body.city ?? "").toString().trim() || null;
  const genres = parseGenres((body.genres ?? "").toString());
  const rate = body.rate != null ? Number(body.rate) : null;
  const bio = (body.bio ?? "").toString().trim() || null;

  const data = {
    userId: user.id,
    name,
    slug: slugify(name),
    city,
    genres,
    rate: rate && !Number.isNaN(rate) ? rate : null,
    bio,
  };

  // create or update
  const existing = await prisma.artist.findUnique({ where: { userId: user.id } });
  const artist = existing
    ? await prisma.artist.update({ where: { userId: user.id }, data })
    : await prisma.artist.create({ data });

  return NextResponse.json({ ok: true, artist });
}