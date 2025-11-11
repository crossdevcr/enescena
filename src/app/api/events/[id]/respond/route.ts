import { NextRequest, NextResponse } from 'next/server'
import { verifyIdToken } from '@/lib/auth/cognito'
import { prisma } from '@/lib/prisma'
import { cookies } from 'next/headers'
import { ApprovalWorkflows } from '@/lib/events/approvalWorkflows'

/**
 * POST /api/events/[id]/respond
 * Venue approves or declines artist's event request
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: eventId } = await params;
  const jar = await cookies()
  const idToken = jar.get('id_token')?.value
  if (!idToken) return NextResponse.json({ error: 'unauthorized' }, { status: 401 })

  const payload = await verifyIdToken(idToken).catch(() => null)
  const email = payload?.email ? String(payload.email) : null
  if (!email) return NextResponse.json({ error: 'unauthorized' }, { status: 401 })

  const user = await prisma.user.findUnique({
    where: { email },
    include: { venue: true }
  })
  if (!user) {
    return NextResponse.json({ error: 'forbidden' }, { status: 403 })
  }

  try {
    const body = await request.json()
    const { action, reason } = body // action: 'approve' | 'decline'
    
    // Only venues can respond to event requests
    if (user.role !== 'VENUE' || !user.venue) {
      return NextResponse.json({ error: 'Only venue owners can respond to event requests' }, { status: 403 })
    }

    // Use approval workflow system
    const approvals = new ApprovalWorkflows(prisma)
    let result;

    if (action === 'approve') {
      result = await approvals.approveEventRequest(eventId, user.id)
    } else if (action === 'decline') {
      result = await approvals.declineEventRequest(eventId, user.id, reason)
    } else {
      return NextResponse.json({ error: 'Invalid action. Must be "approve" or "decline"' }, { status: 400 })
    }

    if (result.success) {
      // Get updated event details
      const event = await prisma.event.findUnique({
        where: { id: eventId },
        select: {
          id: true,
          title: true,
          slug: true,
          description: true,
          eventDate: true,
          endDate: true,
          status: true,
          totalHours: true,
          totalBudget: true,
          createdAt: true,
          venue: {
            select: {
              id: true,
              name: true,
              slug: true,
              city: true
            }
          },
          creator: {
            select: {
              id: true,
              name: true,
              email: true
            }
          }
        }
      })

      return NextResponse.json({
        success: true,
        event,
        message: result.message
      })
    } else {
      return NextResponse.json({
        success: false,
        error: result.message
      }, { status: 400 })
    }
  } catch (error: unknown) {
    console.error('Event request response error:', error)
    
    return NextResponse.json({
      success: false,
      error: 'response_failed',
      message: 'Failed to respond to event request'
    }, { status: 500 })
  }
}