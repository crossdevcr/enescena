import { prisma } from "@/lib/prisma";

export async function getArtists(limit = 50) {
  return prisma.artist.findMany({
    take: limit,
    orderBy: { createdAt: "desc" },
  });
}

export async function getArtistBySlug(slug: string) {
  return prisma.artist.findUnique({
    where: { slug },
    select: {
      id: true, name: true, slug: true, city: true, genres: true, rate: true, bio: true, imageUrl: true
    }
  });
}