import { PrismaClient } from "@prisma/client";

export interface ApprovalWorkflowService {
  // Event approval workflows
  requestVenueApproval(eventId: string, venueId: string): Promise<{ success: boolean; message: string }>;
  approveEventForVenue(eventId: string, venueUserId: string): Promise<{ success: boolean; message: string }>;
  declineEventForVenue(eventId: string, venueUserId: string, reason?: string): Promise<{ success: boolean; message: string }>;
  
  // Performance workflows
  applyForPerformance(eventId: string, artistId: string, performanceData: any): Promise<{ success: boolean; performanceId?: string; message: string }>;
  approvePerformance(performanceId: string, venueUserId: string): Promise<{ success: boolean; message: string }>;
  declinePerformance(performanceId: string, venueUserId: string, reason?: string): Promise<{ success: boolean; message: string }>;
  
  // Notification helpers
  createNotification(type: string, userId: string, data: any): Promise<void>;
  getUnreadNotifications(userId: string): Promise<any[]>;
  markNotificationAsRead(notificationId: string, userId: string): Promise<void>;
}

/**
 * Comprehensive approval workflow system for Event-centric architecture
 * Handles both event approvals and performance applications/acceptances
 */
export class ApprovalWorkflows implements ApprovalWorkflowService {
  private prisma: PrismaClient;

  constructor(prisma: PrismaClient) {
    this.prisma = prisma;
  }

  /**
   * Artist requests venue approval for their event
   * Event status: DRAFT → PENDING_VENUE_APPROVAL
   */
  async requestVenueApproval(eventId: string, venueId: string): Promise<{ success: boolean; message: string }> {
    try {
      const event = await this.prisma.event.findUnique({
        where: { id: eventId },
        include: { creator: true }
      });

      if (!event) {
        return { success: false, message: "Event not found" };
      }

      if (event.status !== "DRAFT") {
        return { success: false, message: "Event is not in draft status" };
      }

      const venue = await this.prisma.venue.findUnique({
        where: { id: venueId },
        include: { user: true }
      });

      if (!venue) {
        return { success: false, message: "Venue not found" };
      }

      // Update event status
      await this.prisma.event.update({
        where: { id: eventId },
        data: { 
          status: "PENDING_VENUE_APPROVAL",
          venueId: venueId
        }
      });

      // Create notification for venue
      await this.createNotification("EVENT_VENUE_APPROVAL_REQUEST", venue.userId, {
        title: "New Event Approval Request",
        message: `${event.creator.name} wants to host "${event.title}" at your venue`,
        eventId: eventId,
        actionUrl: `/dashboard/events/${eventId}/approve`
      });

      return { success: true, message: "Venue approval requested successfully" };
    } catch (error) {
      console.error("Venue approval request error:", error);
      return { success: false, message: "Failed to request venue approval" };
    }
  }

  /**
   * Venue approves artist's event
   * Event status: PENDING_VENUE_APPROVAL → SEEKING_ARTISTS
   */
  async approveEventForVenue(eventId: string, venueUserId: string): Promise<{ success: boolean; message: string }> {
    try {
      const event = await this.prisma.event.findUnique({
        where: { id: eventId },
        include: { venue: true, creator: true }
      });

      if (!event || !event.venue || event.venue.userId !== venueUserId) {
        return { success: false, message: "Unauthorized or event not found" };
      }

      if (event.status !== "PENDING_VENUE_APPROVAL") {
        return { success: false, message: "Event is not pending venue approval" };
      }

      // Update event status
      await this.prisma.event.update({
        where: { id: eventId },
        data: { status: "SEEKING_ARTISTS" }
      });

      // Notify event creator
      await this.createNotification("EVENT_VENUE_APPROVED", event.createdBy, {
        title: "Event Approved!",
        message: `${event.venue.name} approved your event "${event.title}"`,
        eventId: eventId,
        actionUrl: `/dashboard/events/${eventId}`
      });

      return { success: true, message: "Event approved successfully" };
    } catch (error) {
      console.error("Event approval error:", error);
      return { success: false, message: "Failed to approve event" };
    }
  }

  /**
   * Venue declines artist's event
   * Event status: PENDING_VENUE_APPROVAL → CANCELLED
   */
  async declineEventForVenue(eventId: string, venueUserId: string, reason?: string): Promise<{ success: boolean; message: string }> {
    try {
      const event = await this.prisma.event.findUnique({
        where: { id: eventId },
        include: { venue: true, creator: true }
      });

      if (!event || !event.venue || event.venue.userId !== venueUserId) {
        return { success: false, message: "Unauthorized or event not found" };
      }

      if (event.status !== "PENDING_VENUE_APPROVAL") {
        return { success: false, message: "Event is not pending venue approval" };
      }

      // Update event status
      await this.prisma.event.update({
        where: { id: eventId },
        data: { status: "CANCELLED" }
      });

      // Notify event creator
      await this.createNotification("EVENT_VENUE_DECLINED", event.createdBy, {
        title: "Event Declined",
        message: `${event.venue.name} declined your event "${event.title}"${reason ? `: ${reason}` : ''}`,
        eventId: eventId,
        actionUrl: `/dashboard/events/${eventId}`
      });

      return { success: true, message: "Event declined" };
    } catch (error) {
      console.error("Event decline error:", error);
      return { success: false, message: "Failed to decline event" };
    }
  }

  /**
   * Artist applies to perform at an event
   * Creates Performance in PENDING status
   */
  async applyForPerformance(eventId: string, artistId: string, performanceData: any): Promise<{ success: boolean; performanceId?: string; message: string }> {
    try {
      const event = await this.prisma.event.findUnique({
        where: { id: eventId },
        include: { venue: { include: { user: true } } }
      });

      if (!event) {
        return { success: false, message: "Event not found" };
      }

      if (!["DRAFT", "SEEKING_ARTISTS", "PENDING"].includes(event.status)) {
        return { success: false, message: "Event is not accepting new artists" };
      }

      // Check if artist already applied
      const existingPerformance = await this.prisma.performance.findUnique({
        where: { eventId_artistId: { eventId, artistId } }
      });

      if (existingPerformance) {
        return { success: false, message: "Artist already applied for this event" };
      }

      // Create performance
      const performance = await this.prisma.performance.create({
        data: {
          eventId,
          artistId,
          proposedFee: performanceData.proposedFee,
          hours: performanceData.hours,
          notes: performanceData.notes,
          artistNotes: performanceData.artistNotes,
          status: "PENDING"
        },
        include: {
          artist: { select: { name: true } }
        }
      });

      // Notify venue (if internal venue)
      if (event.venue) {
        await this.createNotification("PERFORMANCE_APPLICATION", event.venue.userId, {
          title: "New Performance Application",
          message: `${performance.artist.name} applied to perform at "${event.title}"`,
          eventId: eventId,
          performanceId: performance.id,
          actionUrl: `/dashboard/events/${eventId}/performances/${performance.id}`
        });
      }

      return { 
        success: true, 
        performanceId: performance.id,
        message: "Performance application submitted successfully" 
      };
    } catch (error) {
      console.error("Performance application error:", error);
      return { success: false, message: "Failed to submit performance application" };
    }
  }

  /**
   * Venue/Event creator accepts artist's performance
   * Performance status: PENDING → CONFIRMED
   */
  async approvePerformance(performanceId: string, venueUserId: string): Promise<{ success: boolean; message: string }> {
    try {
      const performance = await this.prisma.performance.findUnique({
        where: { id: performanceId },
        include: {
          event: { include: { venue: true, creator: true } },
          artist: { include: { user: true } }
        }
      });

      if (!performance) {
        return { success: false, message: "Performance not found" };
      }

      // Check authorization (venue owner or event creator)
      const isVenueOwner = performance.event.venue?.userId === venueUserId;
      const isEventCreator = performance.event.createdBy === venueUserId;
      
      if (!isVenueOwner && !isEventCreator) {
        return { success: false, message: "Unauthorized to approve this performance" };
      }

      if (performance.status !== "PENDING") {
        return { success: false, message: "Performance is not pending approval" };
      }

      // Update performance status
      await this.prisma.performance.update({
        where: { id: performanceId },
        data: { status: "CONFIRMED" }
      });

      // Notify artist
      await this.createNotification("PERFORMANCE_ACCEPTED", performance.artist.userId, {
        title: "Performance Accepted!",
        message: `Your performance at "${performance.event.title}" has been accepted`,
        eventId: performance.event.id,
        performanceId: performanceId,
        actionUrl: `/dashboard/performances/${performanceId}`
      });

      return { success: true, message: "Performance approved successfully" };
    } catch (error) {
      console.error("Performance approval error:", error);
      return { success: false, message: "Failed to approve performance" };
    }
  }

  /**
   * Venue/Event creator declines artist's performance
   * Performance status: PENDING → DECLINED
   */
  async declinePerformance(performanceId: string, venueUserId: string, reason?: string): Promise<{ success: boolean; message: string }> {
    try {
      const performance = await this.prisma.performance.findUnique({
        where: { id: performanceId },
        include: {
          event: { include: { venue: true } },
          artist: { include: { user: true } }
        }
      });

      if (!performance) {
        return { success: false, message: "Performance not found" };
      }

      // Check authorization
      const isVenueOwner = performance.event.venue?.userId === venueUserId;
      const isEventCreator = performance.event.createdBy === venueUserId;
      
      if (!isVenueOwner && !isEventCreator) {
        return { success: false, message: "Unauthorized to decline this performance" };
      }

      if (performance.status !== "PENDING") {
        return { success: false, message: "Performance is not pending approval" };
      }

      // Update performance status
      await this.prisma.performance.update({
        where: { id: performanceId },
        data: { status: "DECLINED" }
      });

      // Notify artist
      await this.createNotification("PERFORMANCE_DECLINED", performance.artist.userId, {
        title: "Performance Declined",
        message: `Your performance application for "${performance.event.title}" was declined${reason ? `: ${reason}` : ''}`,
        eventId: performance.event.id,
        performanceId: performanceId,
        actionUrl: `/dashboard/performances/${performanceId}`
      });

      return { success: true, message: "Performance declined" };
    } catch (error) {
      console.error("Performance decline error:", error);
      return { success: false, message: "Failed to decline performance" };
    }
  }

  /**
   * Create a notification for a user
   */
  async createNotification(type: string, userId: string, data: any): Promise<void> {
    try {
      await this.prisma.notification.create({
        data: {
          type: type as any,
          userId,
          eventId: data.eventId || null,
          performanceId: data.performanceId || null,
          title: data.title,
          message: data.message,
          actionUrl: data.actionUrl || null,
        }
      });
    } catch (error) {
      console.error("Notification creation error:", error);
    }
  }

  /**
   * Get unread notifications for a user
   */
  async getUnreadNotifications(userId: string): Promise<any[]> {
    return this.prisma.notification.findMany({
      where: {
        userId,
        isRead: false
      },
      include: {
        event: { select: { id: true, title: true } },
        performance: { 
          select: { 
            id: true, 
            event: { select: { title: true } },
            artist: { select: { name: true } }
          }
        }
      },
      orderBy: { createdAt: "desc" }
    });
  }

  /**
   * Mark notification as read
   */
  async markNotificationAsRead(notificationId: string, userId: string): Promise<void> {
    await this.prisma.notification.updateMany({
      where: {
        id: notificationId,
        userId // Security: only allow user to mark their own notifications
      },
      data: {
        isRead: true,
        readAt: new Date()
      }
    });
  }
}

/**
 * Enhanced event status calculation including approval workflows
 */
export function calculateEventStatusWithApprovals(
  event: { status: string; createdBy: string; venueId?: string | null },
  performances: { status: string }[] = []
): string {
  // Handle approval workflow statuses
  if (event.status === "PENDING_VENUE_APPROVAL") {
    return "PENDING_VENUE_APPROVAL";
  }

  // Artist created event without venue needs venue
  if (!event.venueId && event.status === "DRAFT") {
    return "SEEKING_VENUE";
  }

  // Rest follows normal event status logic
  if (performances.length === 0) {
    return event.status === "DRAFT" ? "SEEKING_ARTISTS" : event.status;
  }

  const confirmed = performances.filter(p => p.status === "CONFIRMED").length;
  const pending = performances.filter(p => p.status === "PENDING").length;
  const declined = performances.filter(p => p.status === "DECLINED").length;

  if (confirmed > 0 && pending === 0) {
    return "CONFIRMED";
  } else if (confirmed > 0 || pending > 0) {
    return "PENDING";
  } else if (declined === performances.length) {
    return "SEEKING_ARTISTS"; // All declined, seek more artists
  }

  return "SEEKING_ARTISTS";
}

/**
 * Check if user can take action on performance
 */
export function canUserManagePerformance(
  performance: { 
    event: { createdBy: string; venue?: { userId: string } | null };
    artistId: string;
  },
  userId: string,
  userRole: string
): { canApprove: boolean; canDecline: boolean; canModify: boolean } {
  const isEventCreator = performance.event.createdBy === userId;
  const isVenueOwner = performance.event.venue?.userId === userId;
  const isArtist = performance.artistId === userId; // This would need artist.userId
  const isAdmin = userRole === "ADMIN";

  return {
    canApprove: isEventCreator || isVenueOwner || isAdmin,
    canDecline: isEventCreator || isVenueOwner || isAdmin,
    canModify: isArtist || isAdmin
  };
}