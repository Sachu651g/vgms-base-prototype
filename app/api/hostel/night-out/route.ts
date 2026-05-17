/**
 * app/api/hostel/night-out/route.ts
 *
 * Task 13.1 — POST /api/hostel/night-out (student only)
 * Task 13.2 — GET  /api/hostel/night-out (student own, warden, hod, principal, branch_admin, super_admin)
 *
 * Requirements: 5.11, 5.19, 5.20, 9.1
 */

import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { z } from 'zod';
import { and, eq } from 'drizzle-orm';
import { getServerSession } from 'next-auth/next';

import { db } from '@/db';
import { nightOutRequests, users } from '@/db/schema';
import { authOptions, withRBAC, withBranchIsolation } from '@/lib/auth';
import type { RouteContext, BranchIsolatedHandler } from '@/lib/auth';
import { writeAuditLog } from '@/lib/utils';
import { sendNotification } from '@/lib/notifications';

// ---------------------------------------------------------------------------
// Zod schema for POST body
// ---------------------------------------------------------------------------

const createNightOutSchema = z.object({
  departureDatetime:      z.string().min(1, 'departureDatetime is required'),
  expectedReturnDatetime: z.string().min(1, 'expectedReturnDatetime is required'),
  destinationAddress:     z.string().min(1, 'destinationAddress is required'),
  reason:                 z.string().min(1, 'reason is required'),
  parentConsentUrl:       z.string().min(1, 'parentConsentUrl is required'),
});

// ---------------------------------------------------------------------------
// POST /api/hostel/night-out — Task 13.1
// ---------------------------------------------------------------------------

const postHandler: BranchIsolatedHandler = async (
  req: NextRequest,
  _context: RouteContext,
  branchId: string | null,
) => {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const studentId = session.user.id;
  const actorIp   = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ?? null;

  // Parse + validate body
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  const parsed = createNightOutSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: 'Validation error', issues: parsed.error.issues },
      { status: 422 },
    );
  }

  const {
    departureDatetime,
    expectedReturnDatetime,
    destinationAddress,
    reason,
    parentConsentUrl,
  } = parsed.data;

  // Requirement 5.11 — parentConsentUrl is mandatory (already enforced by Zod above,
  // but we add an explicit check to return HTTP 422 with a clear message)
  if (!parentConsentUrl.trim()) {
    return NextResponse.json(
      { error: 'Validation error', message: 'parentConsentUrl is required' },
      { status: 422 },
    );
  }

  const resolvedBranchId = branchId ?? session.user.branchId;

  if (!resolvedBranchId) {
    return NextResponse.json(
      { error: 'Branch not assigned', message: 'Your account has no branch assigned.' },
      { status: 400 },
    );
  }

  // Create the night-out request
  const [newRequest] = await db
    .insert(nightOutRequests)
    .values({
      studentId,
      branchId:               resolvedBranchId,
      departureDatetime:      new Date(departureDatetime),
      expectedReturnDatetime: new Date(expectedReturnDatetime),
      destinationAddress,
      reason,
      parentConsentUrl,
      status:                 'pending',
      wardenConsentConfirmed: false,
    })
    .returning();

  // Requirement 5.11 — notify warden
  const wardenUsers = await db
    .select({ id: users.id })
    .from(users)
    .where(
      and(
        eq(users.role, 'warden'),
        eq(users.branchId, resolvedBranchId),
      ),
    );

  await Promise.all(
    wardenUsers.map((warden) =>
      sendNotification({
        userId:     warden.id,
        branchId:   resolvedBranchId,
        title:      'New Night-Out Request',
        message:    `A student has submitted a night-out request. Destination: ${destinationAddress}. Reason: ${reason}.`,
        severity:   'info',
        entityType: 'night_out_requests',
        entityId:   newRequest.id,
      }),
    ),
  );

  // Requirement 5.19 — write CREATE audit log
  await writeAuditLog({
    actorId:    studentId,
    branchId:   resolvedBranchId,
    actorIp,
    action:     'CREATE',
    entityType: 'night_out_requests',
    entityId:   newRequest.id,
    newState:   newRequest,
  });

  return NextResponse.json(
    {
      requestId: newRequest.id,
      status:    newRequest.status,
    },
    { status: 201 },
  );
};

// ---------------------------------------------------------------------------
// GET /api/hostel/night-out — Task 13.2
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

  const { role, id: actorId } = session.user;
  const { searchParams }      = req.nextUrl;

  const statusParam = searchParams.get('status');
  const page        = Math.max(1, parseInt(searchParams.get('page') ?? '1', 10));
  const limit       = Math.min(100, Math.max(1, parseInt(searchParams.get('limit') ?? '20', 10)));
  const offset      = (page - 1) * limit;

  // Build where conditions
  const conditions = [];

  // Branch isolation — Requirement 9.1
  if (branchId) {
    conditions.push(eq(nightOutRequests.branchId, branchId));
  }

  // Students see only their own requests
  if (role === 'student') {
    conditions.push(eq(nightOutRequests.studentId, actorId));
  }

  // Optional status filter
  if (statusParam) {
    conditions.push(
      eq(
        nightOutRequests.status,
        statusParam as typeof nightOutRequests.status._.data,
      ),
    );
  }

  const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

  const rows = await db
    .select()
    .from(nightOutRequests)
    .where(whereClause)
    .limit(limit)
    .offset(offset);

  return NextResponse.json({ requests: rows, page, limit });
};

// ---------------------------------------------------------------------------
// Export handlers wrapped with RBAC + branch isolation
// ---------------------------------------------------------------------------

export const POST = withRBAC(
  withBranchIsolation(postHandler),
  ['student'],
);

export const GET = withRBAC(
  withBranchIsolation(getHandler),
  ['student', 'warden', 'hod', 'principal', 'branch_admin', 'super_admin'],
);
