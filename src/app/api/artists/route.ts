import { NextResponse } from "next/server";
import { verifyIdToken } from "@/lib/auth/cognito";
import { prisma } from "@/lib/prisma";
import { cookies } from "next/headers";

/**
 * GET /api/artists
 * Search artists
 */
export async function GET(req: Request) {
  const jar = await cookies();
  const idToken = jar.get("id_token")?.value;
  if (!idToken) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const payload = await verifyIdToken(idToken).catch(() => null);
  const email = payload?.email ? String(payload.email) : null;
  if (!email) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const user = await prisma.user.findUnique({
    where: { email },
  });
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const search = searchParams.get("search");
  const limit = parseInt(searchParams.get("limit") || "20");

  let whereClause: Record<string, unknown> = {};

  if (search) {
    whereClause = {
      OR: [
        { name: { contains: search, mode: "insensitive" } },
        { city: { contains: search, mode: "insensitive" } },
        { genres: { has: search } },
      ]
    };
  }

  const artists = await prisma.artist.findMany({
    where: whereClause,
    select: {
      id: true,
      name: true,
      slug: true,
      city: true,
      genres: true,
      rate: true,
      imageUrl: true,
    },
    take: limit,
    orderBy: {
      name: "asc"
    }
  });

  return NextResponse.json({ artists });
}