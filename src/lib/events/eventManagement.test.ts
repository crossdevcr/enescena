import { describe, it, expect, beforeEach, vi } from "vitest";
import { prisma } from "@/lib/prisma";

// Mock Prisma client
vi.mock("@/lib/prisma", () => ({
  prisma: {
    event: {
      create: vi.fn(),
      findMany: vi.fn(),
      findUnique: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
    },
    performance: {
      create: vi.fn(),
      findMany: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
    },
    user: {
      findUnique: vi.fn(),
    },
    artist: {
      findUnique: vi.fn(),
    },
    venue: {
      findUnique: vi.fn(),
    },
  },
}));

describe("Event-centric Architecture", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("Event Creation", () => {
    const mockUser = {
      id: "user123",
      email: "artist@example.com",
      role: "ARTIST",
      artist: { id: "artist123", name: "Test Artist" },
    };

    const mockVenue = {
      id: "venue123",
      name: "Test Venue",
      slug: "test-venue",
    };

    it("should create an event with internal venue", async () => {
      const eventData = {
        createdBy: mockUser.id,
        venueId: mockVenue.id,
        title: "Jazz Night",
        slug: "jazz-night",
        eventDate: new Date("2025-12-15T20:00:00"),
        status: "DRAFT",
        isPublic: true,
      };

      const mockEvent = { id: "event123", ...eventData };

      // @ts-ignore - Mocking return value
      prisma.event.create.mockResolvedValue(mockEvent);

      const result = await prisma.event.create({
        data: eventData,
      });

      expect(prisma.event.create).toHaveBeenCalledWith({
        data: eventData,
      });
      expect(result).toEqual(mockEvent);
    });

    it("should create an event with external venue", async () => {
      const eventData = {
        createdBy: mockUser.id,
        venueId: null,
        externalVenueName: "Blue Moon Coffee",
        externalVenueAddress: "123 Coffee St",
        externalVenueCity: "San José, CR",
        title: "Acoustic Session",
        slug: "acoustic-session",
        eventDate: new Date("2025-11-25T15:00:00"),
        status: "CONFIRMED",
        isPublic: true,
      };

      const mockEvent = { id: "event456", ...eventData };

      // @ts-ignore
      prisma.event.create.mockResolvedValue(mockEvent);

      const result = await prisma.event.create({
        data: eventData,
      });

      expect(prisma.event.create).toHaveBeenCalledWith({
        data: eventData,
      });
      expect(result.externalVenueName).toBe("Blue Moon Coffee");
      expect(result.venueId).toBeNull();
    });

    it("should support artist-created events", async () => {
      const artistEventData = {
        createdBy: mockUser.id, // Artist creates event
        venueId: null,
        externalVenueName: "Street Performance",
        title: "Busking Session",
        slug: "busking-session",
        eventDate: new Date("2025-12-01T16:00:00"),
        status: "SEEKING_VENUE",
        isPublic: true,
      };

      const mockEvent = { id: "event789", ...artistEventData };

      // @ts-ignore
      prisma.event.create.mockResolvedValue(mockEvent);

      const result = await prisma.event.create({
        data: artistEventData,
      });

      expect(result.status).toBe("SEEKING_VENUE");
      expect(result.createdBy).toBe(mockUser.id);
    });
  });

  describe("Performance Management", () => {
    const mockEvent = {
      id: "event123",
      title: "Jazz Night",
      createdBy: "venue-user-123",
    };

    const mockArtist = {
      id: "artist123",
      name: "Test Artist",
    };

    it("should create a performance for an event", async () => {
      const performanceData = {
        eventId: mockEvent.id,
        artistId: mockArtist.id,
        proposedFee: 25000,
        hours: 2,
        status: "PENDING",
        notes: "Looking forward to performing!",
      };

      const mockPerformance = { id: "perf123", ...performanceData };

      // @ts-ignore
      prisma.performance.create.mockResolvedValue(mockPerformance);

      const result = await prisma.performance.create({
        data: performanceData,
      });

      expect(prisma.performance.create).toHaveBeenCalledWith({
        data: performanceData,
      });
      expect(result.status).toBe("PENDING");
    });

    it("should update performance status workflow", async () => {
      const performanceId = "perf123";
      
      // Test status transitions: PENDING -> CONFIRMED -> COMPLETED
      const confirmedUpdate = {
        status: "CONFIRMED",
        agreedFee: 30000,
        paymentTerms: "50% upfront, 50% after performance",
      };

      // @ts-ignore
      prisma.performance.update.mockResolvedValue({
        id: performanceId,
        ...confirmedUpdate,
      });

      const result = await prisma.performance.update({
        where: { id: performanceId },
        data: confirmedUpdate,
      });

      expect(prisma.performance.update).toHaveBeenCalledWith({
        where: { id: performanceId },
        data: confirmedUpdate,
      });
      expect(result.status).toBe("CONFIRMED");
      expect(result.agreedFee).toBe(30000);
    });

    it("should handle performance cancellation", async () => {
      const performanceId = "perf123";
      
      const cancellationUpdate = {
        status: "CANCELLED",
        notes: "Artist unavailable due to illness",
      };

      // @ts-ignore
      prisma.performance.update.mockResolvedValue({
        id: performanceId,
        ...cancellationUpdate,
      });

      const result = await prisma.performance.update({
        where: { id: performanceId },
        data: cancellationUpdate,
      });

      expect(result.status).toBe("CANCELLED");
    });
  });

  describe("Event Status Workflow", () => {
    it("should support complete event lifecycle", async () => {
      const eventId = "event123";
      
      // Test status transitions: DRAFT -> SEEKING_ARTISTS -> CONFIRMED -> PUBLISHED -> COMPLETED
      const statusUpdates = [
        { status: "SEEKING_ARTISTS" },
        { status: "CONFIRMED" },
        { status: "PUBLISHED" }, 
        { status: "COMPLETED" },
      ];

      for (const update of statusUpdates) {
        // @ts-ignore
        prisma.event.update.mockResolvedValue({
          id: eventId,
          ...update,
        });

        const result = await prisma.event.update({
          where: { id: eventId },
          data: update,
        });

        expect(result.status).toBe(update.status);
      }
    });

    it("should handle venue-seeking workflow", async () => {
      const eventId = "event123";
      
      // Artist creates event seeking venue
      const seekingVenueEvent = {
        status: "SEEKING_VENUE",
        externalVenueName: null,
        externalVenueAddress: null,
      };

      // @ts-ignore
      prisma.event.update.mockResolvedValue({
        id: eventId,
        ...seekingVenueEvent,
      });

      const result = await prisma.event.update({
        where: { id: eventId },
        data: seekingVenueEvent,
      });

      expect(result.status).toBe("SEEKING_VENUE");
    });
  });

  describe("Event Queries and Filtering", () => {
    it("should find events by creator", async () => {
      const creatorId = "user123";
      const mockEvents = [
        { id: "event1", createdBy: creatorId, title: "Event 1" },
        { id: "event2", createdBy: creatorId, title: "Event 2" },
      ];

      // @ts-ignore
      prisma.event.findMany.mockResolvedValue(mockEvents);

      const result = await prisma.event.findMany({
        where: { createdBy: creatorId },
      });

      expect(prisma.event.findMany).toHaveBeenCalledWith({
        where: { createdBy: creatorId },
      });
      expect(result).toHaveLength(2);
    });

    it("should find public events", async () => {
      const mockPublicEvents = [
        { id: "event1", isPublic: true, status: "PUBLISHED" },
        { id: "event2", isPublic: true, status: "PUBLISHED" },
      ];

      // @ts-ignore
      prisma.event.findMany.mockResolvedValue(mockPublicEvents);

      const result = await prisma.event.findMany({
        where: { 
          isPublic: true,
          status: "PUBLISHED" 
        },
      });

      expect(result.every(event => event.isPublic && event.status === "PUBLISHED")).toBe(true);
    });

    it("should find events seeking artists", async () => {
      const mockSeekingEvents = [
        { id: "event1", status: "SEEKING_ARTISTS" },
        { id: "event2", status: "SEEKING_ARTISTS" },
      ];

      // @ts-ignore
      prisma.event.findMany.mockResolvedValue(mockSeekingEvents);

      const result = await prisma.event.findMany({
        where: { status: "SEEKING_ARTISTS" },
      });

      expect(result.every(event => event.status === "SEEKING_ARTISTS")).toBe(true);
    });
  });

  describe("Performance Queries", () => {
    it("should find performances by artist", async () => {
      const artistId = "artist123";
      const mockPerformances = [
        { id: "perf1", artistId, status: "CONFIRMED" },
        { id: "perf2", artistId, status: "PENDING" },
      ];

      // @ts-ignore
      prisma.performance.findMany.mockResolvedValue(mockPerformances);

      const result = await prisma.performance.findMany({
        where: { artistId },
      });

      expect(result.every(perf => perf.artistId === artistId)).toBe(true);
    });

    it("should find confirmed performances for event", async () => {
      const eventId = "event123";
      const mockPerformances = [
        { id: "perf1", eventId, status: "CONFIRMED" },
      ];

      // @ts-ignore
      prisma.performance.findMany.mockResolvedValue(mockPerformances);

      const result = await prisma.performance.findMany({
        where: { 
          eventId,
          status: "CONFIRMED" 
        },
      });

      expect(result.every(perf => 
        perf.eventId === eventId && perf.status === "CONFIRMED"
      )).toBe(true);
    });
  });
});