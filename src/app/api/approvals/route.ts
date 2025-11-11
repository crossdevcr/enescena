import { NextRequest, NextResponse } from 'next/server'
import { verifyIdToken } from '@/lib/auth/cognito'
import { prisma } from '@/lib/prisma'
import { cookies } from 'next/headers'
import { ApprovalWorkflows } from '@/lib/events/approvalWorkflows'

/**
 * GET /api/approvals
 * Get pending approvals for the authenticated user
 */
export async function GET(request: NextRequest) {
  const jar = await cookies()
  const idToken = jar.get('id_token')?.value
  if (!idToken) return NextResponse.json({ error: 'unauthorized' }, { status: 401 })

  const payload = await verifyIdToken(idToken).catch(() => null)
  const email = payload?.email ? String(payload.email) : null
  if (!email) return NextResponse.json({ error: 'unauthorized' }, { status: 401 })

  const user = await prisma.user.findUnique({
    where: { email },
    include: { venue: true, artist: true }
  })
  if (!user) {
    return NextResponse.json({ error: 'forbidden' }, { status: 403 })
  }

  try {
    const approvals = new ApprovalWorkflows(prisma)
    
    // Get different types of approvals based on user role
    let pendingApprovals: any = {
      eventApprovals: [],
      performanceApprovals: [],
      notifications: []
    }

    // Get unread notifications
    pendingApprovals.notifications = await approvals.getUnreadNotifications(user.id)

    // Venue owners get event approval requests and performance applications
    if (user.role === 'VENUE' && user.venue) {
      // Events pending venue approval
      pendingApprovals.eventApprovals = await prisma.event.findMany({
        where: {
          venueId: user.venue.id,
          status: 'PENDING_VENUE_APPROVAL'
        },
        include: {
          creator: { select: { id: true, name: true, email: true } }
        },
        orderBy: { createdAt: 'desc' }
      })

      // Performance applications at venue's events
      pendingApprovals.performanceApprovals = await prisma.performance.findMany({
        where: {
          event: { venueId: user.venue.id },
          status: 'PENDING'
        },
        include: {
          event: { select: { id: true, title: true, eventDate: true } },
          artist: { select: { id: true, name: true } }
        },
        orderBy: { createdAt: 'desc' }
      })
    }

    // Artists get notifications about their applications
    if (user.role === 'ARTIST' && user.artist) {
      // Performance applications by this artist
      const artistPerformances = await prisma.performance.findMany({
        where: {
          artistId: user.artist.id,
          status: { in: ['PENDING', 'CONFIRMED', 'DECLINED'] }
        },
        include: {
          event: { 
            select: { 
              id: true, 
              title: true, 
              eventDate: true,
              venue: { select: { name: true } }
            } 
          }
        },
        orderBy: { createdAt: 'desc' }
      })

      pendingApprovals.myApplications = artistPerformances
    }

    // Event creators get performance applications for their events
    const createdEvents = await prisma.event.findMany({
      where: {
        createdBy: user.id,
        status: { in: ['SEEKING_ARTISTS', 'PENDING'] }
      },
      include: {
        performances: {
          where: { status: 'PENDING' },
          include: {
            artist: { select: { id: true, name: true } }
          }
        }
      }
    })

    pendingApprovals.myEventApplications = createdEvents.filter(e => e.performances.length > 0)

    return NextResponse.json({
      success: true,
      approvals: pendingApprovals
    })
  } catch (error) {
    console.error('Approvals fetch error:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to fetch approvals' },
      { status: 500 }
    )
  }
}

/**
 * POST /api/approvals
 * Process approval actions (approve/decline events or performances)
 */
export async function POST(request: NextRequest) {
  const jar = await cookies()
  const idToken = jar.get('id_token')?.value
  if (!idToken) return NextResponse.json({ error: 'unauthorized' }, { status: 401 })

  const payload = await verifyIdToken(idToken).catch(() => null)
  const email = payload?.email ? String(payload.email) : null
  if (!email) return NextResponse.json({ error: 'unauthorized' }, { status: 401 })

  const user = await prisma.user.findUnique({
    where: { email },
    include: { venue: true, artist: true }
  })
  if (!user) {
    return NextResponse.json({ error: 'forbidden' }, { status: 403 })
  }

  try {
    const body = await request.json()
    const { action, type, itemId, reason } = body

    const approvals = new ApprovalWorkflows(prisma)
    let result

    switch (type) {
      case 'event':
        if (action === 'approve') {
          result = await approvals.approveEventRequest(itemId, user.id)
        } else if (action === 'decline') {
          result = await approvals.declineEventRequest(itemId, user.id, reason)
        } else {
          return NextResponse.json(
            { success: false, error: 'Invalid action for event' },
            { status: 400 }
          )
        }
        break

      case 'performance':
        if (action === 'approve') {
          result = await approvals.acceptPerformanceInvitation(itemId, user.id)
        } else if (action === 'decline') {
          result = await approvals.declinePerformanceInvitation(itemId, user.id, reason)
        } else {
          return NextResponse.json(
            { success: false, error: 'Invalid action for performance' },
            { status: 400 }
          )
        }
        break

      default:
        return NextResponse.json(
          { success: false, error: 'Invalid approval type' },
          { status: 400 }
        )
    }

    if (result.success) {
      return NextResponse.json({
        success: true,
        message: result.message
      })
    } else {
      return NextResponse.json(
        { success: false, error: result.message },
        { status: 400 }
      )
    }
  } catch (error) {
    console.error('Approval action error:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to process approval' },
      { status: 500 }
    )
  }
}