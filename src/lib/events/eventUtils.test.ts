import { describe, it, expect } from "vitest";
import {
  generateSlug,
  validateEventCreation,
  validatePerformance,
  calculateEventStatus,
  canUserCreateEventAtVenue,
  canArtistPerformAtEvent,
  calculateTotalEventCost,
  hasSchedulingConflict,
  EventCreationData,
  PerformanceData,
} from "./eventUtils";

describe("Event Management Utilities", () => {
  describe("generateSlug", () => {
    it("should generate clean slug from title", () => {
      expect(generateSlug("Jazz Night at Blue Moon")).toBe("jazz-night-at-blue-moon");
      expect(generateSlug("Rock & Roll Show!!!")).toBe("rock-roll-show");
      expect(generateSlug("  Multiple   Spaces  ")).toBe("multiple-spaces");
      expect(generateSlug("Special-Characters@#$%")).toBe("special-characters");
    });

    it("should handle empty or invalid input", () => {
      expect(generateSlug("")).toBe("");
      expect(generateSlug("   ")).toBe("");
      expect(generateSlug("@#$%")).toBe("");
    });
  });

  describe("validateEventCreation", () => {
    const validEventData: EventCreationData = {
      createdBy: "user123",
      title: "Jazz Night",
      eventDate: new Date(Date.now() + 86400000), // Tomorrow
      venueId: "venue123",
    };

    it("should validate correct event data", () => {
      const result = validateEventCreation(validEventData);
      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it("should require title", () => {
      const result = validateEventCreation({
        ...validEventData,
        title: "",
      });
      expect(result.valid).toBe(false);
      expect(result.errors).toContain("Title is required");
    });

    it("should require future event date", () => {
      const result = validateEventCreation({
        ...validEventData,
        eventDate: new Date(Date.now() - 86400000), // Yesterday
      });
      expect(result.valid).toBe(false);
      expect(result.errors).toContain("Event date must be in the future");
    });

    it("should require either internal or external venue", () => {
      const result = validateEventCreation({
        ...validEventData,
        venueId: undefined,
      });
      expect(result.valid).toBe(false);
      expect(result.errors).toContain("Either venue ID or external venue name is required");
    });

    it("should accept external venue details", () => {
      const result = validateEventCreation({
        ...validEventData,
        venueId: undefined,
        externalVenueName: "Blue Moon Coffee",
        externalVenueAddress: "123 Main St",
      });
      expect(result.valid).toBe(true);
    });

    it("should not allow both internal and external venue", () => {
      const result = validateEventCreation({
        ...validEventData,
        externalVenueName: "External Venue",
      });
      expect(result.valid).toBe(false);
      expect(result.errors).toContain("Cannot specify both internal venue and external venue");
    });

    it("should validate positive numbers", () => {
      const result = validateEventCreation({
        ...validEventData,
        totalHours: -1,
        totalBudget: -100,
      });
      expect(result.valid).toBe(false);
      expect(result.errors).toContain("Total hours must be positive");
      expect(result.errors).toContain("Total budget must be positive");
    });
  });

  describe("validatePerformance", () => {
    const validPerformanceData: PerformanceData = {
      eventId: "event123",
      artistId: "artist123",
      proposedFee: 25000,
      hours: 2,
    };

    it("should validate correct performance data", () => {
      const result = validatePerformance(validPerformanceData);
      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it("should require event and artist IDs", () => {
      const result = validatePerformance({
        ...validPerformanceData,
        eventId: "",
        artistId: "",
      });
      expect(result.valid).toBe(false);
      expect(result.errors).toContain("Event ID is required");
      expect(result.errors).toContain("Artist ID is required");
    });

    it("should validate non-negative fees", () => {
      const result = validatePerformance({
        ...validPerformanceData,
        proposedFee: -100,
        agreedFee: -200,
      });
      expect(result.valid).toBe(false);
      expect(result.errors).toContain("Proposed fee cannot be negative");
      expect(result.errors).toContain("Agreed fee cannot be negative");
    });

    it("should validate positive hours", () => {
      const result = validatePerformance({
        ...validPerformanceData,
        hours: -1,
      });
      expect(result.valid).toBe(false);
      expect(result.errors).toContain("Performance hours must be positive");
    });
  });

  describe("calculateEventStatus", () => {
    it("should return DRAFT for no performances", () => {
      expect(calculateEventStatus([])).toBe("DRAFT");
    });

    it("should return CONFIRMED when all performances confirmed", () => {
      const performances = [
        { status: "CONFIRMED" },
        { status: "CONFIRMED" },
      ];
      expect(calculateEventStatus(performances)).toBe("CONFIRMED");
    });

    it("should return PENDING when some performances confirmed", () => {
      const performances = [
        { status: "CONFIRMED" },
        { status: "PENDING" },
      ];
      expect(calculateEventStatus(performances)).toBe("PENDING");
    });

    it("should return CANCELLED when all performances declined", () => {
      const performances = [
        { status: "DECLINED" },
        { status: "DECLINED" },
      ];
      expect(calculateEventStatus(performances)).toBe("CANCELLED");
    });

    it("should return SEEKING_ARTISTS for mixed pending/declined", () => {
      const performances = [
        { status: "PENDING" },
        { status: "DECLINED" },
      ];
      expect(calculateEventStatus(performances)).toBe("SEEKING_ARTISTS");
    });
  });

  describe("canUserCreateEventAtVenue", () => {
    it("should allow admin to create events anywhere", () => {
      expect(canUserCreateEventAtVenue("ADMIN", "admin123", "venue456")).toBe(true);
    });

    it("should allow venue owner to create events at their venue", () => {
      expect(canUserCreateEventAtVenue("VENUE", "venue123", "venue123")).toBe(true);
    });

    it("should not allow venue owner to create events at other venues", () => {
      expect(canUserCreateEventAtVenue("VENUE", "venue123", "venue456")).toBe(false);
    });

    it("should allow artists to create events (with potential approval needed)", () => {
      expect(canUserCreateEventAtVenue("ARTIST", "artist123", "venue456")).toBe(true);
    });
  });

  describe("canArtistPerformAtEvent", () => {
    const existingPerformances = [
      { artistId: "artist456" },
      { artistId: "artist789" },
    ];

    it("should allow artist to perform at seeking artists event", () => {
      const result = canArtistPerformAtEvent("artist123", "creator123", "SEEKING_ARTISTS", existingPerformances);
      expect(result.canPerform).toBe(true);
    });

    it("should not allow duplicate artist performance", () => {
      const result = canArtistPerformAtEvent("artist456", "creator123", "SEEKING_ARTISTS", existingPerformances);
      expect(result.canPerform).toBe(false);
      expect(result.reason).toBe("Artist already performing at this event");
    });

    it("should not allow performance at closed events", () => {
      const result = canArtistPerformAtEvent("artist123", "creator123", "COMPLETED", existingPerformances);
      expect(result.canPerform).toBe(false);
      expect(result.reason).toBe("Event is not accepting new artists");
    });

    it("should allow performance at draft/pending events", () => {
      const statuses = ["DRAFT", "PENDING"];
      
      statuses.forEach(status => {
        const result = canArtistPerformAtEvent("artist123", "creator123", status, existingPerformances);
        expect(result.canPerform).toBe(true);
      });
    });
  });

  describe("calculateTotalEventCost", () => {
    it("should calculate confirmed and estimated costs", () => {
      const performances = [
        { agreedFee: 30000 }, // Confirmed
        { proposedFee: 25000 }, // Estimated only
        { agreedFee: 20000 }, // Confirmed
        { proposedFee: 15000, agreedFee: 18000 }, // Use agreed over proposed
      ];

      const result = calculateTotalEventCost(performances);
      expect(result.confirmed).toBe(68000); // 30000 + 20000 + 18000
      expect(result.estimated).toBe(93000); // 30000 + 25000 + 20000 + 18000
    });

    it("should handle empty performances", () => {
      const result = calculateTotalEventCost([]);
      expect(result.confirmed).toBe(0);
      expect(result.estimated).toBe(0);
    });

    it("should handle performances with no fees", () => {
      const performances = [
        { agreedFee: undefined, proposedFee: undefined },
        { agreedFee: 0, proposedFee: 0 },
      ];

      const result = calculateTotalEventCost(performances);
      expect(result.confirmed).toBe(0);
      expect(result.estimated).toBe(0);
    });
  });

  describe("hasSchedulingConflict", () => {
    const eventDate = new Date("2025-12-15T20:00:00");
    const eventHours = 2;

    it("should detect overlapping events", () => {
      const existingEvents = [
        {
          eventDate: new Date("2025-12-15T19:00:00"), // Starts 1 hour before
          hours: 2, // Ends 1 hour after new event starts
        },
      ];

      expect(hasSchedulingConflict(eventDate, eventHours, existingEvents)).toBe(true);
    });

    it("should not detect non-overlapping events", () => {
      const existingEvents = [
        {
          eventDate: new Date("2025-12-15T17:00:00"), // Ends before new event
          hours: 2,
        },
        {
          eventDate: new Date("2025-12-15T23:00:00"), // Starts after new event
          hours: 1,
        },
      ];

      expect(hasSchedulingConflict(eventDate, eventHours, existingEvents)).toBe(false);
    });

    it("should detect exact same time conflict", () => {
      const existingEvents = [
        {
          eventDate: new Date("2025-12-15T20:00:00"), // Same start time
          hours: 1,
        },
      ];

      expect(hasSchedulingConflict(eventDate, eventHours, existingEvents)).toBe(true);
    });

    it("should use default 2 hours when hours not specified", () => {
      const existingEvents = [
        {
          eventDate: new Date("2025-12-15T21:30:00"), // Would conflict with 2-hour default
        },
      ];

      expect(hasSchedulingConflict(eventDate, eventHours, existingEvents)).toBe(true);
    });

    it("should handle edge case - events touching but not overlapping", () => {
      const existingEvents = [
        {
          eventDate: new Date("2025-12-15T18:00:00"), // Ends exactly when new event starts
          hours: 2,
        },
      ];

      expect(hasSchedulingConflict(eventDate, eventHours, existingEvents)).toBe(false);
    });
  });
});