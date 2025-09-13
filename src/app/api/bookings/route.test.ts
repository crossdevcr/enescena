import { describe, it, expect, vi, beforeEach } from "vitest";

// --- Mock deps BEFORE importing the route ---
vi.mock("next/headers", () => ({
  cookies: () => ({
    get: (k: string) => (k === "id_token" ? { value: "jwt" } : undefined),
  }),
}));

vi.mock("@/lib/auth/cognito", () => ({
  verifyIdToken: vi.fn().mockResolvedValue({ email: "venue@example.com" }),
}));

vi.mock("@/lib/prisma", () => ({
  prisma: {
    user: {
      findUnique: vi.fn().mockResolvedValue({
        id: "u1",
        role: "VENUE",
        venue: { id: "v1" }, // has venue profile
      }),
    },
    artist: {
      findUnique: vi.fn().mockResolvedValue({ id: "a1", name: "Artist A" }),
    },
    booking: {
      create: vi.fn().mockResolvedValue({
        id: "b1",
        eventDate: new Date("2025-09-12T20:00:00.000Z"),
        hours: 2,
        artist: {
          name: "Artist A",
          slug: "artist-a",
          user: { email: "artist@example.com", name: "Artist A" },
        },
        venue: { name: "Venue V" },
      }),
      // not used by route, but harmless to have:
      findMany: vi.fn(),
    },
    artistUnavailability: { findMany: vi.fn() },
  },
}));

// ✅ Explicitly mock the conflicts module so route never calls the real one
const hasArtistConflict = vi.fn();
vi.mock("@/lib/booking/conflicts", () => ({
  hasArtistConflict,
}));

vi.mock("@/lib/email/mailer", () => ({
  sendEmail: vi.fn().mockResolvedValue({ ok: true }),
}));

// Import the route AFTER mocks
const { POST } = await import("./route");

beforeEach(() => {
  vi.clearAllMocks();
});

describe("POST /api/bookings", () => {
  it("returns 409 when conflict", async () => {
    hasArtistConflict.mockResolvedValueOnce(true);

    const req = new Request("http://localhost/api/bookings", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        artistId: "a1",
        eventDate: "2025-09-12T20:00:00.000Z",
        hours: 2,
      }),
    });

    const res = await POST(req);
    expect(res.status).toBe(409);
    const data = await res.json();
    expect(data.error).toBe("artist_unavailable");
  });

  it("returns 200 and creates booking when no conflict", async () => {
    hasArtistConflict.mockResolvedValueOnce(false);

    const req = new Request("http://localhost/api/bookings", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        artistId: "a1",
        eventDate: "2025-09-12T22:00:00.000Z",
        hours: 1,
      }),
    });

    const res = await POST(req);
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.ok).toBe(true);
    expect(data.booking.id).toBe("b1");
  });
});