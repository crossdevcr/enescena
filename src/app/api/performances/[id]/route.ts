import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth/currentUser";
import { ApprovalWorkflows } from "@/lib/events/approvalWorkflows";

/**
 * PATCH /api/performances/[id]
 * Update performance status (approve/decline/cancel)
 */
export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { action, reason } = await req.json();
    const { id: performanceId } = await params;

    const workflows = new ApprovalWorkflows(prisma);

    switch (action) {
      case "accept":
      case "decline":
        // Redirect to the proper respond endpoint
        return NextResponse.redirect(new URL(`/api/performances/${performanceId}/respond`, req.url));
        
      case "APPROVE":
      case "DECLINE":
        // Legacy support - map to new actions
        const mappedAction = action === "APPROVE" ? "accept" : "decline";
        let result;

        if (mappedAction === "accept") {
          result = await workflows.acceptPerformanceInvitation(performanceId, user.id);
        } else {
          result = await workflows.declinePerformanceInvitation(performanceId, user.id, reason);
        }
        return NextResponse.json(result);

      case "CANCEL":
        // Handle cancellation by updating status directly
        const performance = await prisma.performance.findUnique({
          where: { id: performanceId },
          include: {
            event: { include: { venue: true } },
            artist: { include: { user: true } }
          }
        });

        if (!performance) {
          return NextResponse.json({ error: "Performance not found" }, { status: 404 });
        }

        // Check authorization - venue owner or event creator can cancel
        const isVenueOwner = performance.event.venue?.userId === user.id;
        const isEventCreator = performance.event.createdBy === user.id;
        
        if (!isVenueOwner && !isEventCreator) {
          return NextResponse.json({ error: "Unauthorized to cancel this performance" }, { status: 403 });
        }

        // Update performance status to cancelled
        await prisma.performance.update({
          where: { id: performanceId },
          data: { status: "CANCELLED" }
        });

        // Notify artist if venue cancelled
        if (isVenueOwner) {
          await workflows.createNotification("PERFORMANCE_CANCELLED", performance.artist.userId, {
            title: "Performance Cancelled",
            message: `The performance for "${performance.event.title}" has been cancelled by the venue${reason ? `: ${reason}` : ''}`,
            eventId: performance.eventId,
            performanceId: performance.id
          });
        }

        return NextResponse.json({ success: true, message: "Performance cancelled successfully" });

      default:
        return NextResponse.json({ error: "Invalid action" }, { status: 400 });
    }
  } catch (error) {
    console.error("Error updating performance:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

/**
 * GET /api/performances/[id]
 * Get performance details
 */
export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;
    const performance = await prisma.performance.findUnique({
      where: { id },
      include: {
        event: {
          include: {
            venue: true,
            creator: true
          }
        },
        artist: {
          include: {
            user: true
          }
        }
      }
    });

    if (!performance) {
      return NextResponse.json({ error: "Performance not found" }, { status: 404 });
    }

    // Check authorization - only involved parties can view
    const isVenueOwner = performance.event.venue?.userId === user.id;
    const isEventCreator = performance.event.createdBy === user.id;
    const isArtist = performance.artist.userId === user.id;
    
    if (!isVenueOwner && !isEventCreator && !isArtist) {
      return NextResponse.json({ error: "Unauthorized to view this performance" }, { status: 403 });
    }

    return NextResponse.json({ performance });
  } catch (error) {
    console.error("Error fetching performance:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}