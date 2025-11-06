import { describe, it, expect, beforeEach, vi, type MockedFunction } from "vitest";
import { PATCH } from "./route";
import { verifyIdToken } from "@/lib/auth/cognito";
import { prisma } from "@/lib/prisma";
import { cookies } from "next/headers";
import { createBookingRequestsForEvent, cancelBookingRequestsForEvent } from "@/lib/booking/eventPublishing";

// Mock all dependencies
vi.mock("@/lib/auth/cognito");
vi.mock("@/lib/prisma", () => ({
  prisma: {
    user: {
      findUnique: vi.fn()
    },
    event: {
      findUnique: vi.fn(),
      update: vi.fn()
    }
  }
}));
vi.mock("next/headers");
vi.mock("@/lib/booking/eventPublishing");

const mockVerifyIdToken = verifyIdToken as MockedFunction<typeof verifyIdToken>;
const mockPrisma = prisma as any;
const mockCookies = cookies as MockedFunction<typeof cookies>;
const mockCreateBookingRequests = createBookingRequestsForEvent as MockedFunction<typeof createBookingRequestsForEvent>;
const mockCancelBookingRequests = cancelBookingRequestsForEvent as MockedFunction<typeof cancelBookingRequestsForEvent>;

describe("PATCH /api/events/[id] - Status Changes", () => {
  const mockUser = {
    id: "user-1",
    email: "venue@test.com",
    role: "VENUE",
    venue: { id: "venue-1", name: "Test Venue" }
  };

  const mockEvent = {
    id: "event-1",
    venueId: "venue-1",
    slug: "test-event",
    status: "DRAFT"
  };

  beforeEach(() => {
    vi.clearAllMocks();
    
    // Default successful auth setup
    mockCookies.mockResolvedValue({
      get: vi.fn().mockReturnValue({ value: "valid-token" })
    } as any);
    
    mockVerifyIdToken.mockResolvedValue({ email: "venue@test.com" });
    mockPrisma.user.findUnique.mockResolvedValue(mockUser);
  });

  it("should create booking requests when event status changes to PUBLISHED", async () => {
    // Setup mocks for this specific test
    mockPrisma.event.findUnique
      .mockResolvedValueOnce(mockEvent) // First call for authorization check
      .mockResolvedValueOnce({ status: "DRAFT" }); // Second call for status comparison
    
    const updatedEvent = {
      ...mockEvent,
      status: "PUBLISHED",
      eventArtists: []
    };
    
    mockPrisma.event.update.mockResolvedValue(updatedEvent);

    const request = new Request("http://localhost/api/events/event-1", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: "PUBLISHED" })
    });

    const response = await PATCH(request, { params: { id: "event-1" } });
    
    expect(response.status).toBe(200);
    expect(mockCreateBookingRequests).toHaveBeenCalledWith("event-1");
    expect(mockCancelBookingRequests).not.toHaveBeenCalled();
  });

  it("should cancel booking requests when event status changes from PUBLISHED to DRAFT", async () => {
    // Setup event as currently PUBLISHED  
    mockPrisma.event.findUnique
      .mockResolvedValueOnce(mockEvent) // First call for authorization check
      .mockResolvedValueOnce({ status: "PUBLISHED" }); // Second call for status comparison - current status is PUBLISHED

    const updatedEvent = {
      ...mockEvent,
      status: "DRAFT",
      eventArtists: []
    };
    
    mockPrisma.event.update.mockResolvedValue(updatedEvent);

    const request = new Request("http://localhost/api/events/event-1", {
      method: "PATCH", 
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: "DRAFT" })
    });

    const response = await PATCH(request, { params: { id: "event-1" } });
    
    expect(response.status).toBe(200);
    expect(mockCancelBookingRequests).toHaveBeenCalledWith("event-1");
    expect(mockCreateBookingRequests).not.toHaveBeenCalled();
  });

  it("should cancel booking requests when event status changes from PUBLISHED to CANCELLED", async () => {
    // Setup event as currently PUBLISHED
    mockPrisma.event.findUnique
      .mockResolvedValueOnce(mockEvent) // First call for authorization check
      .mockResolvedValueOnce({ status: "PUBLISHED" }); // Second call for status comparison

    const updatedEvent = {
      ...mockEvent,
      status: "CANCELLED",
      eventArtists: []
    };
    
    mockPrisma.event.update.mockResolvedValue(updatedEvent);

    const request = new Request("http://localhost/api/events/event-1", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: "CANCELLED" })
    });

    const response = await PATCH(request, { params: { id: "event-1" } });
    
    expect(response.status).toBe(200);
    expect(mockCancelBookingRequests).toHaveBeenCalledWith("event-1");
    expect(mockCreateBookingRequests).not.toHaveBeenCalled();
  });

  it("should not trigger booking actions when status doesn't change", async () => {
    // Setup mocks for this specific test
    mockPrisma.event.findUnique
      .mockResolvedValueOnce(mockEvent) // First call for authorization check
      .mockResolvedValueOnce({ status: "DRAFT" }); // Second call for status comparison
    
    // Status stays the same (DRAFT -> DRAFT)
    const updatedEvent = {
      ...mockEvent,
      status: "DRAFT",
      eventArtists: []
    };
    
    mockPrisma.event.update.mockResolvedValue(updatedEvent);

    const request = new Request("http://localhost/api/events/event-1", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title: "Updated Title" }) // No status change
    });

    const response = await PATCH(request, { params: { id: "event-1" } });
    
    expect(response.status).toBe(200);
    expect(mockCreateBookingRequests).not.toHaveBeenCalled();
    expect(mockCancelBookingRequests).not.toHaveBeenCalled();
  });

  it("should continue successfully even if booking creation fails", async () => {
    // Setup mocks for this specific test
    mockPrisma.event.findUnique
      .mockResolvedValueOnce(mockEvent) // First call for authorization check
      .mockResolvedValueOnce({ status: "DRAFT" }); // Second call for status comparison
    
    const updatedEvent = {
      ...mockEvent,
      status: "PUBLISHED",
      eventArtists: []
    };
    
    mockPrisma.event.update.mockResolvedValue(updatedEvent);
    mockCreateBookingRequests.mockRejectedValue(new Error("Booking creation failed"));

    const request = new Request("http://localhost/api/events/event-1", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: "PUBLISHED" })
    });

    const response = await PATCH(request, { params: { id: "event-1" } });
    
    // Should still return success even though booking creation failed
    expect(response.status).toBe(200);
    
    const data = await response.json();
    expect(data.event).toEqual(updatedEvent);
  });
});