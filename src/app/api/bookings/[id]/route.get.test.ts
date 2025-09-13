import { describe, it, expect, vi, beforeEach } from "vitest";

// We’ll toggle cookie presence per test
let hasToken = true;

// ─── Mocks (must be defined BEFORE importing the route) ───────────────────────
vi.mock("next/headers", () => ({
  cookies: () => ({
    get: (k: string) => (hasToken && k === "id_token" ? { value: "jwt" } : undefined),
  }),
}));

vi.mock("@/lib/auth/cognito", () => ({
  verifyIdToken: vi.fn().mockResolvedValue({ email: "user@example.com" }),
}));

vi.mock("@/lib/prisma", () => ({
  prisma: {
    user: { findUnique: vi.fn() },
    booking: { findUnique: vi.fn() },
  },
}));

// Import after mocks
const { prisma } = await import("@/lib/prisma");
const { GET } = await import("./route");

beforeEach(() => {
  vi.clearAllMocks();
  hasToken = true;
});

describe("GET /api/bookings/[id]", () => {
  it("returns 401 when no id_token cookie", async () => {
    hasToken = false;
    const res = await GET(new Request("http://x/api/bookings/b1"), { params: { id: "b1" } as any });
    expect(res.status).toBe(401);
  });

  it("returns 401 when user lookup fails", async () => {
    (prisma.user.findUnique as any).mockResolvedValue(null);
    const res = await GET(new Request("http://x/api/bookings/b1"), { params: { id: "b1" } as any });
    expect(res.status).toBe(401);
  });

  it("returns 404 when booking not found", async () => {
    (prisma.user.findUnique as any).mockResolvedValue({
      id: "u1",
      email: "user@example.com",
      role: "VENUE",
      venue: { id: "v1" },
      artist: null,
    });
    (prisma.booking.findUnique as any).mockResolvedValue(null);

    const res = await GET(new Request("http://x/api/bookings/missing"), { params: { id: "missing" } as any });
    expect(res.status).toBe(404);
  });

  it("returns 403 when user is neither the venue nor the artist owner", async () => {
    (prisma.user.findUnique as any).mockResolvedValue({
      id: "u1",
      email: "user@example.com",
      role: "VENUE",
      venue: { id: "v1" }, // my venue
      artist: null,
    });
    (prisma.booking.findUnique as any).mockResolvedValue({
      id: "b1",
      status: "PENDING",
      eventDate: new Date(),
      hours: 2,
      note: null,
      createdAt: new Date(),
      updatedAt: new Date(),
      artistId: "a9",
      venueId: "v9", // different venue than mine
      artist: { id: "a9", name: "Artist Z", slug: "artist-z", user: { email: "a@x.com", name: "AZ" } },
      venue: { id: "v9", name: "Venue Z", slug: "venue-z", user: { email: "v@x.com", name: "VZ" } },
    });

    const res = await GET(new Request("http://x/api/bookings/b1"), { params: { id: "b1" } as any });
    expect(res.status).toBe(403);
  });

  it("returns 200 when venue owns the booking", async () => {
    (prisma.user.findUnique as any).mockResolvedValue({
      id: "u1",
      email: "user@example.com",
      role: "VENUE",
      venue: { id: "v1" },
      artist: null,
    });
    (prisma.booking.findUnique as any).mockResolvedValue({
      id: "b1",
      status: "PENDING",
      eventDate: new Date(),
      hours: 2,
      note: null,
      createdAt: new Date(),
      updatedAt: new Date(),
      artistId: "a1",
      venueId: "v1", // matches my venue
      artist: { id: "a1", name: "Artist A", slug: "artist-a", user: { email: "a@x.com", name: "Artist A" } },
      venue: { id: "v1", name: "Venue V", slug: "venue-v", user: { email: "v@x.com", name: "Venue V" } },
    });

    const res = await GET(new Request("http://x/api/bookings/b1"), { params: { id: "b1" } as any });
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.ok).toBe(true);
    expect(json.booking.id).toBe("b1");
    expect(json.booking.venueId).toBe("v1");
  });

  it("returns 200 when artist owns the booking", async () => {
    (prisma.user.findUnique as any).mockResolvedValue({
      id: "u2",
      email: "user@example.com",
      role: "ARTIST",
      artist: { id: "a1" },
      venue: null,
    });
    (prisma.booking.findUnique as any).mockResolvedValue({
      id: "b2",
      status: "PENDING",
      eventDate: new Date(),
      hours: 1,
      note: null,
      createdAt: new Date(),
      updatedAt: new Date(),
      artistId: "a1", // matches my artist
      venueId: "v9",
      artist: { id: "a1", name: "Artist A", slug: "artist-a", user: { email: "a@x.com", name: "Artist A" } },
      venue: { id: "v9", name: "Venue Z", slug: "venue-z", user: { email: "v@x.com", name: "Venue Z" } },
    });

    const res = await GET(new Request("http://x/api/bookings/b2"), { params: { id: "b2" } as any });
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.ok).toBe(true);
    expect(json.booking.id).toBe("b2");
    expect(json.booking.artistId).toBe("a1");
  });
});