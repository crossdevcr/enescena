import { describe, it, expect, beforeEach, vi, Mock } from "vitest";
import { createBookingRequestsForEvent, cancelBookingRequestsForEvent } from "./eventPublishing";
import { prisma } from "@/lib/prisma";
import { sendEmail } from "@/lib/email/mailer";

// Mock prisma and email
vi.mock("@/lib/prisma", () => ({
  prisma: {
    event: {
      findUnique: vi.fn()
    },
    venue: {
      findUnique: vi.fn()
    },
    booking: {
      findFirst: vi.fn(),
      findMany: vi.fn(),
      create: vi.fn(),
      updateMany: vi.fn()
    },
    eventArtist: {
      updateMany: vi.fn()
    }
  }
}));

vi.mock("@/lib/email/mailer", () => ({
  sendEmail: vi.fn()
}));

vi.mock("next/cache", () => ({
  revalidatePath: vi.fn()
}));

const mockPrisma = prisma as any;
const mockSendEmail = sendEmail as Mock;

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
          artist: { 
            id: "artist-1", 
            name: "Artist One", 
            slug: "artist-one",
            user: { email: "artist1@test.com", name: "Artist One" }
          },
          confirmed: false
        },
        {
          artistId: "artist-2", 
          artist: { 
            id: "artist-2", 
            name: "Artist Two", 
            slug: "artist-two",
            user: { email: "artist2@test.com", name: "Artist Two" }
          },
          confirmed: false
        }
      ]
    };

    const mockVenue = {
      name: "Test Venue"
    };

    it("should create booking requests for unconfirmed artists when event is published", async () => {
      mockPrisma.event.findUnique.mockResolvedValue(mockEvent);
      mockPrisma.venue.findUnique.mockResolvedValue(mockVenue);
      mockPrisma.booking.findFirst.mockResolvedValue(null); // No existing bookings
      
      // Mock booking creation to return booking with artist info
      mockPrisma.booking.create
        .mockResolvedValueOnce({
          id: "booking-1",
          eventDate: mockEvent.eventDate,
          hours: 3,
          artist: mockEvent.eventArtists[0].artist
        })
        .mockResolvedValueOnce({
          id: "booking-2", 
          eventDate: mockEvent.eventDate,
          hours: 3,
          artist: mockEvent.eventArtists[1].artist
        });

      await createBookingRequestsForEvent("event-1");

      expect(mockPrisma.event.findUnique).toHaveBeenCalledWith({
        where: { id: "event-1" },
        include: {
          eventArtists: {
            where: { confirmed: false },
            include: {
              artist: { 
                select: { 
                  id: true, 
                  name: true, 
                  slug: true,
                  user: { select: { email: true, name: true } }
                } 
              }
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
        },
        include: {
          artist: {
            select: {
              name: true,
              user: { select: { email: true, name: true } }
            }
          }
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
        },
        include: {
          artist: {
            select: {
              name: true,
              user: { select: { email: true, name: true } }
            }
          }
        }
      });

      // Wait for async email operations to complete
      await new Promise(resolve => setTimeout(resolve, 10));
      
      // Check that email notifications were sent
      expect(mockSendEmail).toHaveBeenCalledTimes(2);
      expect(mockSendEmail).toHaveBeenCalledWith(
        expect.objectContaining({
          to: "artist1@test.com",
          subject: "New booking request from Test Venue"
        })
      );
      expect(mockSendEmail).toHaveBeenCalledWith(
        expect.objectContaining({
          to: "artist2@test.com", 
          subject: "New booking request from Test Venue"
        })
      );
    });

    it("should skip creating bookings for artists that already have bookings", async () => {
      mockPrisma.event.findUnique.mockResolvedValue(mockEvent);
      mockPrisma.venue.findUnique.mockResolvedValue(mockVenue);
      mockPrisma.booking.findFirst
        .mockResolvedValueOnce({ id: "existing-booking" }) // First artist has existing booking
        .mockResolvedValueOnce(null); // Second artist doesn't
        
      mockPrisma.booking.create.mockResolvedValue({
        id: "booking-2",
        eventDate: mockEvent.eventDate,
        hours: 3,
        artist: mockEvent.eventArtists[1].artist
      });

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
        },
        include: {
          artist: {
            select: {
              name: true,
              user: { select: { email: true, name: true } }
            }
          }
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

    it("should send email notifications to artists when creating booking requests", async () => {
      mockPrisma.event.findUnique.mockResolvedValue(mockEvent);
      mockPrisma.venue.findUnique.mockResolvedValue(mockVenue);
      mockPrisma.booking.findFirst.mockResolvedValue(null);
      mockPrisma.booking.create.mockResolvedValue({
        id: "booking-1",
        eventDate: mockEvent.eventDate,
        hours: 3,
        artist: mockEvent.eventArtists[0].artist
      });

      await createBookingRequestsForEvent("event-1");

      // Wait for async email operations 
      await new Promise(resolve => setTimeout(resolve, 10));

      expect(mockSendEmail).toHaveBeenCalledWith(
        expect.objectContaining({
          to: "artist1@test.com",
          subject: "New booking request from Test Venue",
          html: expect.stringContaining("New booking request"),
          text: expect.stringContaining("New booking request from Test Venue")
        })
      );
    });

    it("should handle email failures gracefully without breaking booking creation", async () => {
      mockPrisma.event.findUnique.mockResolvedValue(mockEvent);
      mockPrisma.venue.findUnique.mockResolvedValue(mockVenue);
      mockPrisma.booking.findFirst.mockResolvedValue(null);
      mockPrisma.booking.create.mockResolvedValue({
        id: "booking-1",
        eventDate: mockEvent.eventDate,
        hours: 3,
        artist: mockEvent.eventArtists[0].artist
      });
      
      mockSendEmail.mockRejectedValue(new Error("Email service unavailable"));

      // Should not throw even if email fails
      await expect(createBookingRequestsForEvent("event-1")).resolves.not.toThrow();
      
      expect(mockPrisma.booking.create).toHaveBeenCalled();
    });
  });

  describe("cancelBookingRequestsForEvent", () => {
    it("should cancel all pending and accepted bookings for an event", async () => {
      // Mock event
      mockPrisma.event.findUnique.mockResolvedValue({
        id: "event-1",
        title: "Test Event",
        venue: { name: "Test Venue" }
      });

      // Mock bookings to cancel
      mockPrisma.booking.findMany.mockResolvedValue([
        {
          id: "booking-1",
          artist: { 
            id: "artist-1", 
            name: "Artist One",
            user: { email: "artist1@test.com" }
          }
        }
      ]);

      await cancelBookingRequestsForEvent("event-1");

      // Should cancel both PENDING and ACCEPTED bookings
      expect(mockPrisma.booking.updateMany).toHaveBeenCalledWith({
        where: {
          eventId: "event-1",
          status: { in: ["PENDING", "ACCEPTED"] }
        },
        data: {
          status: "CANCELLED"
        }
      });

      // Should reset EventArtist confirmation
      expect(mockPrisma.eventArtist.updateMany).toHaveBeenCalledWith({
        where: { eventId: "event-1" },
        data: { confirmed: false }
      });
    });

    it("should handle case when no bookings exist", async () => {
      mockPrisma.event.findUnique.mockResolvedValue({
        id: "event-1",
        title: "Test Event",
        venue: { name: "Test Venue" }
      });

      mockPrisma.booking.findMany.mockResolvedValue([]);

      await cancelBookingRequestsForEvent("event-1");

      // Should still query but not update anything
      expect(mockPrisma.booking.updateMany).not.toHaveBeenCalled();
    });

    it("should handle case when event does not exist", async () => {
      mockPrisma.event.findUnique.mockResolvedValue(null);

      await cancelBookingRequestsForEvent("nonexistent-event");

      // Should not attempt any updates
      expect(mockPrisma.booking.updateMany).not.toHaveBeenCalled();
      expect(mockPrisma.eventArtist.updateMany).not.toHaveBeenCalled();
    });
  });
});