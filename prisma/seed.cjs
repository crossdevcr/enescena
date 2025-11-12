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
async function ensureUniqueEventSlug(base) {
  let slug = base, i = 1;
  while (await prisma.event.findUnique({ where: { slug } })) {
    slug = `${base}-${++i}`;
  }
  return slug;
}

async function main() {
  // Dev reset (order matters due to FKs)
  await prisma.performance.deleteMany();
  await prisma.event.deleteMany();
  await prisma.artistUnavailability.deleteMany();
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

  const venue = await prisma.venue.upsert({
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

  // --- Sample Events ---
  const artists = await prisma.artist.findMany();
  
  if (artists.length >= 2) {
    const seedEvents = [
      {
        title: "Blues & Rock Night",
        description: "An evening of blues and rock music featuring multiple talented artists.",
        eventDate: new Date("2025-12-15T20:00:00"),
        endDate: new Date("2025-12-15T23:00:00"),
        totalHours: 3,
        totalBudget: 75000,
        status: "PUBLISHED",
        createdBy: venueUser.id, // Venue creates this event
        performances: [
          { artistId: artists[0].id, agreedFee: 30000, hours: 1.5, status: "CONFIRMED" },
          { artistId: artists[1].id, proposedFee: 25000, hours: 1.5, status: "PENDING" },
        ],
      },
      {
        title: "New Year's Celebration",
        description: "Welcome 2026 with amazing live music and entertainment.",
        eventDate: new Date("2025-12-31T21:00:00"),
        endDate: new Date("2026-01-01T02:00:00"),
        totalHours: 5,
        totalBudget: 120000,
        status: "SEEKING_ARTISTS",
        createdBy: venueUser.id,
        performances: [
          { artistId: artists[0].id, proposedFee: 40000, hours: 2, status: "PENDING" },
        ],
      },
      {
        title: "Acoustic Coffee Session",
        description: "Intimate acoustic performance at a cozy coffee shop.",
        eventDate: new Date("2025-11-25T15:00:00"),
        totalHours: 2,
        status: "CONFIRMED",
        createdBy: artists[0].userId, // Artist creates this event
        // External venue (not in system)
        externalVenueName: "Blue Moon Coffee",
        externalVenueAddress: "123 Coffee St, San José",
        externalVenueCity: "San José, CR",
        performances: [
          { artistId: artists[0].id, agreedFee: 15000, hours: 2, status: "CONFIRMED" },
        ],
      },
    ];

    for (const eventData of seedEvents) {
      const eventSlug = await ensureUniqueEventSlug(slugify(eventData.title));
      
      const event = await prisma.event.create({
        data: {
          createdBy: eventData.createdBy,
          venueId: eventData.externalVenueName ? null : venue.id, // Only link if internal venue
          externalVenueName: eventData.externalVenueName,
          externalVenueAddress: eventData.externalVenueAddress,
          externalVenueCity: eventData.externalVenueCity,
          title: eventData.title,
          slug: eventSlug,
          description: eventData.description,
          eventDate: eventData.eventDate,
          endDate: eventData.endDate,
          totalHours: eventData.totalHours,
          totalBudget: eventData.totalBudget,
          status: eventData.status,
        },
      });

      // Create Performance relationships (replaces EventArtist)
      for (const performanceData of eventData.performances) {
        await prisma.performance.create({
          data: {
            eventId: event.id,
            artistId: performanceData.artistId,
            agreedFee: performanceData.agreedFee,
            proposedFee: performanceData.proposedFee,
            hours: performanceData.hours,
            status: performanceData.status,
            notes: `Performance for ${eventData.title}`,
          },
        });
      }
    }
    console.log("✅ Seeded events and performances");
  }
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());