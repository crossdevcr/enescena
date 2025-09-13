import { hasArtistConflict, DEFAULT_DURATION_HOURS } from "./conflicts";

// We’ll mock Prisma for pure unit tests
vi.mock("@/lib/prisma", () => ({
  prisma: {
    booking: {
      findMany: vi.fn().mockResolvedValue([]),
    },
    artistUnavailability: {
      findMany: vi.fn().mockResolvedValue([]),
    },
  },
}));

const { prisma } = await import("@/lib/prisma");

function dateAt(h: number, m = 0) {
  const d = new Date("2025-09-12T00:00:00.000Z");
  d.setUTCHours(h, m, 0, 0);
  return d;
}

describe("hasArtistConflict", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns false when no bookings and no blackouts", async () => {
    (prisma.booking.findMany as any).mockResolvedValueOnce([]);
    (prisma.artistUnavailability.findMany as any).mockResolvedValueOnce([]);
    const res = await hasArtistConflict({
      artistId: "a1",
      start: dateAt(18),
      hours: 2,
    });
    expect(res).toBe(false);
  });

  it("detects overlap with an accepted booking", async () => {
    (prisma.booking.findMany as any).mockResolvedValueOnce([
      { eventDate: dateAt(19), hours: 1 },
    ]);
    (prisma.artistUnavailability.findMany as any).mockResolvedValueOnce([]);

    const res = await hasArtistConflict({
      artistId: "a1",
      start: dateAt(18, 30), // 18:30–20:30 (2h default if omitted)
      hours: 2,
    });
    expect(res).toBe(true);
  });

  it("detects overlap with a blackout", async () => {
    (prisma.booking.findMany as any).mockResolvedValueOnce([]);
    (prisma.artistUnavailability.findMany as any).mockResolvedValueOnce([
      { start: dateAt(20), end: dateAt(22) },
    ]);

    const res = await hasArtistConflict({
      artistId: "a1",
      start: dateAt(21), // 21–23 overlaps 20–22
      hours: 2,
    });
    expect(res).toBe(true);
  });

  it("uses default duration when hours omitted", async () => {
    (prisma.booking.findMany as any).mockResolvedValueOnce([
      { eventDate: dateAt(19), hours: 1 },
    ]);
    (prisma.artistUnavailability.findMany as any).mockResolvedValueOnce([]);

    const res = await hasArtistConflict({
      artistId: "a1",
      start: dateAt(18),
      // hours omitted -> DEFAULT_DURATION_HOURS
    });
    expect(DEFAULT_DURATION_HOURS).toBeGreaterThan(0);
    expect(res).toBe(true);
  });
});