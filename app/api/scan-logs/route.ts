/**
 * app/api/scan-logs/route.ts
 *
 * Task 14.4 — GET /api/scan-logs
 *
 * GET (roles: security_head, branch_admin, super_admin):
 *   Query params: passType, outcome, dateFrom, dateTo, scannedById
 *   Enforces branch isolation.
 *
 * Requirements: 4.14, 6.5, 9.1
 */

import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { and, eq, gte, lte } from 'drizzle-orm';
import { getServerSession } from 'next-auth/next';

import { db } from '@/db';
import { scanLogs } from '@/db/schema';
import type { ScanOutcome, ScanPassType } from '@/db/schema';
import { authOptions, withRBAC, withBranchIsolation } from '@/lib/auth';
import type { RouteContext, BranchIsolatedHandler } from '@/lib/auth';

// ---------------------------------------------------------------------------
// GET /api/scan-logs — Task 14.4
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

  const { searchParams } = req.nextUrl;

  const passTypeParam    = searchParams.get('passType');
  const outcomeParam     = searchParams.get('outcome');
  const dateFrom         = searchParams.get('dateFrom');
  const dateTo           = searchParams.get('dateTo');
  const scannedByIdParam = searchParams.get('scannedById');
  const page             = Math.max(1, parseInt(searchParams.get('page') ?? '1', 10));
  const limit            = Math.min(100, Math.max(1, parseInt(searchParams.get('limit') ?? '20', 10)));
  const offset           = (page - 1) * limit;

  const conditions = [];

  // Branch isolation — Requirement 9.1
  if (branchId) {
    conditions.push(eq(scanLogs.branchId, branchId));
  }

  // Optional filters
  if (passTypeParam) {
    conditions.push(eq(scanLogs.passType, passTypeParam as ScanPassType));
  }

  if (outcomeParam) {
    conditions.push(eq(scanLogs.outcome, outcomeParam as ScanOutcome));
  }

  if (scannedByIdParam) {
    conditions.push(eq(scanLogs.scannedById, scannedByIdParam));
  }

  if (dateFrom) {
    conditions.push(gte(scanLogs.scannedAt, new Date(dateFrom)));
  }

  if (dateTo) {
    conditions.push(lte(scanLogs.scannedAt, new Date(dateTo)));
  }

  const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

  const rows = await db
    .select()
    .from(scanLogs)
    .where(whereClause)
    .limit(limit)
    .offset(offset)
    .orderBy(scanLogs.scannedAt);

  return NextResponse.json({
    scanLogs: rows,
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
  ['security_head', 'branch_admin', 'super_admin'],
);
