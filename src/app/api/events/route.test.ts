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

const { verifyIdToken } = await import("@/lib/auth/cognito");
const { cookies } = await import("next/headers");

describe("Events API", () => {
  const mockUser = {
    id: "user1",
    email: "venue@example.com",
    role: "VENUE",
    venue: { id: "venue1", name: "Test Venue" },
  };

  const mockEvent = {
    id: "event1",
    title: "Test Event",
    slug: "test-event",
    description: "A test event",
    eventDate: new Date("2025-12-01T20:00:00Z"),
    endDate: null,
    hours: 3,
    budget: 500000,
    status: "DRAFT",
    venueId: "venue1",
    eventArtists: [],
    _count: { bookings: 0 },
  };

  beforeEach(() => {
    vi.clearAllMocks();
    
    // Mock cookies
    vi.mocked(cookies).mockResolvedValue({
      get: vi.fn().mockReturnValue({ value: "fake-token" }),
    } as any);

    // Mock token verification
    vi.mocked(verifyIdToken).mockResolvedValue({
      email: mockUser.email,
    });

    // Mock user lookup
    vi.mocked(prisma.user.findUnique).mockResolvedValue(mockUser as any);
  });

  describe("GET /api/events", () => {
    it("should return events for authenticated venue", async () => {
      vi.mocked(prisma.event.findMany).mockResolvedValue([mockEvent] as any);

      const response = await GET();
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.events).toHaveLength(1);
      expect(data.events[0]).toMatchObject({
        id: "event1",
        title: "Test Event",
      });
      
      expect(prisma.event.findMany).toHaveBeenCalledWith({
        where: { venueId: "venue1" },
        include: {
          eventArtists: {
            include: {
              artist: { select: { id: true, name: true, slug: true } }
            },
            orderBy: { createdAt: "asc" }
          },
          _count: {
            select: { bookings: true }
          }
        },
        orderBy: { eventDate: "desc" },
      });
    });

    it("should return 403 for non-venue users", async () => {
      vi.mocked(prisma.user.findUnique).mockResolvedValue({
        ...mockUser,
        role: "ARTIST",
        venue: null,
      } as any);

      const response = await GET();
      
      expect(response.status).toBe(403);
    });

    it("should return 401 for unauthenticated users", async () => {
      vi.mocked(cookies).mockResolvedValue({
        get: vi.fn().mockReturnValue(undefined),
      } as any);

      const response = await GET();
      
      expect(response.status).toBe(401);
    });
  });

  describe("POST /api/events", () => {
    it("should create a new event with valid data", async () => {
      const newEventData = {
        title: "New Test Event",
        description: "A new test event",
        eventDate: "2025-12-15T19:00:00Z",
        hours: 4,
        budget: 750000,
        status: "DRAFT",
      };

      const createdEvent = {
        ...mockEvent,
        id: "event2",
        title: newEventData.title,
        slug: "new-test-event",
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
      expect(data.event).toMatchObject({
        id: "event2",
        title: "New Test Event",
        slug: "new-test-event",
      });
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
      expect(data.event.slug).toBe("test-event-1");
    });
  });
});