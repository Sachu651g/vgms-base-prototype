/**
 * app/api/hostel/status/route.ts
 *
 * Task 12.5 — GET /api/hostel/status
 * Roles: warden, branch_admin, super_admin
 *
 * Returns a live hostel status summary for the authenticated user's branch:
 *   - totalResidents   : all hostel_movements rows in branch (unique students)
 *   - currentlyIn      : totalResidents - currentlyOut
 *   - currentlyOut     : count of movements with status = 'departed'
 *   - overdueReturns   : count of departed movements where expectedReturn < now
 *   - nightOutPending  : count of night_out_requests with status = 'pending'
 *   - nightOutDeparted : count of night_out_requests with status = 'departed'
 *   - nightOutOverdue  : count of night_out_requests with status = 'overdue'
 *
 * Requirements: 5.6, 5.7, 5.21
 */

import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { and, eq, lt, countDistinct, count } from 'drizzle-orm';
import { getServerSession } from 'next-auth/next';

import { db } from '@/db';
import { hostelMovements, nightOutRequests } from '@/db/schema';
import { authOptions, withRBAC, withBranchIsolation } from '@/lib/auth';
import type { RouteContext, BranchIsolatedHandler } from '@/lib/auth';

// ---------------------------------------------------------------------------
// GET /api/hostel/status — Task 12.5
// ---------------------------------------------------------------------------

const statusHandler: BranchIsolatedHandler = async (
  req: NextRequest,
  _context: RouteContext,
  branchId: string | null,
) => {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const now = new Date();

  // ------------------------------------------------------------------
  // Hostel movement counts
  // ------------------------------------------------------------------

  // totalResidents: distinct students who have any movement record in branch
  const branchFilter = branchId ? eq(hostelMovements.branchId, branchId) : undefined;

  const [totalResidentsRow] = await db
    .select({ value: countDistinct(hostelMovements.studentId) })
    .from(hostelMovements)
    .where(branchFilter);

  const totalResidents = Number(totalResidentsRow?.value ?? 0);

  // currentlyOut: movements with status = 'departed'
  const departedFilter = branchId
    ? and(eq(hostelMovements.branchId, branchId), eq(hostelMovements.status, 'departed'))
    : eq(hostelMovements.status, 'departed');

  const [currentlyOutRow] = await db
    .select({ value: count() })
    .from(hostelMovements)
    .where(departedFilter);

  const currentlyOut = Number(currentlyOutRow?.value ?? 0);
  const currentlyIn  = Math.max(0, totalResidents - currentlyOut);

  // overdueReturns: departed movements where expectedReturn < now
  const overdueFilter = branchId
    ? and(
        eq(hostelMovements.branchId, branchId),
        eq(hostelMovements.status, 'departed'),
        lt(hostelMovements.expectedReturn, now),
      )
    : and(
        eq(hostelMovements.status, 'departed'),
        lt(hostelMovements.expectedReturn, now),
      );

  const [overdueReturnsRow] = await db
    .select({ value: count() })
    .from(hostelMovements)
    .where(overdueFilter);

  const overdueReturns = Number(overdueReturnsRow?.value ?? 0);

  // ------------------------------------------------------------------
  // Night-out request counts
  // ------------------------------------------------------------------

  const nightOutBranchFilter = branchId
    ? eq(nightOutRequests.branchId, branchId)
    : undefined;

  const nightOutPendingFilter = nightOutBranchFilter
    ? and(nightOutBranchFilter, eq(nightOutRequests.status, 'pending'))
    : eq(nightOutRequests.status, 'pending');

  const nightOutDepartedFilter = nightOutBranchFilter
    ? and(nightOutBranchFilter, eq(nightOutRequests.status, 'departed'))
    : eq(nightOutRequests.status, 'departed');

  const nightOutOverdueFilter = nightOutBranchFilter
    ? and(nightOutBranchFilter, eq(nightOutRequests.status, 'overdue'))
    : eq(nightOutRequests.status, 'overdue');

  const [
    [nightOutPendingRow],
    [nightOutDepartedRow],
    [nightOutOverdueRow],
  ] = await Promise.all([
    db.select({ value: count() }).from(nightOutRequests).where(nightOutPendingFilter),
    db.select({ value: count() }).from(nightOutRequests).where(nightOutDepartedFilter),
    db.select({ value: count() }).from(nightOutRequests).where(nightOutOverdueFilter),
  ]);

  const nightOutPending  = Number(nightOutPendingRow?.value ?? 0);
  const nightOutDeparted = Number(nightOutDepartedRow?.value ?? 0);
  const nightOutOverdue  = Number(nightOutOverdueRow?.value ?? 0);

  return NextResponse.json({
    totalResidents,
    currentlyIn,
    currentlyOut,
    overdueReturns,
    nightOutPending,
    nightOutDeparted,
    nightOutOverdue,
  });
};

// ---------------------------------------------------------------------------
// Export handler wrapped with RBAC + branch isolation
// ---------------------------------------------------------------------------

export const GET = withRBAC(
  withBranchIsolation(statusHandler),
  ['warden', 'branch_admin', 'super_admin'],
);
