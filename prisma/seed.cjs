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

async function main() {
  // Dev reset (order matters due to FKs)
  await prisma.booking.deleteMany();
  await prisma.artist.deleteMany();
  await prisma.venue.deleteMany();
  await prisma.user.deleteMany();

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

    await prisma.artist.create({
      data: {
        userId: user.id,
        name: a.name,
        slug: slugify(a.name),
        city: a.city,
        genres: a.genres,
        rate: a.rate,
        imageUrl: a.imageUrl,
        bio: a.bio,
      },
    });
  }

  console.log("✅ Seeded artists");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());