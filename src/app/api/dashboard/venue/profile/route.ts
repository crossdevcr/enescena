import { NextResponse } from "next/server";
import { verifyIdToken } from "@/lib/auth/cognito";
import { prisma } from "@/lib/prisma";
import { slugify } from "@/lib/text";

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
  if (!name) return NextResponse.json({ error: "name_required" }, { status: 400 });

  const city = (body.city ?? "").toString().trim() || null;
  const address = (body.address ?? "").toString().trim() || null;
  const about = (body.about ?? "").toString().trim() || null;

  const data = {
    userId: user.id,
    name,
    slug: slugify(name),
    city,
    address,
    about,
  };

  const existing = await prisma.venue.findUnique({ where: { userId: user.id } });
  const venue = existing
    ? await prisma.venue.update({ where: { userId: user.id }, data })
    : await prisma.venue.create({ data });

  return NextResponse.json({ ok: true, venue });
}