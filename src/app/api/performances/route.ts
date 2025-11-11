import { NextRequest, NextResponse } from 'next/server'
import { verifyIdToken } from '@/lib/auth/cognito'
import { prisma } from '@/lib/prisma'
import { cookies } from 'next/headers'
import { validatePerformance } from '@/lib/events/eventUtils'
import { ApprovalWorkflows } from '@/lib/events/approvalWorkflows'

/**
 * GET /api/performances
 * List performances for authenticated user
 */
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const eventId = searchParams.get('eventId')
  
  try {
    let whereClause: any = {}
    
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
 * Create a new performance (artist applies to event)
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
    
    // Check authorization based on user role
    let targetArtistId: string;
    let performanceData: any;
    
    if (user.role === 'ARTIST' && user.artist) {
      // Artist applying to an event
      targetArtistId = user.artist.id;
      performanceData = {
        eventId: body.eventId,
        artistId: user.artist.id,
        proposedFee: body.proposedFee,
        hours: body.hours,
        notes: body.notes,
        artistNotes: body.artistNotes,
      };
    } else if (user.role === 'VENUE' && user.venue) {
      // Venue adding an artist to their event
      if (!body.artistId) {
        return NextResponse.json({ error: 'Artist ID is required for venue users' }, { status: 400 })
      }
      
      // Verify the event belongs to this venue
      const event = await prisma.event.findUnique({
        where: { id: body.eventId }
      });
      
      if (!event || event.venueId !== user.venue.id) {
        return NextResponse.json({ error: 'You can only add artists to your own events' }, { status: 403 })
      }
      
      targetArtistId = body.artistId;
      performanceData = {
        eventId: body.eventId,
        artistId: body.artistId,
        proposedFee: body.fee || body.proposedFee,
        hours: body.hours,
        notes: body.notes,
        venueNotes: body.notes, // Venue-added notes
      };
    } else {
      return NextResponse.json({ error: 'Only artists and venue owners can create performances' }, { status: 403 })
    }

    // Use approval workflow system
    const approvals = new ApprovalWorkflows(prisma)
    const result = await approvals.applyForPerformance(
      body.eventId, 
      targetArtistId, 
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
          notes: true,
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
    console.error('Performance application error:', error)
    
    return NextResponse.json({
      success: false,
      error: 'application_failed',
      message: 'Failed to submit performance application'
    }, { status: 500 })
  }
}