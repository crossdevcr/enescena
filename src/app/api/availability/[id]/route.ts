import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { verifyIdToken } from "@/lib/auth/cognito";
import { prisma } from "@/lib/prisma";

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

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

  // Ensure this block belongs to this artist
  const block = await prisma.artistUnavailability.findUnique({
    where: { id },
    select: { id: true, artistId: true },
  });
  if (!block) return NextResponse.json({ error: "not_found" }, { status: 404 });
  if (block.artistId !== me.artist.id) {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }

  await prisma.artistUnavailability.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}