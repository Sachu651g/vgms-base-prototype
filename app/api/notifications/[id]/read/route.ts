/**
 * app/api/notifications/[id]/read/route.ts
 *
 * Task 14.6 — PUT /api/notifications/:id/read
 *
 * PUT (all authenticated roles):
 *   Sets isRead = true and readAt = now.
 *   Verifies the notification belongs to the session user before updating.
 *
 * Requirements: 8.8
 */

import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { and, eq } from 'drizzle-orm';
import { getServerSession } from 'next-auth/next';

import { db } from '@/db';
import { notifications } from '@/db/schema';
import { authOptions, withRBAC } from '@/lib/auth';
import type { RouteContext, NextRouteHandler } from '@/lib/auth';

// ---------------------------------------------------------------------------
// PUT /api/notifications/:id/read — Task 14.6
// ---------------------------------------------------------------------------

const putHandler: NextRouteHandler = async (
  _req: NextRequest,
  context: RouteContext,
) => {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const userId = session.user.id;

  // Resolve notification ID from route params
  const raw = context.params?.id;
  const notificationId = Array.isArray(raw) ? raw[0] : raw;

  if (!notificationId) {
    return NextResponse.json({ error: 'Missing notification ID' }, { status: 400 });
  }

  // Fetch the notification and verify ownership — Requirement 8.8
  const [notification] = await db
    .select()
    .from(notifications)
    .where(
      and(
        eq(notifications.id, notificationId),
        eq(notifications.userId, userId),
      ),
    )
    .limit(1);

  if (!notification) {
    // Return 404 whether the notification doesn't exist or belongs to another user
    // (avoids leaking existence of other users' notifications)
    return NextResponse.json({ error: 'Notification not found' }, { status: 404 });
  }

  // Already read — idempotent, return current state
  if (notification.isRead) {
    return NextResponse.json({ notification });
  }

  const now = new Date();

  const [updated] = await db
    .update(notifications)
    .set({ isRead: true, readAt: now })
    .where(eq(notifications.id, notificationId))
    .returning();

  return NextResponse.json({ notification: updated });
};

// ---------------------------------------------------------------------------
// Export handler wrapped with RBAC (all authenticated roles)
// ---------------------------------------------------------------------------

export const PUT = withRBAC(putHandler, [
  'super_admin',
  'branch_admin',
  'principal',
  'hod',
  'faculty',
  'warden',
  'security_head',
  'watchman',
  'receptionist',
  'student',
]);
