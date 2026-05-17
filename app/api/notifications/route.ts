/**
 * app/api/notifications/route.ts
 *
 * Task 14.5 — GET /api/notifications
 *
 * GET (all authenticated roles):
 *   Returns { unreadCount, notifications[] } filtered to the session user's
 *   userId only.
 *
 * Requirements: 8.7, 8.8
 */

import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { and, eq, desc } from 'drizzle-orm';
import { getServerSession } from 'next-auth/next';

import { db } from '@/db';
import { notifications } from '@/db/schema';
import { authOptions, withRBAC } from '@/lib/auth';
import type { RouteContext } from '@/lib/auth';
import type { NextRouteHandler } from '@/lib/auth';

// ---------------------------------------------------------------------------
// GET /api/notifications — Task 14.5
// ---------------------------------------------------------------------------

const getHandler: NextRouteHandler = async (
  _req: NextRequest,
  _context: RouteContext,
) => {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const userId = session.user.id;

  // Fetch all notifications for this user, newest first
  const rows = await db
    .select()
    .from(notifications)
    .where(eq(notifications.userId, userId))
    .orderBy(desc(notifications.createdAt));

  const unreadCount = rows.filter((n) => !n.isRead).length;

  return NextResponse.json({
    unreadCount,
    notifications: rows,
  });
};

// ---------------------------------------------------------------------------
// Export handler wrapped with RBAC (all authenticated roles)
// ---------------------------------------------------------------------------

export const GET = withRBAC(getHandler, [
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
