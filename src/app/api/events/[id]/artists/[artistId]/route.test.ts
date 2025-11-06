import { describe, it, expect, beforeEach, vi, type MockedFunction } from "vitest";
import { PATCH, DELETE } from "./route";
import { verifyIdToken } from "@/lib/auth/cognito";
import { prisma } from "@/lib/prisma";
import { cookies } from "next/headers";
import { sendEmail } from "@/lib/email/mailer";

// Mock all dependencies
vi.mock("@/lib/auth/cognito");
vi.mock("next/headers");
vi.mock("next/cache", () => ({
  revalidatePath: vi.fn()
}));
vi.mock("@/lib/email/mailer", () => ({
  sendEmail: vi.fn().mockResolvedValue({ ok: true, id: "email-123" })
}));
vi.mock("@/lib/prisma", () => ({
  prisma: {
    user: {
      findUnique: vi.fn()
    },
    eventArtist: {
      findUnique: vi.fn(),
      update: vi.fn(),
      delete: vi.fn()
    },
    booking: {
      findMany: vi.fn(),
      updateMany: vi.fn()
    }
  }
}));

const mockVerifyIdToken = verifyIdToken as MockedFunction<typeof verifyIdToken>;
const mockPrisma = prisma as any;
const mockCookies = cookies as MockedFunction<typeof cookies>;
const mockSendEmail = sendEmail as MockedFunction<typeof sendEmail>;

describe("Individual Event Artist API", () => {
  const mockVenueUser = {
    id: "user-1",
    email: "venue@test.com",
    role: "VENUE",
    venue: { id: "venue-1", name: "Test Venue" },
    artist: null
  };

  const mockArtistUser = {
    id: "user-2",
    email: "artist@test.com",
    role: "ARTIST",
    venue: null,
    artist: { id: "artist-1", name: "Test Artist" }
  };

  const mockEventArtist = {
    id: "event-artist-1",
    eventId: "event-1",
    artistId: "artist-1",
    confirmed: false,
    fee: 1000,
    hours: 2,
    notes: "Test notes",
    event: { venueId: "venue-1" }
  };

  beforeEach(() => {
    vi.clearAllMocks();
    
    // Default successful auth setup
    mockCookies.mockResolvedValue({
      get: vi.fn().mockReturnValue({ value: "valid-token" })
    } as any);
    
    mockVerifyIdToken.mockResolvedValue({
      sub: "user-1",
      email: "venue@test.com"
    });
  });

  describe("PATCH /api/events/[id]/artists/[artistId] - Update Event Artist", () => {
    it("should allow venue owner to update event artist details", async () => {
      mockPrisma.user.findUnique.mockResolvedValue(mockVenueUser);
      mockPrisma.eventArtist.findUnique.mockResolvedValue(mockEventArtist);
      
      const updatedEventArtist = {
        ...mockEventArtist,
        fee: 1500,
        hours: 3,
        notes: "Updated notes"
      };
      
      mockPrisma.eventArtist.update.mockResolvedValue(updatedEventArtist);

      const request = new Request("http://localhost/api/events/event-1/artists/artist-1", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          fee: 1500,
          hours: 3,
          notes: "Updated notes"
        })
      });

      const response = await PATCH(request, { 
        params: { id: "event-1", artistId: "artist-1" } 
      });
      
      expect(response.status).toBe(200);
      
      expect(mockPrisma.eventArtist.update).toHaveBeenCalledWith({
        where: {
          eventId_artistId: {
            eventId: "event-1",
            artistId: "artist-1"
          }
        },
        data: {
          fee: 1500,
          hours: 3,
          notes: "Updated notes"
        },
        include: {
          artist: { select: { id: true, name: true, slug: true } }
        }
      });
      
      const data = await response.json();
      expect(data.eventArtist).toEqual(updatedEventArtist);
    });

    it("should allow artist to confirm their participation", async () => {
      mockPrisma.user.findUnique.mockResolvedValue(mockArtistUser);
      mockPrisma.eventArtist.findUnique.mockResolvedValue(mockEventArtist);
      
      const confirmedEventArtist = {
        ...mockEventArtist,
        confirmed: true
      };
      
      mockPrisma.eventArtist.update.mockResolvedValue(confirmedEventArtist);

      const request = new Request("http://localhost/api/events/event-1/artists/artist-1", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ confirmed: true })
      });

      const response = await PATCH(request, { 
        params: { id: "event-1", artistId: "artist-1" } 
      });
      
      expect(response.status).toBe(200);
      expect(mockPrisma.eventArtist.update).toHaveBeenCalledWith({
        where: {
          eventId_artistId: {
            eventId: "event-1",
            artistId: "artist-1"
          }
        },
        data: { confirmed: true },
        include: {
          artist: { select: { id: true, name: true, slug: true } }
        }
      });
    });

    it("should return 403 if user is not venue owner or the artist", async () => {
      const otherUser = {
        id: "user-3",
        email: "other@test.com",
        role: "VENUE",
        venue: { id: "other-venue", name: "Other Venue" },
        artist: null
      };
      
      mockPrisma.user.findUnique.mockResolvedValue(otherUser);
      mockPrisma.eventArtist.findUnique.mockResolvedValue(mockEventArtist);

      const request = new Request("http://localhost/api/events/event-1/artists/artist-1", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ confirmed: true })
      });

      const response = await PATCH(request, { 
        params: { id: "event-1", artistId: "artist-1" } 
      });
      
      expect(response.status).toBe(403);
      const data = await response.json();
      expect(data.error).toBe("forbidden");
    });

    it("should return 404 if event artist relationship not found", async () => {
      mockPrisma.user.findUnique.mockResolvedValue(mockVenueUser);
      mockPrisma.eventArtist.findUnique.mockResolvedValue(null);

      const request = new Request("http://localhost/api/events/event-1/artists/nonexistent-artist", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ confirmed: true })
      });

      const response = await PATCH(request, { 
        params: { id: "event-1", artistId: "nonexistent-artist" } 
      });
      
      expect(response.status).toBe(404);
      const data = await response.json();
      expect(data.error).toBe("not_found");
    });
  });

  describe("DELETE /api/events/[id]/artists/[artistId] - Remove Artist from Event", () => {
    it("should remove artist from event and cancel their bookings", async () => {
      mockPrisma.user.findUnique.mockResolvedValue(mockVenueUser);
      mockPrisma.eventArtist.findUnique.mockResolvedValue(mockEventArtist);
      
      const relatedBookings = [
        {
          id: "booking-1",
          artist: { 
            name: "Test Artist",
            user: { email: "artist@test.com" }
          },
          venue: { name: "Test Venue" }
        },
        {
          id: "booking-2", 
          artist: { 
            name: "Test Artist",
            user: { email: "artist@test.com" }
          },
          venue: { name: "Test Venue" }
        }
      ];
      
      mockPrisma.booking.findMany.mockResolvedValue(relatedBookings);
      mockPrisma.booking.updateMany.mockResolvedValue({ count: 2 });
      mockPrisma.eventArtist.delete.mockResolvedValue(mockEventArtist);

      const request = new Request("http://localhost/api/events/event-1/artists/artist-1", {
        method: "DELETE"
      });

      const response = await DELETE(request, { 
        params: { id: "event-1", artistId: "artist-1" } 
      });
      
      expect(response.status).toBe(200);
      
      // Should cancel related bookings
      expect(mockPrisma.booking.updateMany).toHaveBeenCalledWith({
        where: {
          eventId: "event-1",
          artistId: "artist-1",
          status: { in: ["PENDING", "ACCEPTED"] }
        },
        data: {
          status: "CANCELLED"
        }
      });
      
      // Should remove event artist relationship
      expect(mockPrisma.eventArtist.delete).toHaveBeenCalledWith({
        where: {
          eventId_artistId: {
            eventId: "event-1",
            artistId: "artist-1"
          }
        }
      });
      
      const data = await response.json();
      expect(data.ok).toBe(true);
      expect(data.cancelledBookings).toBe(2);
    });

    it("should remove artist from event even if no bookings exist", async () => {
      mockPrisma.user.findUnique.mockResolvedValue(mockVenueUser);
      mockPrisma.eventArtist.findUnique.mockResolvedValue(mockEventArtist);
      mockPrisma.booking.findMany.mockResolvedValue([]); // No bookings
      mockPrisma.eventArtist.delete.mockResolvedValue(mockEventArtist);

      const request = new Request("http://localhost/api/events/event-1/artists/artist-1", {
        method: "DELETE"
      });

      const response = await DELETE(request, { 
        params: { id: "event-1", artistId: "artist-1" } 
      });
      
      expect(response.status).toBe(200);
      expect(mockPrisma.booking.updateMany).not.toHaveBeenCalled();
      expect(mockPrisma.eventArtist.delete).toHaveBeenCalled();
      
      const data = await response.json();
      expect(data.ok).toBe(true);
      expect(data.cancelledBookings).toBe(0);
    });

    it("should return 403 if user is not the venue owner", async () => {
      const otherVenueUser = {
        ...mockVenueUser,
        venue: { id: "other-venue", name: "Other Venue" }
      };
      
      mockPrisma.user.findUnique.mockResolvedValue(otherVenueUser);
      mockPrisma.eventArtist.findUnique.mockResolvedValue(mockEventArtist);

      const request = new Request("http://localhost/api/events/event-1/artists/artist-1", {
        method: "DELETE"
      });

      const response = await DELETE(request, { 
        params: { id: "event-1", artistId: "artist-1" } 
      });
      
      expect(response.status).toBe(403);
      const data = await response.json();
      expect(data.error).toBe("forbidden");
    });

    it("should return 404 if event artist relationship not found", async () => {
      mockPrisma.user.findUnique.mockResolvedValue(mockVenueUser);
      mockPrisma.eventArtist.findUnique.mockResolvedValue(null);

      const request = new Request("http://localhost/api/events/event-1/artists/nonexistent-artist", {
        method: "DELETE"
      });

      const response = await DELETE(request, { 
        params: { id: "event-1", artistId: "nonexistent-artist" } 
      });
      
      expect(response.status).toBe(404);
      const data = await response.json();
      expect(data.error).toBe("not_found");
    });

    it("should send cancellation emails when removing artist with bookings", async () => {
      mockPrisma.user.findUnique.mockResolvedValue(mockVenueUser);
      mockPrisma.eventArtist.findUnique.mockResolvedValue(mockEventArtist);
      
      const relatedBookings = [
        {
          id: "booking-1",
          artist: { 
            name: "Test Artist",
            user: { email: "artist@test.com" }
          },
          venue: { name: "Test Venue" }
        }
      ];
      
      mockPrisma.booking.findMany.mockResolvedValue(relatedBookings);
      mockPrisma.booking.updateMany.mockResolvedValue({ count: 1 });
      mockPrisma.eventArtist.delete.mockResolvedValue(mockEventArtist);
      mockSendEmail.mockResolvedValue({ ok: true, id: "email-123" });

      const request = new Request("http://localhost/api/events/event-1/artists/artist-1", {
        method: "DELETE"
      });

      const response = await DELETE(request, { 
        params: { id: "event-1", artistId: "artist-1" } 
      });
      
      expect(response.status).toBe(200);
      
      // Email sending happens asynchronously, so we need to wait a bit
      await new Promise(resolve => setTimeout(resolve, 10));
      
      // Should send cancellation email
      expect(mockSendEmail).toHaveBeenCalledWith({
        to: "artist@test.com",
        subject: expect.stringContaining("canceled"),
        html: expect.any(String),
        text: expect.any(String)
      });
    });
  });
});