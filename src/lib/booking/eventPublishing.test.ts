import { describe, it, expect, beforeEach, vi, Mock } from "vitest";
import { createBookingRequestsForEvent, cancelBookingRequestsForEvent } from "./eventPublishing";
import { prisma } from "@/lib/prisma";

// Mock prisma
vi.mock("@/lib/prisma", () => ({
  prisma: {
    event: {
      findUnique: vi.fn()
    },
    booking: {
      findFirst: vi.fn(),
      create: vi.fn(),
      updateMany: vi.fn()
    }
  }
}));

const mockPrisma = prisma as any;

describe("Event Publishing", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("createBookingRequestsForEvent", () => {
    const mockEvent = {
      id: "event-1",
      title: "Test Event",
      status: "PUBLISHED",
      eventDate: new Date("2025-12-01T20:00:00Z"),
      hours: 3,
      venueId: "venue-1",
      eventArtists: [
        {
          artistId: "artist-1",
          artist: { id: "artist-1", name: "Artist One", slug: "artist-one" },
          confirmed: false
        },
        {
          artistId: "artist-2", 
          artist: { id: "artist-2", name: "Artist Two", slug: "artist-two" },
          confirmed: false
        }
      ]
    };

    it("should create booking requests for unconfirmed artists when event is published", async () => {
      mockPrisma.event.findUnique.mockResolvedValue(mockEvent);
      mockPrisma.booking.findFirst.mockResolvedValue(null); // No existing bookings

      await createBookingRequestsForEvent("event-1");

      expect(mockPrisma.event.findUnique).toHaveBeenCalledWith({
        where: { id: "event-1" },
        include: {
          eventArtists: {
            where: { confirmed: false },
            include: {
              artist: { select: { id: true, name: true, slug: true } }
            }
          }
        }
      });

      expect(mockPrisma.booking.create).toHaveBeenCalledTimes(2);
      
      // Check first booking creation
      expect(mockPrisma.booking.create).toHaveBeenNthCalledWith(1, {
        data: {
          id: expect.stringMatching(/^b_\d+_[a-z0-9]+$/),
          eventDate: mockEvent.eventDate,
          hours: 3,
          note: "Booking request for event: Test Event",
          status: "PENDING",
          venueId: "venue-1",
          artistId: "artist-1",
          eventId: "event-1"
        }
      });

      // Check second booking creation  
      expect(mockPrisma.booking.create).toHaveBeenNthCalledWith(2, {
        data: {
          id: expect.stringMatching(/^b_\d+_[a-z0-9]+$/),
          eventDate: mockEvent.eventDate,
          hours: 3,
          note: "Booking request for event: Test Event", 
          status: "PENDING",
          venueId: "venue-1",
          artistId: "artist-2",
          eventId: "event-1"
        }
      });
    });

    it("should skip creating bookings for artists that already have bookings", async () => {
      mockPrisma.event.findUnique.mockResolvedValue(mockEvent);
      mockPrisma.booking.findFirst
        .mockResolvedValueOnce({ id: "existing-booking" }) // First artist has existing booking
        .mockResolvedValueOnce(null); // Second artist doesn't

      await createBookingRequestsForEvent("event-1");

      expect(mockPrisma.booking.create).toHaveBeenCalledTimes(1);
      expect(mockPrisma.booking.create).toHaveBeenCalledWith({
        data: {
          id: expect.stringMatching(/^b_\d+_[a-z0-9]+$/),
          eventDate: mockEvent.eventDate,
          hours: 3,
          note: "Booking request for event: Test Event",
          status: "PENDING",
          venueId: "venue-1",
          artistId: "artist-2",
          eventId: "event-1"
        }
      });
    });

    it("should throw error if event is not found", async () => {
      mockPrisma.event.findUnique.mockResolvedValue(null);

      await expect(createBookingRequestsForEvent("nonexistent")).rejects.toThrow("Event not found");
    });

    it("should throw error if event is not published", async () => {
      mockPrisma.event.findUnique.mockResolvedValue({
        ...mockEvent,
        status: "DRAFT"
      });

      await expect(createBookingRequestsForEvent("event-1")).rejects.toThrow("Event must be published to create booking requests");
    });

    it("should throw error if event has no event date", async () => {
      mockPrisma.event.findUnique.mockResolvedValue({
        ...mockEvent,
        eventDate: null
      });

      await expect(createBookingRequestsForEvent("event-1")).rejects.toThrow("Event must have an event date to create booking requests");
    });
  });

  describe("cancelBookingRequestsForEvent", () => {
    it("should cancel all pending bookings for an event", async () => {
      await cancelBookingRequestsForEvent("event-1");

      expect(mockPrisma.booking.updateMany).toHaveBeenCalledWith({
        where: {
          eventId: "event-1",
          status: "PENDING"
        },
        data: {
          status: "CANCELLED"
        }
      });
    });
  });
});