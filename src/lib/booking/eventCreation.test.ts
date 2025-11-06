import { describe, it, expect, beforeEach, vi } from "vitest";
import { createEventForBooking } from "@/lib/booking/eventCreation";
import { prisma } from "@/lib/prisma";

// Mock Prisma
vi.mock("@/lib/prisma", () => ({
  prisma: {
    booking: {
      findUnique: vi.fn(),
      update: vi.fn(),
    },
    event: {
      findUnique: vi.fn(),
      create: vi.fn(),
    },
    eventArtist: {
      create: vi.fn(),
    },
  },
}));

describe("createEventForBooking", () => {
  const mockBooking = {
    id: "booking1",
    eventId: null,
    eventDate: new Date("2025-12-01T20:00:00Z"),
    hours: 3,
    note: "Great show expected",
    artistId: "artist1",
    venueId: "venue1",
    artist: { name: "Test Artist" },
    venue: { name: "Test Venue" },
  };

  const mockEvent = {
    id: "event1",
    title: "Test Artist at Test Venue",
    slug: "test-artist-at-test-venue",
    venueId: "venue1",
    eventDate: mockBooking.eventDate,
    endDate: new Date(mockBooking.eventDate.getTime() + 3 * 60 * 60 * 1000),
    hours: 3,
    status: "PUBLISHED",
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should create event for booking without existing event", async () => {
    // Mock booking lookup
    vi.mocked(prisma.booking.findUnique).mockResolvedValue(mockBooking as any);
    
    // Mock no existing slug conflicts
    vi.mocked(prisma.event.findUnique).mockResolvedValue(null);
    
    // Mock event creation
    vi.mocked(prisma.event.create).mockResolvedValue(mockEvent as any);
    
    // Mock event-artist creation
    vi.mocked(prisma.eventArtist.create).mockResolvedValue({
      id: "ea1",
      eventId: "event1",
      artistId: "artist1",
      confirmed: true,
    } as any);

    // Mock booking update
    vi.mocked(prisma.booking.update).mockResolvedValue({
      ...mockBooking,
      eventId: "event1",
    } as any);

    const result = await createEventForBooking("booking1");

    expect(result).toBe("event1");
    
    expect(prisma.event.create).toHaveBeenCalledWith({
      data: {
        venueId: "venue1",
        title: "Test Artist at Test Venue",
        slug: "test-artist-at-test-venue",
        description: "Great show expected",
        eventDate: mockBooking.eventDate,
        endDate: expect.any(Date),
        hours: 3,
        status: "PUBLISHED",
      },
    });

    expect(prisma.eventArtist.create).toHaveBeenCalledWith({
      data: {
        eventId: "event1",
        artistId: "artist1",
        fee: null,
        hours: 3,
        confirmed: true,
      },
    });

    expect(prisma.booking.update).toHaveBeenCalledWith({
      where: { id: "booking1" },
      data: { eventId: "event1" },
    });
  });

  it("should return existing eventId if booking already has one", async () => {
    const bookingWithEvent = {
      ...mockBooking,
      eventId: "existing-event",
    };

    vi.mocked(prisma.booking.findUnique).mockResolvedValue(bookingWithEvent as any);

    const result = await createEventForBooking("booking1");

    expect(result).toBe("existing-event");
    expect(prisma.event.create).not.toHaveBeenCalled();
  });

  it("should throw error if booking not found", async () => {
    vi.mocked(prisma.booking.findUnique).mockResolvedValue(null);

    await expect(createEventForBooking("nonexistent")).rejects.toThrow("Booking not found");
  });

  it("should handle slug conflicts by adding suffix", async () => {
    vi.mocked(prisma.booking.findUnique).mockResolvedValue(mockBooking as any);
    
    // Mock slug conflict resolution
    vi.mocked(prisma.event.findUnique)
      .mockResolvedValueOnce({ id: "other-event" } as any) // First slug taken
      .mockResolvedValueOnce(null); // Second slug available

    vi.mocked(prisma.event.create).mockResolvedValue({
      ...mockEvent,
      slug: "test-artist-at-test-venue-1",
    } as any);

    vi.mocked(prisma.eventArtist.create).mockResolvedValue({} as any);
    vi.mocked(prisma.booking.update).mockResolvedValue({} as any);

    await createEventForBooking("booking1");

    expect(prisma.event.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        slug: "test-artist-at-test-venue-1",
      }),
    });
  });

  it("should handle bookings with null hours and notes", async () => {
    const bookingWithNulls = {
      ...mockBooking,
      hours: null,
      note: null,
    };

    vi.mocked(prisma.booking.findUnique).mockResolvedValue(bookingWithNulls as any);
    vi.mocked(prisma.event.findUnique).mockResolvedValue(null);
    vi.mocked(prisma.event.create).mockResolvedValue(mockEvent as any);
    vi.mocked(prisma.eventArtist.create).mockResolvedValue({} as any);
    vi.mocked(prisma.booking.update).mockResolvedValue({} as any);

    await createEventForBooking("booking1");

    expect(prisma.event.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        description: "Performance by Test Artist",
        endDate: null,
        hours: null,
      }),
    });

    expect(prisma.eventArtist.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        hours: null,
      }),
    });
  });
});