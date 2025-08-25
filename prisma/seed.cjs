const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

function slugify(s) {
  return s
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-");
}

// Simple unique slug helper for seeding (adds -2, -3, ...)
async function ensureUniqueArtistSlug(base) {
  let slug = base, i = 1;
  while (await prisma.artist.findUnique({ where: { slug } })) {
    slug = `${base}-${++i}`;
  }
  return slug;
}
async function ensureUniqueVenueSlug(base) {
  let slug = base, i = 1;
  while (await prisma.venue.findUnique({ where: { slug } })) {
    slug = `${base}-${++i}`;
  }
  return slug;
}

async function main() {
  // Dev reset (order matters due to FKs)
  await prisma.booking.deleteMany();
  await prisma.artist.deleteMany();
  await prisma.venue.deleteMany();
  await prisma.user.deleteMany();

  // --- Artists ---
  const seedArtists = [
    {
      name: "Stevie Ray Tribute",
      email: "stevie-tribute@example.com",
      city: "San José, CR",
      genres: ["Blues", "Rock"],
      rate: 25000,
      imageUrl: "",
      bio: "Power-trio blues rock show. 90 or 120 min sets.",
    },
    {
      name: "Acoustic Duo Luna",
      email: "duo-luna@example.com",
      city: "Heredia, CR",
      genres: ["Acoustic", "Pop"],
      rate: 18000,
      imageUrl: "",
      bio: "Romantic acoustic covers for weddings and lounges.",
    },
  ];

  for (const a of seedArtists) {
    const user = await prisma.user.create({
      data: { email: a.email, name: a.name, role: "ARTIST" },
    });

    const base = slugify(a.name);
    const unique = await ensureUniqueArtistSlug(base);

    await prisma.artist.create({
      data: {
        userId: user.id,
        name: a.name,
        slug: unique,
        city: a.city,
        genres: a.genres,
        rate: a.rate,
        imageUrl: a.imageUrl,
        bio: a.bio,
      },
    });
  }
  console.log("✅ Seeded artists");

  // --- Sample Venue user + profile (idempotent via upsert) ---
  const venueUser = await prisma.user.upsert({
    where: { email: "venue@example.com" },
    update: { name: "Teatro Escena", role: "VENUE" },
    create: { email: "venue@example.com", name: "Teatro Escena", role: "VENUE" },
  });

  const venueBase = slugify("Teatro Escena");
  const venueUnique = await ensureUniqueVenueSlug(venueBase);

  await prisma.venue.upsert({
    where: { userId: venueUser.id },
    update: {
      name: "Teatro Escena",
      city: "San José, CR",
      address: "Av Central 123",
      about: "Downtown stage with great acoustics",
      // keep slug stable on update
    },
    create: {
      userId: venueUser.id,
      name: "Teatro Escena",
      slug: venueUnique,
      city: "San José, CR",
      address: "Av Central 123",
      about: "Downtown stage with great acoustics",
    },
  });
  console.log("✅ Seeded venue");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());