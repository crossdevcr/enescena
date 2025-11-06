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
  await prisma.eventArtist.deleteMany();
  await prisma.booking.deleteMany();
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
        hours: 3,
        budget: 75000,
        status: "PUBLISHED",
        artists: [
          { artistId: artists[0].id, fee: 30000, hours: 1.5, confirmed: true },
          { artistId: artists[1].id, fee: 25000, hours: 1.5, confirmed: false },
        ],
      },
      {
        title: "New Year's Celebration",
        description: "Welcome 2026 with amazing live music and entertainment.",
        eventDate: new Date("2025-12-31T21:00:00"),
        endDate: new Date("2026-01-01T02:00:00"),
        hours: 5,
        budget: 120000,
        status: "DRAFT",
        artists: [
          { artistId: artists[0].id, fee: 40000, hours: 2, confirmed: false },
        ],
      },
    ];

    for (const eventData of seedEvents) {
      const eventSlug = await ensureUniqueEventSlug(slugify(eventData.title));
      
      const event = await prisma.event.create({
        data: {
          venueId: venue.id,
          title: eventData.title,
          slug: eventSlug,
          description: eventData.description,
          eventDate: eventData.eventDate,
          endDate: eventData.endDate,
          hours: eventData.hours,
          budget: eventData.budget,
          status: eventData.status,
        },
      });

      // Create EventArtist relationships
      for (const eventArtist of eventData.artists) {
        await prisma.eventArtist.create({
          data: {
            eventId: event.id,
            artistId: eventArtist.artistId,
            fee: eventArtist.fee,
            hours: eventArtist.hours,
            confirmed: eventArtist.confirmed,
          },
        });
      }

      // Create some sample bookings linked to events
      if (eventData.status === "PUBLISHED") {
        for (const eventArtist of eventData.artists) {
          if (eventArtist.confirmed) {
            await prisma.booking.create({
              data: {
                artistId: eventArtist.artistId,
                venueId: venue.id,
                eventId: event.id,
                eventDate: eventData.eventDate,
                hours: eventArtist.hours,
                status: "ACCEPTED",
                note: `Booking for ${eventData.title}`,
              },
            });
          }
        }
      }
    }
    console.log("✅ Seeded events and event bookings");

    // Create some individual bookings (not linked to events)
    if (artists.length > 0) {
      await prisma.booking.create({
        data: {
          artistId: artists[0].id,
          venueId: venue.id,
          eventDate: new Date("2025-11-20T19:00:00"),
          hours: 2,
          status: "PENDING",
          note: "Individual booking request for private event",
        },
      });
      console.log("✅ Seeded individual bookings");
    }
  }
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());