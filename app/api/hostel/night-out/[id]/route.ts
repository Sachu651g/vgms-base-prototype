/**
 * app/api/hostel/night-out/[id]/route.ts
 *
 * Task 13.3 — GET /api/hostel/night-out/:id
 * Roles: student (own), warden, hod, principal, branch_admin, super_admin
 *
 * Requirements: 5.20, 9.1
 */

import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { eq } from 'drizzle-orm';
import { getServerSession } from 'next-auth/next';

import { db } from '@/db';
import { nightOutRequests } from '@/db/schema';
import { authOptions, withRBAC, withBranchIsolation } from '@/lib/auth';
import type { RouteContext, BranchIsolatedHandler } from '@/lib/auth';

// ---------------------------------------------------------------------------
// GET /api/hostel/night-out/:id — Task 13.3
// ---------------------------------------------------------------------------

const getHandler: BranchIsolatedHandler = async (
  req: NextRequest,
  context: RouteContext,
  branchId: string | null,
) => {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const raw       = context.params?.id;
  const requestId = Array.isArray(raw) ? raw[0] : raw;

  if (!requestId) {
    return NextResponse.json({ error: 'Missing request ID' }, { status: 400 });
  }

  const [nightOut] = await db
    .select()
    .from(nightOutRequests)
    .where(eq(nightOutRequests.id, requestId))
    .limit(1);

  if (!nightOut) {
    return NextResponse.json({ error: 'Night-out request not found' }, { status: 404 });
  }

  // Branch isolation — Requirement 9.1
  if (branchId && nightOut.branchId !== branchId) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  // Students may only view their own requests
  if (session.user.role === 'student' && nightOut.studentId !== session.user.id) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  return NextResponse.json({ request: nightOut });
};

// ---------------------------------------------------------------------------
// Export handler wrapped with RBAC + branch isolation
// ---------------------------------------------------------------------------

export const GET = withRBAC(
  withBranchIsolation(getHandler),
  ['student', 'warden', 'hod', 'principal', 'branch_admin', 'super_admin'],
);
