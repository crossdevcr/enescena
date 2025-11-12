import { NextRequest, NextResponse } from 'next/server'
import { verifyIdToken } from '@/lib/auth/cognito'
import { prisma } from '@/lib/prisma'
import { cookies } from 'next/headers'
import { ApprovalWorkflows } from '@/lib/events/approvalWorkflows'

/**
 * GET /api/notifications
 * Get notifications for authenticated user
 */
export async function GET(request: NextRequest) {
  const jar = await cookies()
  const idToken = jar.get('id_token')?.value
  if (!idToken) return NextResponse.json({ error: 'unauthorized' }, { status: 401 })

  const payload = await verifyIdToken(idToken).catch(() => null)
  const email = payload?.email ? String(payload.email) : null
  if (!email) return NextResponse.json({ error: 'unauthorized' }, { status: 401 })

  const user = await prisma.user.findUnique({
    where: { email }
  })
  if (!user) {
    return NextResponse.json({ error: 'forbidden' }, { status: 403 })
  }

  const { searchParams } = new URL(request.url)
  const unreadOnly = searchParams.get('unreadOnly') === 'true'

  try {
    const approvals = new ApprovalWorkflows(prisma)
    
    let notifications
    if (unreadOnly) {
      notifications = await approvals.getUnreadNotifications(user.id)
    } else {
      notifications = await prisma.notification.findMany({
        where: { userId: user.id },
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
        orderBy: { createdAt: 'desc' },
        take: 50 // Limit to recent notifications
      })
    }

    const unreadCount = await prisma.notification.count({
      where: {
        userId: user.id,
        isRead: false
      }
    })

    return NextResponse.json({
      success: true,
      notifications,
      unreadCount
    })
  } catch (error) {
    console.error('Notifications fetch error:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to fetch notifications' },
      { status: 500 }
    )
  }
}

/**
 * PATCH /api/notifications/:id
 * Mark notification as read
 */
export async function PATCH(request: NextRequest) {
  const jar = await cookies()
  const idToken = jar.get('id_token')?.value
  if (!idToken) return NextResponse.json({ error: 'unauthorized' }, { status: 401 })

  const payload = await verifyIdToken(idToken).catch(() => null)
  const email = payload?.email ? String(payload.email) : null
  if (!email) return NextResponse.json({ error: 'unauthorized' }, { status: 401 })

  const user = await prisma.user.findUnique({
    where: { email }
  })
  if (!user) {
    return NextResponse.json({ error: 'forbidden' }, { status: 403 })
  }

  try {
    const body = await request.json()
    const { notificationId, markAllAsRead } = body

    const approvals = new ApprovalWorkflows(prisma)

    if (markAllAsRead) {
      // Mark all notifications as read
      await prisma.notification.updateMany({
        where: {
          userId: user.id,
          isRead: false
        },
        data: {
          isRead: true,
          readAt: new Date()
        }
      })

      return NextResponse.json({
        success: true,
        message: 'All notifications marked as read'
      })
    } else if (notificationId) {
      // Mark specific notification as read
      await approvals.markNotificationAsRead(notificationId, user.id)

      return NextResponse.json({
        success: true,
        message: 'Notification marked as read'
      })
    } else {
      return NextResponse.json(
        { success: false, error: 'Missing notificationId or markAllAsRead flag' },
        { status: 400 }
      )
    }
  } catch (error) {
    console.error('Notification update error:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to update notification' },
      { status: 500 }
    )
  }
}