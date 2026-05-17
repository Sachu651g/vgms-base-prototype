/**
 * app/api/audit-logs/route.ts
 *
 * Task 14.3 — GET /api/audit-logs
 *
 * GET (roles: branch_admin, super_admin):
 *   Query params: entityType, actorId, dateFrom, dateTo,
 *                 branchId (super_admin only), page, limit
 *   Enforces branch isolation.
 *   Returns paginated results.
 *
 * Requirements: 7.3, 7.4, 7.5, 9.1
 */

import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { and, eq, gte, lte } from 'drizzle-orm';
import { getServerSession } from 'next-auth/next';

import { db } from '@/db';
import { auditLogs } from '@/db/schema';
import { authOptions, withRBAC, withBranchIsolation } from '@/lib/auth';
import type { RouteContext, BranchIsolatedHandler } from '@/lib/auth';

// ---------------------------------------------------------------------------
// GET /api/audit-logs — Task 14.3
// ---------------------------------------------------------------------------

const getHandler: BranchIsolatedHandler = async (
  req: NextRequest,
  _context: RouteContext,
  branchId: string | null,
) => {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { role: actorRole } = session.user;
  const { searchParams }    = req.nextUrl;

  const entityTypeParam = searchParams.get('entityType');
  const actorIdParam    = searchParams.get('actorId');
  const dateFrom        = searchParams.get('dateFrom');
  const dateTo          = searchParams.get('dateTo');
  const branchIdParam   = searchParams.get('branchId');
  const page            = Math.max(1, parseInt(searchParams.get('page') ?? '1', 10));
  const limit           = Math.min(100, Math.max(1, parseInt(searchParams.get('limit') ?? '20', 10)));
  const offset          = (page - 1) * limit;

  const conditions = [];

  // Branch isolation — Requirement 9.1
  // branch_admin: always scoped to their own branch (branchId is non-null from withBranchIsolation)
  // super_admin: may optionally filter by branchId query param
  if (branchId) {
    conditions.push(eq(auditLogs.branchId, branchId));
  } else if (actorRole === 'super_admin' && branchIdParam) {
    conditions.push(eq(auditLogs.branchId, branchIdParam));
  }

  // Optional filters — Requirement 7.4, 7.5
  if (entityTypeParam) {
    conditions.push(eq(auditLogs.entityType, entityTypeParam));
  }

  if (actorIdParam) {
    conditions.push(eq(auditLogs.actorId, actorIdParam));
  }

  if (dateFrom) {
    conditions.push(gte(auditLogs.createdAt, new Date(dateFrom)));
  }

  if (dateTo) {
    conditions.push(lte(auditLogs.createdAt, new Date(dateTo)));
  }

  const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

  const rows = await db
    .select()
    .from(auditLogs)
    .where(whereClause)
    .limit(limit)
    .offset(offset)
    .orderBy(auditLogs.createdAt);

  return NextResponse.json({
    auditLogs: rows,
    page,
    limit,
    count: rows.length,
  });
};

// ---------------------------------------------------------------------------
// Export handler wrapped with RBAC + branch isolation
// ---------------------------------------------------------------------------

export const GET = withRBAC(
  withBranchIsolation(getHandler),
  ['branch_admin', 'super_admin'],
);
