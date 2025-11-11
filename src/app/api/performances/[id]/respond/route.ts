import { NextRequest, NextResponse } from 'next/server'
import { verifyIdToken } from '@/lib/auth/cognito'
import { prisma } from '@/lib/prisma'
import { cookies } from 'next/headers'
import { ApprovalWorkflows } from '@/lib/events/approvalWorkflows'

/**
 * POST /api/performances/[id]/respond
 * Artist accepts or declines performance invitation
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: performanceId } = await params;
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
    const { action, reason } = body // action: 'accept' | 'decline'
    
    // Only artists can respond to invitations
    if (user.role !== 'ARTIST' || !user.artist) {
      return NextResponse.json({ error: 'Only artists can respond to performance invitations' }, { status: 403 })
    }

    // Use approval workflow system
    const approvals = new ApprovalWorkflows(prisma)
    let result;

    if (action === 'accept') {
      result = await approvals.acceptPerformanceInvitation(performanceId, user.id)
    } else if (action === 'decline') {
      result = await approvals.declinePerformanceInvitation(performanceId, user.id, reason)
    } else {
      return NextResponse.json({ error: 'Invalid action. Must be "accept" or "decline"' }, { status: 400 })
    }

    if (result.success) {
      // Get updated performance details
      const performance = await prisma.performance.findUnique({
        where: { id: performanceId },
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
    console.error('Performance invitation response error:', error)
    
    return NextResponse.json({
      success: false,
      error: 'response_failed',
      message: 'Failed to respond to performance invitation'
    }, { status: 500 })
  }
}