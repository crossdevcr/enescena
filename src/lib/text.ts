export function slugify(s: string) {
  return s
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-");
}

export function parseGenres(input: string) {
  return input
    .split(",")
    .map((g) => g.trim())
    .filter(Boolean);
}

type PrismaClient = {
  artist: {
    findUnique: (args: { where: { slug: string } }) => Promise<unknown>;
  };
  venue: {
    findUnique: (args: { where: { slug: string } }) => Promise<unknown>;
  };
};

export async function ensureUniqueArtistSlug(base: string, prisma: PrismaClient) {
  let slug = base, i = 1;
  while (await prisma.artist.findUnique({ where: { slug } })) {
    slug = `${base}-${++i}`;
  }
  return slug;
}

export async function ensureUniqueVenueSlug(base: string, prisma: PrismaClient) {
  let slug = base, i = 1;
  while (await prisma.venue.findUnique({ where: { slug } })) {
    slug = `${base}-${++i}`;
  }
  return slug;
}