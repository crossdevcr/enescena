import { NextRequest, NextResponse } from 'next/server'
import { verifyIdToken } from '@/lib/auth/cognito'
import { prisma } from '@/lib/prisma'
import { cookies } from 'next/headers'
import { ApprovalWorkflows } from '@/lib/events/approvalWorkflows'

/**
 * GET /api/performances
 * List performances for authenticated user
 */
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const eventId = searchParams.get('eventId')
  
  try {
    const whereClause: Record<string, unknown> = {}
    
    if (eventId) {
      whereClause.eventId = eventId
    }

    const performances = await prisma.performance.findMany({
      where: whereClause,
      select: {
        id: true,
        eventId: true,
        artistId: true,
        status: true,
        proposedFee: true,
        agreedFee: true,
        hours: true,
        notes: true,
        createdAt: true,
        event: {
          select: {
            id: true,
            title: true,
            eventDate: true,
            status: true,
          }
        },
        artist: {
          select: {
            id: true,
            name: true,
            slug: true,
          }
        }
      },
      orderBy: { createdAt: 'desc' }
    })

    return NextResponse.json({
      success: true,
      performances,
      count: performances.length
    })
  } catch (error) {
    console.error('Performances query error:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to fetch performances' },
      { status: 500 }
    )
  }
}

/**
 * POST /api/performances
 * Venue invites artist to perform at event
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
    include: { artist: true, venue: true }
  })
  if (!user) {
    return NextResponse.json({ error: 'forbidden' }, { status: 403 })
  }

  try {
    const body = await request.json()
    
    // Only venues can invite artists
    if (user.role !== 'VENUE' || !user.venue) {
      return NextResponse.json({ error: 'Only venue owners can invite artists' }, { status: 403 })
    }

    if (!body.artistId || !body.eventId) {
      return NextResponse.json({ error: 'Event ID and Artist ID are required' }, { status: 400 })
    }

    const performanceData = {
      proposedFee: body.proposedFee,
      hours: body.hours,
      venueNotes: body.venueNotes,
      startTime: body.startTime,
      endTime: body.endTime
    };

        // Use approval workflow system
    const approvals = new ApprovalWorkflows(prisma)
    const result = await approvals.inviteArtistToPerform(
      body.eventId, 
      body.artistId, 
      user.id,
      performanceData
    )

    if (result.success) {
      // Get the created performance details
      const performance = await prisma.performance.findUnique({
        where: { id: result.performanceId },
        select: {
          id: true,
          eventId: true,
          artistId: true,
          status: true,
          proposedFee: true,
          hours: true,
          venueNotes: true,
          createdAt: true,
          event: {
            select: {
              id: true,
              title: true,
              eventDate: true,
            }
          },
          artist: {
            select: {
              id: true,
              name: true,
              slug: true,
            }
          }
        }
      })

      return NextResponse.json({
        success: true,
        performance,
        message: result.message
      })
    } else {
      return NextResponse.json({
        success: false,
        error: result.message
      }, { status: 400 })
    }
  } catch (error: any) {
    console.error('Artist invitation error:', error)
    
    return NextResponse.json({
      success: false,
      error: 'invitation_failed',
      message: 'Failed to invite artist'
    }, { status: 500 })
  }
}