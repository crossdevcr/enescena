import { describe, it, expect, beforeEach, vi, type MockedFunction } from "vitest";
import { POST, GET } from "./route";
import { verifyIdToken } from "@/lib/auth/cognito";
import { prisma } from "@/lib/prisma";
import { cookies } from "next/headers";
import { createBookingRequestForArtist } from "@/lib/booking/eventPublishing";

// Mock all dependencies
vi.mock("@/lib/auth/cognito");
vi.mock("next/headers");
vi.mock("next/cache", () => ({
  revalidatePath: vi.fn()
}));
vi.mock("@/lib/booking/eventPublishing", () => ({
  createBookingRequestForArtist: vi.fn()
}));
vi.mock("@/lib/prisma", () => ({
  prisma: {
    user: {
      findUnique: vi.fn()
    },
    event: {
      findUnique: vi.fn()
    },
    artist: {
      findUnique: vi.fn()
    },
    eventArtist: {
      findUnique: vi.fn(),
      findMany: vi.fn(),
      create: vi.fn()
    }
  }
}));

const mockVerifyIdToken = verifyIdToken as MockedFunction<typeof verifyIdToken>;
const mockPrisma = prisma as any;
const mockCookies = cookies as MockedFunction<typeof cookies>;
const mockCreateBookingRequestForArtist = createBookingRequestForArtist as MockedFunction<typeof createBookingRequestForArtist>;

describe("Event Artists API - /api/events/[id]/artists", () => {
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

  const mockEvent = {
    id: "event-1",
    venueId: "venue-1",
    status: "PUBLISHED"
  };

  const mockArtist = {
    id: "artist-1",
    name: "Test Artist"
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
    
    mockPrisma.user.findUnique.mockResolvedValue(mockVenueUser);
  });

  describe("POST - Add Artist to Event", () => {
    it("should add artist to published event and create booking request", async () => {
      mockPrisma.event.findUnique.mockResolvedValue(mockEvent);
      mockPrisma.artist.findUnique.mockResolvedValue(mockArtist);
      mockPrisma.eventArtist.findUnique.mockResolvedValue(null); // No existing relationship
      
      const mockEventArtist = {
        id: "event-artist-1",
        eventId: "event-1",
        artistId: "artist-1",
        fee: 1000,
        hours: 2,
        notes: "Test notes",
        confirmed: false,
        artist: { id: "artist-1", name: "Test Artist", slug: "test-artist" }
      };
      
      mockPrisma.eventArtist.create.mockResolvedValue(mockEventArtist);
      mockCreateBookingRequestForArtist.mockResolvedValue(undefined);

      const request = new Request("http://localhost/api/events/event-1/artists", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          artistId: "artist-1",
          fee: 1000,
          hours: 2,
          notes: "Test notes"
        })
      });

      const response = await POST(request, { params: { id: "event-1" } });
      
      expect(response.status).toBe(200);
      
      // Should create EventArtist relationship
      expect(mockPrisma.eventArtist.create).toHaveBeenCalledWith({
        data: {
          eventId: "event-1",
          artistId: "artist-1",
          fee: 1000,
          hours: 2,
          notes: "Test notes",
          confirmed: false
        },
        include: {
          artist: { select: { id: true, name: true, slug: true } }
        }
      });
      
      // Should create booking request for published event
      expect(mockCreateBookingRequestForArtist).toHaveBeenCalledWith("event-1", "artist-1");
      
      const data = await response.json();
      expect(data.eventArtist).toEqual(mockEventArtist);
    });

    it("should add artist to draft event without creating booking request", async () => {
      const draftEvent = { ...mockEvent, status: "DRAFT" };
      mockPrisma.event.findUnique.mockResolvedValue(draftEvent);
      mockPrisma.artist.findUnique.mockResolvedValue(mockArtist);
      mockPrisma.eventArtist.findUnique.mockResolvedValue(null);
      
      const mockEventArtist = {
        id: "event-artist-1",
        eventId: "event-1",
        artistId: "artist-1",
        confirmed: false,
        artist: { id: "artist-1", name: "Test Artist", slug: "test-artist" }
      };
      
      mockPrisma.eventArtist.create.mockResolvedValue(mockEventArtist);

      const request = new Request("http://localhost/api/events/event-1/artists", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ artistId: "artist-1" })
      });

      const response = await POST(request, { params: { id: "event-1" } });
      
      expect(response.status).toBe(200);
      expect(mockPrisma.eventArtist.create).toHaveBeenCalledWith({
        data: {
          eventId: "event-1",
          artistId: "artist-1",
          fee: null,
          hours: null,
          notes: null,
          confirmed: false
        },
        include: {
          artist: { select: { id: true, name: true, slug: true } }
        }
      });
      
      // Should NOT create booking request for draft event
      expect(mockCreateBookingRequestForArtist).not.toHaveBeenCalled();
    });

    it("should handle cancelled event status properly", async () => {
      const cancelledEvent = { ...mockEvent, status: "CANCELLED" };
      mockPrisma.event.findUnique.mockResolvedValue(cancelledEvent);
      mockPrisma.artist.findUnique.mockResolvedValue(mockArtist);
      mockPrisma.eventArtist.findUnique.mockResolvedValue(null);
      
      const mockEventArtist = {
        id: "event-artist-1",
        eventId: "event-1",
        artistId: "artist-1",
        confirmed: false,
        artist: { id: "artist-1", name: "Test Artist", slug: "test-artist" }
      };
      
      mockPrisma.eventArtist.create.mockResolvedValue(mockEventArtist);

      const request = new Request("http://localhost/api/events/event-1/artists", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ artistId: "artist-1" })
      });

      const response = await POST(request, { params: { id: "event-1" } });
      
      expect(response.status).toBe(200);
      // Should NOT create booking request for cancelled event
      expect(mockCreateBookingRequestForArtist).not.toHaveBeenCalled();
    });

    it("should return 400 if artist is already added to event", async () => {
      mockPrisma.event.findUnique.mockResolvedValue(mockEvent);
      mockPrisma.artist.findUnique.mockResolvedValue(mockArtist);
      mockPrisma.eventArtist.findUnique.mockResolvedValue({ 
        id: "existing-event-artist",
        eventId: "event-1",
        artistId: "artist-1"
      });

      const request = new Request("http://localhost/api/events/event-1/artists", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ artistId: "artist-1" })
      });

      const response = await POST(request, { params: { id: "event-1" } });
      
      expect(response.status).toBe(400);
      const data = await response.json();
      expect(data.error).toBe("validation_error");
      expect(data.message).toContain("already added");
      expect(mockPrisma.eventArtist.create).not.toHaveBeenCalled();
    });

    it("should return 404 if artist not found", async () => {
      mockPrisma.event.findUnique.mockResolvedValue(mockEvent);
      mockPrisma.artist.findUnique.mockResolvedValue(null);

      const request = new Request("http://localhost/api/events/event-1/artists", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ artistId: "nonexistent-artist" })
      });

      const response = await POST(request, { params: { id: "event-1" } });
      
      expect(response.status).toBe(404);
      const data = await response.json();
      expect(data.error).toBe("artist_not_found");
    });

    it("should return 404 if event not found", async () => {
      mockPrisma.event.findUnique.mockResolvedValue(null);

      const request = new Request("http://localhost/api/events/nonexistent-event/artists", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ artistId: "artist-1" })
      });

      const response = await POST(request, { params: { id: "nonexistent-event" } });
      
      expect(response.status).toBe(404);
      const data = await response.json();
      expect(data.error).toBe("event_not_found");
    });

    it("should return 403 if user is not the venue owner", async () => {
      const otherUserEvent = { ...mockEvent, venueId: "other-venue" };
      mockPrisma.event.findUnique.mockResolvedValue(otherUserEvent);

      const request = new Request("http://localhost/api/events/event-1/artists", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ artistId: "artist-1" })
      });

      const response = await POST(request, { params: { id: "event-1" } });
      
      expect(response.status).toBe(403);
      const data = await response.json();
      expect(data.error).toBe("forbidden");
    });

    it("should return 403 if user is not a venue", async () => {
      mockPrisma.user.findUnique.mockResolvedValue(mockArtistUser);

      const request = new Request("http://localhost/api/events/event-1/artists", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ artistId: "artist-1" })
      });

      const response = await POST(request, { params: { id: "event-1" } });
      
      expect(response.status).toBe(403);
      const data = await response.json();
      expect(data.error).toBe("forbidden");
    });

    it("should return 400 if artistId is missing", async () => {
      mockPrisma.event.findUnique.mockResolvedValue(mockEvent);

      const request = new Request("http://localhost/api/events/event-1/artists", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({}) // No artistId
      });

      const response = await POST(request, { params: { id: "event-1" } });
      
      expect(response.status).toBe(400);
      const data = await response.json();
      expect(data.error).toBe("validation_error");
      expect(data.message).toContain("Artist ID is required");
    });

    it("should succeed even if booking request creation fails", async () => {
      mockPrisma.event.findUnique.mockResolvedValue(mockEvent);
      mockPrisma.artist.findUnique.mockResolvedValue(mockArtist);
      mockPrisma.eventArtist.findUnique.mockResolvedValue(null);
      
      const mockEventArtist = {
        id: "event-artist-1",
        eventId: "event-1",
        artistId: "artist-1",
        confirmed: false,
        artist: { id: "artist-1", name: "Test Artist", slug: "test-artist" }
      };
      
      mockPrisma.eventArtist.create.mockResolvedValue(mockEventArtist);
      // Simulate booking creation failure
      mockCreateBookingRequestForArtist.mockRejectedValue(new Error("Booking creation failed"));

      const request = new Request("http://localhost/api/events/event-1/artists", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ artistId: "artist-1" })
      });

      const response = await POST(request, { params: { id: "event-1" } });
      
      // Should still succeed
      expect(response.status).toBe(200);
      const data = await response.json();
      expect(data.eventArtist).toEqual(mockEventArtist);
    });

    it("should handle malformed JSON gracefully", async () => {
      mockPrisma.event.findUnique.mockResolvedValue(mockEvent);

      const request = new Request("http://localhost/api/events/event-1/artists", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: "invalid json"
      });

      const response = await POST(request, { params: { id: "event-1" } });
      
      expect(response.status).toBe(400);
      const data = await response.json();
      expect(data.error).toBe("validation_error");
      expect(data.message).toContain("Artist ID is required");
    });

    it("should handle numeric fee and hours properly", async () => {
      mockPrisma.event.findUnique.mockResolvedValue(mockEvent);
      mockPrisma.artist.findUnique.mockResolvedValue(mockArtist);
      mockPrisma.eventArtist.findUnique.mockResolvedValue(null);
      
      const mockEventArtist = {
        id: "event-artist-1",
        eventId: "event-1", 
        artistId: "artist-1",
        fee: 1500,
        hours: 3,
        confirmed: false,
        artist: { id: "artist-1", name: "Test Artist", slug: "test-artist" }
      };
      
      mockPrisma.eventArtist.create.mockResolvedValue(mockEventArtist);

      const request = new Request("http://localhost/api/events/event-1/artists", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          artistId: "artist-1",
          fee: "1500", // String that should be converted to number
          hours: "3"   // String that should be converted to number
        })
      });

      const response = await POST(request, { params: { id: "event-1" } });
      
      expect(response.status).toBe(200);
      expect(mockPrisma.eventArtist.create).toHaveBeenCalledWith({
        data: {
          eventId: "event-1",
          artistId: "artist-1",
          fee: 1500,
          hours: 3,
          notes: null,
          confirmed: false
        },
        include: {
          artist: { select: { id: true, name: true, slug: true } }
        }
      });
    });

    it("should handle invalid fee and hours by setting null", async () => {
      mockPrisma.event.findUnique.mockResolvedValue(mockEvent);
      mockPrisma.artist.findUnique.mockResolvedValue(mockArtist);
      mockPrisma.eventArtist.findUnique.mockResolvedValue(null);
      
      const mockEventArtist = {
        id: "event-artist-1",
        eventId: "event-1",
        artistId: "artist-1",
        fee: null,
        hours: null,
        confirmed: false,
        artist: { id: "artist-1", name: "Test Artist", slug: "test-artist" }
      };
      
      mockPrisma.eventArtist.create.mockResolvedValue(mockEventArtist);

      const request = new Request("http://localhost/api/events/event-1/artists", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          artistId: "artist-1",
          fee: "invalid", // Invalid number
          hours: "also invalid" // Invalid number
        })
      });

      const response = await POST(request, { params: { id: "event-1" } });
      
      expect(response.status).toBe(200);
      expect(mockPrisma.eventArtist.create).toHaveBeenCalledWith({
        data: {
          eventId: "event-1",
          artistId: "artist-1",
          fee: null,
          hours: null,
          notes: null,
          confirmed: false
        },
        include: {
          artist: { select: { id: true, name: true, slug: true } }
        }
      });
    });
  });

  describe("GET - List Event Artists", () => {
    const mockEventArtists = [
      {
        id: "event-artist-1",
        eventId: "event-1",
        artistId: "artist-1",
        confirmed: true,
        createdAt: "2024-01-01T00:00:00.000Z",
        artist: { id: "artist-1", name: "Artist One", slug: "artist-one" }
      },
      {
        id: "event-artist-2", 
        eventId: "event-1",
        artistId: "artist-2",
        confirmed: false,
        createdAt: "2024-01-02T00:00:00.000Z",
        artist: { id: "artist-2", name: "Artist Two", slug: "artist-two" }
      }
    ];

    it("should return event artists for venue owner", async () => {
      mockPrisma.event.findUnique.mockResolvedValue(mockEvent);
      // Mock with Date objects as Prisma returns
      const prismaResults = [
        {
          ...mockEventArtists[0],
          createdAt: new Date("2024-01-01")
        },
        {
          ...mockEventArtists[1], 
          createdAt: new Date("2024-01-02")
        }
      ];
      mockPrisma.eventArtist.findMany.mockResolvedValue(prismaResults);

      const request = new Request("http://localhost/api/events/event-1/artists");
      const response = await GET(request, { params: { id: "event-1" } });
      
      expect(response.status).toBe(200);
      const data = await response.json();
      expect(data.eventArtists).toEqual(mockEventArtists);
      
      expect(mockPrisma.eventArtist.findMany).toHaveBeenCalledWith({
        where: { eventId: "event-1" },
        include: {
          artist: { select: { id: true, name: true, slug: true } }
        },
        orderBy: { createdAt: "asc" }
      });
    });

    it("should return event artists for participating artist", async () => {
      mockPrisma.user.findUnique.mockResolvedValue(mockArtistUser);
      mockPrisma.event.findUnique.mockResolvedValue(mockEvent);
      mockPrisma.eventArtist.findUnique.mockResolvedValue({ 
        id: "event-artist-1",
        eventId: "event-1",
        artistId: "artist-1"
      }); // Artist is in event
      // Mock with Date objects as Prisma returns
      const prismaResults = [
        {
          ...mockEventArtists[0],
          createdAt: new Date("2024-01-01")
        },
        {
          ...mockEventArtists[1], 
          createdAt: new Date("2024-01-02")
        }
      ];
      mockPrisma.eventArtist.findMany.mockResolvedValue(prismaResults);

      const request = new Request("http://localhost/api/events/event-1/artists");
      const response = await GET(request, { params: { id: "event-1" } });
      
      expect(response.status).toBe(200);
      const data = await response.json();
      expect(data.eventArtists).toEqual(mockEventArtists);
      
      // Should check if artist is part of event
      expect(mockPrisma.eventArtist.findUnique).toHaveBeenCalledWith({
        where: {
          eventId_artistId: {
            eventId: "event-1",
            artistId: "artist-1"
          }
        }
      });
    });

    it("should allow admin to view any event artists", async () => {
      const adminUser = {
        ...mockArtistUser,
        role: "ADMIN"
      };
      
      mockPrisma.user.findUnique.mockResolvedValue(adminUser);
      mockPrisma.event.findUnique.mockResolvedValue(mockEvent);
      mockPrisma.eventArtist.findUnique.mockResolvedValue(null); // Not in event
      // Mock with Date objects as Prisma returns
      const prismaResults = [
        {
          ...mockEventArtists[0],
          createdAt: new Date("2024-01-01")
        },
        {
          ...mockEventArtists[1], 
          createdAt: new Date("2024-01-02")
        }
      ];
      mockPrisma.eventArtist.findMany.mockResolvedValue(prismaResults);

      const request = new Request("http://localhost/api/events/event-1/artists");
      const response = await GET(request, { params: { id: "event-1" } });
      
      expect(response.status).toBe(200);
      const data = await response.json();
      expect(data.eventArtists).toEqual(mockEventArtists);
    });

    it("should return 403 for non-participating artist", async () => {
      const otherArtistUser = {
        id: "user-3",
        email: "other-artist@test.com",
        role: "ARTIST", 
        venue: null,
        artist: { id: "other-artist", name: "Other Artist" }
      };
      
      mockPrisma.user.findUnique.mockResolvedValue(otherArtistUser);
      mockPrisma.event.findUnique.mockResolvedValue(mockEvent);
      mockPrisma.eventArtist.findUnique.mockResolvedValue(null); // Not in event

      const request = new Request("http://localhost/api/events/event-1/artists");
      const response = await GET(request, { params: { id: "event-1" } });
      
      expect(response.status).toBe(403);
      const data = await response.json();
      expect(data.error).toBe("forbidden");
    });

    it("should return 403 for non-venue owner venue user", async () => {
      const otherVenueUser = {
        ...mockVenueUser,
        venue: { id: "other-venue", name: "Other Venue" }
      };
      
      mockPrisma.user.findUnique.mockResolvedValue(otherVenueUser);
      mockPrisma.event.findUnique.mockResolvedValue(mockEvent);

      const request = new Request("http://localhost/api/events/event-1/artists");
      const response = await GET(request, { params: { id: "event-1" } });
      
      expect(response.status).toBe(403);
      const data = await response.json();
      expect(data.error).toBe("forbidden");
    });

    it("should return 404 if event not found", async () => {
      mockPrisma.event.findUnique.mockResolvedValue(null);

      const request = new Request("http://localhost/api/events/nonexistent-event/artists");
      const response = await GET(request, { params: { id: "nonexistent-event" } });
      
      expect(response.status).toBe(404);
      const data = await response.json();
      expect(data.error).toBe("event_not_found");
    });

    it("should return empty array if no artists in event", async () => {
      mockPrisma.event.findUnique.mockResolvedValue(mockEvent);
      mockPrisma.eventArtist.findMany.mockResolvedValue([]);

      const request = new Request("http://localhost/api/events/event-1/artists");
      const response = await GET(request, { params: { id: "event-1" } });
      
      expect(response.status).toBe(200);
      const data = await response.json();
      expect(data.eventArtists).toEqual([]);
    });

    it("should handle unauthorized request", async () => {
      mockCookies.mockResolvedValue({
        get: vi.fn().mockReturnValue(null) // No token
      } as any);

      const request = new Request("http://localhost/api/events/event-1/artists");
      const response = await GET(request, { params: { id: "event-1" } });
      
      expect(response.status).toBe(401);
      const data = await response.json();
      expect(data.error).toBe("unauthorized");
    });

    it("should handle invalid token", async () => {
      mockVerifyIdToken.mockRejectedValue(new Error("Invalid token"));

      const request = new Request("http://localhost/api/events/event-1/artists");
      const response = await GET(request, { params: { id: "event-1" } });
      
      expect(response.status).toBe(401);
      const data = await response.json();
      expect(data.error).toBe("unauthorized");
    });
  });
});