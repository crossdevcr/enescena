import { NotificationType, PrismaClient } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { sendEmail } from "@/lib/email/mailer";
import {
  performanceInvitationForArtist,
  invitationAcceptedForVenue,
  invitationDeclinedForVenue,
  eventRequestForVenue,
  eventRequestApprovedForArtist,
  eventRequestDeclinedForArtist,
  performanceCancelledForArtist
} from "@/lib/email/templates";

export interface ApprovalWorkflowService {
  // Event request workflows (Artist requests event at venue)
  requestEventAtVenue(venueId: string, artistUserId: string, eventData: Record<string, unknown>): Promise<{ success: boolean; eventId?: string; message: string }>;
  approveEventRequest(eventId: string, venueUserId: string): Promise<{ success: boolean; message: string }>;
  declineEventRequest(eventId: string, venueUserId: string, reason?: string): Promise<{ success: boolean; message: string }>;
  
  // Performance invitation workflows (Venue invites artist to perform)
  inviteArtistToPerform(eventId: string, artistId: string, venueUserId: string, performanceData: Record<string, unknown>): Promise<{ success: boolean; performanceId?: string; message: string }>;
  acceptPerformanceInvitation(performanceId: string, artistUserId: string): Promise<{ success: boolean; message: string }>;
  declinePerformanceInvitation(performanceId: string, artistUserId: string, reason?: string): Promise<{ success: boolean; message: string }>;
  
  // Event cancellation workflows
  cancelAllPerformancesForEvent(eventId: string, cancellationReason?: string): Promise<{ success: boolean; cancelledCount: number; message: string }>;
  
  // Notification helpers
  createNotification(type: NotificationType, userId: string, data: Record<string, unknown>): Promise<void>;
  getUnreadNotifications(userId: string): Promise<Record<string, unknown>[]>;
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
   * Artist requests to create event at venue
   * Creates event in PENDING_VENUE_APPROVAL status
   */
  async requestEventAtVenue(venueId: string, artistUserId: string, eventData: Record<string, unknown>): Promise<{ success: boolean; eventId?: string; message: string }> {
    try {
      const venue = await this.prisma.venue.findUnique({
        where: { id: venueId },
        include: { user: true }
      });

      if (!venue) {
        return { success: false, message: "Venue not found" };
      }

      const artist = await this.prisma.user.findUnique({
        where: { id: artistUserId },
        include: { artist: true }
      });

      if (!artist || artist.role !== "ARTIST") {
        return { success: false, message: "Artist not found" };
      }

      // Create event with PENDING_VENUE_APPROVAL status
      const event = await this.prisma.event.create({
        data: {
          title: eventData.title as string,
          description: eventData.description as string,
          eventDate: new Date(eventData.eventDate as string | number),
          endDate: eventData.endDate ? new Date(eventData.endDate as string | number) : null,
          totalHours: eventData.totalHours as number,
          totalBudget: eventData.totalBudget as number,
          status: "PENDING_VENUE_APPROVAL",
          createdBy: artistUserId,
          venueId: venueId,
          slug: `${(eventData.title as string).toLowerCase().replace(/\s+/g, '-')}-${Date.now()}`
        }
      });

      // Create notification for venue
      await this.createNotification("EVENT_REQUEST" as NotificationType, venue.userId, {
        title: "New Event Request",
        message: `${artist.name} wants to host "${eventData.title as string}" at your venue on ${new Date(eventData.eventDate as string | number).toLocaleDateString()}`,
        eventId: event.id,
        actionUrl: `/dashboard/events/${event.id}/approve`
      });

      // Send email to venue
      if (venue.user?.email) {
        try {
          const emailTemplate = eventRequestForVenue({
            venueName: venue.user.name || venue.name,
            artistName: artist.name || "An artist",
            eventTitle: eventData.title as string,
            eventISO: event.eventDate.toISOString(),
            budget: eventData.totalBudget as number,
            eventId: event.id
          });
          
          await sendEmail({
            to: venue.user.email,
            ...emailTemplate
          });
          
          console.log(`Event request email sent to ${venue.user.email}`);
        } catch (emailError) {
          console.error("Failed to send event request email:", emailError);
          // Don't fail the request if email fails
        }
      }

      return { success: true, eventId: event.id, message: "Event request sent successfully" };
    } catch (error) {
      console.error("Event request error:", error);
      return { success: false, message: "Failed to request event" };
    }
  }

  /**
   * Venue approves artist's event request
   * Event status: PENDING_VENUE_APPROVAL → SEEKING_ARTISTS
   */
  async approveEventRequest(eventId: string, venueUserId: string): Promise<{ success: boolean; message: string }> {
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

      // Notify event creator (artist)
      await this.createNotification("EVENT_REQUEST_APPROVED" as NotificationType, event.createdBy, {
        title: "Event Request Approved!",
        message: `${event.venue.name} approved your event request for "${event.title}"`,
        eventId: eventId,
        actionUrl: `/dashboard/events/${eventId}`
      });

      // Send email to artist
      if (event.creator?.email) {
        try {
          const emailTemplate = eventRequestApprovedForArtist({
            artistName: event.creator.name || "there",
            venueName: event.venue.name,
            eventTitle: event.title,
            eventISO: event.eventDate.toISOString(),
            eventId: eventId
          });
          
          await sendEmail({
            to: event.creator.email,
            ...emailTemplate
          });
          
          console.log(`Event approval email sent to ${event.creator.email}`);
        } catch (emailError) {
          console.error("Failed to send event approval email:", emailError);
          // Don't fail the approval if email fails
        }
      }

      return { success: true, message: "Event request approved successfully" };
    } catch (error) {
      console.error("Event approval error:", error);
      return { success: false, message: "Failed to approve event request" };
    }
  }

  /**
   * Venue declines artist's event request
   * Event status: PENDING_VENUE_APPROVAL → CANCELLED
   */
  async declineEventRequest(eventId: string, venueUserId: string, reason?: string): Promise<{ success: boolean; message: string }> {
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

      // Notify event creator (artist)
      await this.createNotification("EVENT_REQUEST_DECLINED" as NotificationType, event.createdBy, {
        title: "Event Request Declined",
        message: `${event.venue.name} declined your event request for "${event.title}"${reason ? `: ${reason}` : ''}`,
        eventId: eventId,
        actionUrl: `/dashboard/events/${eventId}`
      });

      // Send email to artist
      if (event.creator?.email) {
        try {
          const emailTemplate = eventRequestDeclinedForArtist({
            artistName: event.creator.name || "there",
            venueName: event.venue.name,
            eventTitle: event.title,
            reason: reason,
            eventId: eventId
          });
          
          await sendEmail({
            to: event.creator.email,
            ...emailTemplate
          });
          
          console.log(`Event decline email sent to ${event.creator.email}`);
        } catch (emailError) {
          console.error("Failed to send event decline email:", emailError);
          // Don't fail the decline if email fails
        }
      }

      return { success: true, message: "Event request declined" };
    } catch (error) {
      console.error("Event decline error:", error);
      return { success: false, message: "Failed to decline event request" };
    }
  }

  /**
   * Artist applies to perform at an event
   * Creates Performance in PENDING status
   */
  /**
   * Venue invites artist to perform at an event
   * Creates Performance in PENDING status (invitation)
   */
  async inviteArtistToPerform(eventId: string, artistId: string, venueUserId: string, performanceData: Record<string, unknown>): Promise<{ success: boolean; performanceId?: string; message: string }> {
    try {
      const event = await this.prisma.event.findUnique({
        where: { id: eventId },
        include: { venue: true }
      });

      if (!event) {
        return { success: false, message: "Event not found" };
      }

      // Check authorization - only venue owner or event creator can invite
      const isVenueOwner = event.venue?.userId === venueUserId;
      const isEventCreator = event.createdBy === venueUserId;
      
      if (!isVenueOwner && !isEventCreator) {
        return { success: false, message: "Unauthorized to invite artists" };
      }

      if (!["DRAFT", "SEEKING_ARTISTS", "PENDING"].includes(event.status)) {
        return { success: false, message: "Event is not accepting new artists" };
      }

      // Check if artist already has a performance for this event
      const existingPerformance = await this.prisma.performance.findUnique({
        where: {
          eventId_artistId: {
            eventId: eventId,
            artistId: artistId
          }
        }
      });

      if (existingPerformance) {
        return { success: false, message: "Artist is already invited or performing at this event" };
      }

      const artist = await this.prisma.artist.findUnique({
        where: { id: artistId },
        include: { user: true }
      });

      if (!artist) {
        return { success: false, message: "Artist not found" };
      }

      // Create performance invitation
      const performance = await this.prisma.performance.create({
        data: {
          eventId: eventId,
          artistId: artistId,
          status: "PENDING",
          proposedFee: performanceData.proposedFee as number || null,
          hours: performanceData.hours as number || null,
          venueNotes: performanceData.venueNotes as string || null,
          startTime: performanceData.startTime ? new Date(performanceData.startTime as string | number) : null,
          endTime: performanceData.endTime ? new Date(performanceData.endTime as string | number) : null
        }
      });

      // Notify artist
      await this.createNotification("PERFORMANCE_INVITATION" as NotificationType, artist.userId, {
        title: "Performance Invitation",
        message: `You've been invited to perform at "${event.title}"`,
        eventId: eventId,
        performanceId: performance.id,
        actionUrl: `/dashboard/performances/${performance.id}`
      });

      // Send email invitation
      if (artist.user?.email) {
        try {
          const emailTemplate = performanceInvitationForArtist({
            artistName: artist.user.name || artist.name,
            venueName: event.venue?.name || "the venue",
            eventTitle: event.title,
            eventISO: event.eventDate.toISOString(),
            hours: performanceData.hours as number,
            performanceId: performance.id
          });
          
          await sendEmail({
            to: artist.user.email,
            ...emailTemplate
          });
          
          console.log(`Performance invitation email sent to ${artist.user.email}`);
        } catch (emailError) {
          console.error("Failed to send performance invitation email:", emailError);
          // Don't fail the invitation if email fails
        }
      }

      return { success: true, performanceId: performance.id, message: "Artist invitation sent successfully" };
    } catch (error) {
      console.error("Artist invitation error:", error);
      return { success: false, message: "Failed to invite artist" };
    }
  }

  /**
   * Artist accepts venue's performance invitation
   * Performance status: PENDING → CONFIRMED
   */
  async acceptPerformanceInvitation(performanceId: string, artistUserId: string): Promise<{ success: boolean; message: string }> {
    try {
      const performance = await this.prisma.performance.findUnique({
        where: { id: performanceId },
        include: {
          event: { include: { venue: true, creator: true } },
          artist: { include: { user: true } }
        }
      });

      if (!performance) {
        return { success: false, message: "Performance invitation not found" };
      }

      // Check authorization - only the invited artist can accept
      if (performance.artist.userId !== artistUserId) {
        return { success: false, message: "Unauthorized to accept this invitation" };
      }

      if (performance.status !== "PENDING") {
        return { success: false, message: "Performance invitation is no longer pending" };
      }

      // Update performance status
      await this.prisma.performance.update({
        where: { id: performanceId },
        data: { status: "CONFIRMED" }
      });

      // Notify venue/event creator
      const notifyUserId = performance.event.venue?.userId || performance.event.createdBy;
      await this.createNotification("PERFORMANCE_INVITATION_ACCEPTED" as NotificationType, notifyUserId, {
        title: "Performance Invitation Accepted",
        message: `${performance.artist.name} accepted your invitation to perform at "${performance.event.title}"`,
        eventId: performance.event.id,
        performanceId: performanceId,
        actionUrl: `/dashboard/events/${performance.event.id}/performances`
      });

      // Send email to venue
      const venueUser = await this.prisma.user.findUnique({
        where: { id: notifyUserId }
      });

      if (venueUser?.email) {
        try {
          const emailTemplate = invitationAcceptedForVenue({
            venueName: venueUser.name || performance.event.venue?.name || "there",
            artistName: performance.artist.name,
            eventTitle: performance.event.title,
            eventISO: performance.event.eventDate.toISOString(),
            hours: performance.hours,
            performanceId: performanceId,
            eventId: performance.event.id
          });
          
          await sendEmail({
            to: venueUser.email,
            ...emailTemplate
          });
          
          console.log(`Invitation acceptance email sent to ${venueUser.email}`);
        } catch (emailError) {
          console.error("Failed to send invitation acceptance email:", emailError);
          // Don't fail the acceptance if email fails
        }
      }

      return { success: true, message: "Performance invitation accepted successfully" };
    } catch (error) {
      console.error("Performance invitation acceptance error:", error);
      return { success: false, message: "Failed to accept performance invitation" };
    }
  }

  /**
   * Artist declines venue's performance invitation
   * Performance status: PENDING → DECLINED
   */
  async declinePerformanceInvitation(performanceId: string, artistUserId: string, reason?: string): Promise<{ success: boolean; message: string }> {
    try {
      const performance = await this.prisma.performance.findUnique({
        where: { id: performanceId },
        include: {
          event: { include: { venue: true } },
          artist: { include: { user: true } }
        }
      });

      if (!performance) {
        return { success: false, message: "Performance invitation not found" };
      }

      // Check authorization - only the invited artist can decline
      if (performance.artist.userId !== artistUserId) {
        return { success: false, message: "Unauthorized to decline this invitation" };
      }

      if (performance.status !== "PENDING") {
        return { success: false, message: "Performance invitation is no longer pending" };
      }

      // Update performance status
      await this.prisma.performance.update({
        where: { id: performanceId },
        data: { status: "DECLINED" }
      });

      // Notify venue/event creator
      const notifyUserId = performance.event.venue?.userId || performance.event.createdBy;
      await this.createNotification("PERFORMANCE_INVITATION_DECLINED" as NotificationType, notifyUserId, {
        title: "Performance Invitation Declined",
        message: `${performance.artist.name} declined your invitation to perform at "${performance.event.title}"${reason ? `: ${reason}` : ''}`,
        eventId: performance.event.id,
        performanceId: performanceId,
        actionUrl: `/dashboard/events/${performance.event.id}/performances`
      });

      // Send email to venue
      const venueUser = await this.prisma.user.findUnique({
        where: { id: notifyUserId }
      });

      if (venueUser?.email) {
        try {
          const emailTemplate = invitationDeclinedForVenue({
            venueName: venueUser.name || performance.event.venue?.name || "there",
            artistName: performance.artist.name,
            eventTitle: performance.event.title,
            performanceId: performanceId,
            eventId: performance.event.id
          });
          
          await sendEmail({
            to: venueUser.email,
            ...emailTemplate
          });
          
          console.log(`Invitation decline email sent to ${venueUser.email}`);
        } catch (emailError) {
          console.error("Failed to send invitation decline email:", emailError);
          // Don't fail the decline if email fails
        }
      }

      return { success: true, message: "Performance invitation declined" };
    } catch (error) {
      console.error("Performance invitation decline error:", error);
      return { success: false, message: "Failed to decline performance invitation" };
    }
  }

  /**
   * Cancel all pending performance invitations for an event
   * Used when an event is cancelled
   */
  async cancelAllPerformancesForEvent(eventId: string, cancellationReason?: string): Promise<{ success: boolean; cancelledCount: number; message: string }> {
    try {
      // Get all active performances for this event (PENDING and CONFIRMED)
      // We don't cancel already CANCELLED, COMPLETED, or DECLINED performances
      const activePerformances = await this.prisma.performance.findMany({
        where: {
          eventId: eventId,
          status: {
            in: ["PENDING", "CONFIRMED"]
          }
        },
        include: {
          artist: { include: { user: true } },
          event: { include: { venue: true } }
        }
      });

      if (activePerformances.length === 0) {
        return { success: true, cancelledCount: 0, message: "No active performances to cancel" };
      }

      // Update all active performances to CANCELLED
      await this.prisma.performance.updateMany({
        where: {
          eventId: eventId,
          status: {
            in: ["PENDING", "CONFIRMED"]
          }
        },
        data: {
          status: "CANCELLED"
        }
      });

      // Send notifications and emails to each affected artist
      for (const performance of activePerformances) {
        try {
          // Create notification for artist
          const isConfirmed = performance.status === "CONFIRMED";
          const notificationTitle = isConfirmed ? "Performance Cancelled" : "Performance Invitation Cancelled";
          const notificationMessage = isConfirmed 
            ? `Your confirmed performance at "${performance.event.title}" has been cancelled${cancellationReason ? `: ${cancellationReason}` : ''}`
            : `Your invitation to perform at "${performance.event.title}" has been cancelled${cancellationReason ? `: ${cancellationReason}` : ''}`;
          
          await this.createNotification("PERFORMANCE_CANCELLED", performance.artist.userId, {
            title: notificationTitle,
            message: notificationMessage,
            eventId: eventId,
            performanceId: performance.id,
            actionUrl: `/dashboard/artist/events`
          });

          // Send email to artist if they have an email
          if (performance.artist.user?.email) {
            try {
              const emailTemplate = performanceCancelledForArtist({
                artistName: performance.artist.user.name || performance.artist.name,
                venueName: performance.event.venue?.name || 'the venue',
                eventTitle: performance.event.title,
                wasConfirmed: performance.status === "CONFIRMED",
                reason: cancellationReason,
                eventId: eventId
              });
              
              await sendEmail({
                to: performance.artist.user.email,
                ...emailTemplate
              });
              
              console.log(`Performance cancellation email sent to ${performance.artist.user.email} for event ${eventId}`);
            } catch (emailError) {
              console.error(`Failed to send performance cancellation email to artist ${performance.artist.id}:`, emailError);
            }
          }
        } catch (notificationError) {
          console.error(`Failed to notify artist ${performance.artist.id} of performance cancellation:`, notificationError);
        }
      }

      return { 
        success: true, 
        cancelledCount: activePerformances.length, 
        message: `Successfully cancelled ${activePerformances.length} performance(s) (including confirmed ones)`
      };
    } catch (error) {
      console.error("Event performance cancellation error:", error);
      return { success: false, cancelledCount: 0, message: "Failed to cancel performances" };
    }
  }

  /**
   * Create a notification for a user
   */
  async createNotification(type: NotificationType, userId: string, data: Record<string, unknown>): Promise<void> {
    try {
      await this.prisma.notification.create({
        data: {
          type: type,
          userId,
          eventId: (data.eventId as string) || null,
          performanceId: (data.performanceId as string) || null,
          title: data.title as string,
          message: data.message as string,
          actionUrl: (data.actionUrl as string) || null,
        }
      });
    } catch (error) {
      console.error("Notification creation error:", error);
    }
  }

  /**
   * Get unread notifications for a user
   */
  async getUnreadNotifications(userId: string): Promise<Record<string, unknown>[]> {
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