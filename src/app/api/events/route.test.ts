import { describe, it, expect, beforeEach, vi } from "vitest";
import { GET, POST } from "@/app/api/events/route";
import { prisma } from "@/lib/prisma";

// Mock dependencies
vi.mock("@/lib/prisma", () => ({
  prisma: {
    user: {
      findUnique: vi.fn(),
    },
    event: {
      findMany: vi.fn(),
      create: vi.fn(),
      findUnique: vi.fn(),
    },
  },
}));

vi.mock("@/lib/auth/cognito", () => ({
  verifyIdToken: vi.fn(),
}));

vi.mock("next/headers", () => ({
  cookies: vi.fn(),
}));

vi.mock("@/lib/events/approvalWorkflows", () => ({
  ApprovalWorkflows: vi.fn().mockImplementation(() => ({
    requestVenueApproval: vi.fn().mockResolvedValue({ success: true, message: "Approval requested" }),
  })),
}));

const { verifyIdToken } = await import("@/lib/auth/cognito");
const { cookies } = await import("next/headers");

describe("Events API", () => {
  const mockVenueUser = {
    id: "user1",
    email: "venue@example.com",
    role: "VENUE",
    venue: { id: "venue1", name: "Test Venue", userId: "user1" },
    artist: null,
  };

  const mockArtistUser = {
    id: "user2", 
    email: "artist@example.com",
    role: "ARTIST",
    venue: null,
    artist: { id: "artist1", name: "Test Artist", userId: "user2" },
  };

  const mockEvent = {
    id: "event1",
    title: "Test Event",
    slug: "test-event",
    description: "A test event",
    eventDate: new Date("2025-12-01T20:00:00Z"),
    endDate: null,
    totalHours: 3,
    totalBudget: 500000,
    status: "SEEKING_ARTISTS",
    createdBy: "user1",
    venueId: "venue1",
    isPublic: true,
    externalVenueName: null,
    externalVenueAddress: null,
    externalVenueCity: null,
    venue: { id: "venue1", name: "Test Venue", slug: "test-venue", city: "Test City" },
  };

  beforeEach(() => {
    vi.clearAllMocks();
    
    // Mock cookies
    vi.mocked(cookies).mockResolvedValue({
      get: vi.fn().mockReturnValue({ value: "fake-token" }),
    } as any);

    // Mock token verification
    vi.mocked(verifyIdToken).mockResolvedValue({
      email: mockVenueUser.email,
    });

    // Mock user lookup (default to venue user)
    vi.mocked(prisma.user.findUnique).mockResolvedValue(mockVenueUser as any);
  });

  describe("GET /api/events", () => {
    it("should return public events without authentication", async () => {
      vi.mocked(prisma.event.findMany).mockResolvedValue([mockEvent] as any);

      const request = new Request("http://localhost:3000/api/events?public=true");
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.events).toHaveLength(1);
      expect(data.events[0]).toMatchObject({
        id: "event1",
        title: "Test Event",
      });
      
      expect(prisma.event.findMany).toHaveBeenCalledWith({
        where: { isPublic: true },
        select: expect.objectContaining({
          id: true,
          title: true,
          slug: true,
          venue: { select: { id: true, name: true, slug: true, city: true } },
        }),
        orderBy: { eventDate: "desc" },
      });
    });

    it("should return venue events for authenticated venue user", async () => {
      vi.mocked(prisma.event.findMany).mockResolvedValue([mockEvent] as any);

      const request = new Request("http://localhost:3000/api/events");
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.events).toHaveLength(1);
    });

    it("should return artist-relevant events for authenticated artist", async () => {
      vi.mocked(prisma.user.findUnique).mockResolvedValue(mockArtistUser as any);
      vi.mocked(prisma.event.findMany).mockResolvedValue([mockEvent] as any);

      const request = new Request("http://localhost:3000/api/events");
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
    });

    it("should return 401 for unauthenticated users", async () => {
      vi.mocked(cookies).mockResolvedValue({
        get: vi.fn().mockReturnValue(undefined),
      } as any);

      const request = new Request("http://localhost:3000/api/events");
      const response = await GET(request);
      
      expect(response.status).toBe(401);
    });
  });

  describe("POST /api/events", () => {
    it("should create a venue event with valid data", async () => {
      const newEventData = {
        title: "New Test Event",
        description: "A new test event", 
        eventDate: "2025-12-15T19:00:00Z",
        totalHours: 4,
        totalBudget: 750000,
        venueId: "venue1",
        isPublic: true,
      };

      const createdEvent = {
        ...mockEvent,
        id: "event2", 
        title: newEventData.title,
        slug: "new-test-event",
        createdBy: "user1",
        status: "DRAFT",
      };

      vi.mocked(prisma.event.findUnique).mockResolvedValue(null); // No existing slug
      vi.mocked(prisma.event.create).mockResolvedValue(createdEvent as any);

      const request = new Request("http://localhost:3000/api/events", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(newEventData),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.event).toMatchObject({
        id: "event2",
        title: "New Test Event",
        slug: "new-test-event",
      });
    });

    it("should create artist event with external venue", async () => {
      vi.mocked(prisma.user.findUnique).mockResolvedValue(mockArtistUser as any);
      
      const newEventData = {
        title: "Artist Gig",
        eventDate: "2025-12-20T20:00:00Z", 
        externalVenueName: "Blue Moon Cafe",
        externalVenueAddress: "123 Main St",
        isPublic: true,
      };

      const createdEvent = {
        ...mockEvent,
        id: "event3",
        title: newEventData.title,
        slug: "artist-gig", 
        createdBy: "user2",
        venueId: null,
        externalVenueName: "Blue Moon Cafe",
        externalVenueAddress: "123 Main St",
      };

      vi.mocked(prisma.event.findUnique).mockResolvedValue(null);
      vi.mocked(prisma.event.create).mockResolvedValue(createdEvent as any);

      const request = new Request("http://localhost:3000/api/events", {
        method: "POST", 
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(newEventData),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
    });

    it("should return 400 for missing required fields", async () => {
      const request = new Request("http://localhost:3000/api/events", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({}),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe("validation_error");
    });

    it("should generate unique slug when title conflicts", async () => {
      const newEventData = {
        title: "Test Event", // Same as existing event
        eventDate: "2025-12-15T19:00:00Z",
        venueId: "venue1",
      };

      // Mock slug conflict
      vi.mocked(prisma.event.findUnique)
        .mockResolvedValueOnce(mockEvent as any) // First call finds conflict
        .mockResolvedValueOnce(null); // Second call (with -1 suffix) is unique

      vi.mocked(prisma.event.create).mockResolvedValue({
        ...mockEvent,
        id: "event3",
        slug: "test-event-1",
      } as any);

      const request = new Request("http://localhost:3000/api/events", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(newEventData),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.event.slug).toBe("test-event-1");
    });

    it("should return 401 for unauthenticated users", async () => {
      vi.mocked(cookies).mockResolvedValue({
        get: vi.fn().mockReturnValue(undefined),
      } as any);

      const request = new Request("http://localhost:3000/api/events", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title: "Test", eventDate: "2025-12-15T19:00:00Z" }),
      });

      const response = await POST(request);
      
      expect(response.status).toBe(401);
    });
  });
});