import { NextRequest, NextResponse } from 'next/server'
import { verifyIdToken } from '@/lib/auth/cognito'
import { prisma } from '@/lib/prisma'
import { cookies } from 'next/headers'
import { ApprovalWorkflows } from '@/lib/events/approvalWorkflows'

/**
 * POST /api/events/request
 * Artist requests to create an event at a venue
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
    include: { artist: true }
  })
  if (!user) {
    return NextResponse.json({ error: 'forbidden' }, { status: 403 })
  }

  try {
    const body = await request.json()
    
    // Only artists can request events at venues
    if (user.role !== 'ARTIST' || !user.artist) {
      return NextResponse.json({ error: 'Only artists can request events at venues' }, { status: 403 })
    }

    if (!body.venueId) {
      return NextResponse.json({ error: 'Venue ID is required' }, { status: 400 })
    }

    const eventData = {
      title: body.title,
      description: body.description,
      eventDate: body.eventDate,
      endDate: body.endDate,
      totalHours: body.totalHours,
      totalBudget: body.totalBudget,
      notes: body.notes
    };

    // Use approval workflow system
    const approvals = new ApprovalWorkflows(prisma)
    const result = await approvals.requestEventAtVenue(
      body.venueId,
      user.id, 
      eventData
    )

    if (result.success) {
      // Get the created event details
      const event = await prisma.event.findUnique({
        where: { id: result.eventId },
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
  } catch (error: any) {
    console.error('Event request error:', error)
    
    return NextResponse.json({
      success: false,
      error: 'request_failed',
      message: 'Failed to request event'
    }, { status: 500 })
  }
}