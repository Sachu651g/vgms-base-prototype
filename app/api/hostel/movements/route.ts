/**
 * app/api/hostel/movements/route.ts
 *
 * Task 12.1 — POST /api/hostel/movements (student only)
 * Task 12.2 — GET  /api/hostel/movements (warden, student own, branch_admin, super_admin)
 *
 * Requirements: 5.1, 5.8, 5.9, 9.1
 */

import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { z } from 'zod';
import { and, eq, gte, lte } from 'drizzle-orm';
import { getServerSession } from 'next-auth/next';

import { db } from '@/db';
import { hostelMovements, users } from '@/db/schema';
import { authOptions, withRBAC, withBranchIsolation } from '@/lib/auth';
import type { RouteContext, BranchIsolatedHandler } from '@/lib/auth';
import { writeAuditLog } from '@/lib/utils';
import { sendNotification } from '@/lib/notifications';

// ---------------------------------------------------------------------------
// Zod schema for POST body
// ---------------------------------------------------------------------------

const createMovementSchema = z.object({
  destination:       z.string().min(1, 'Destination is required'),
  reason:            z.string().min(1, 'Reason is required'),
  expectedDeparture: z.string().datetime({ message: 'expectedDeparture must be an ISO 8601 datetime' }),
  expectedReturn:    z.string().datetime({ message: 'expectedReturn must be an ISO 8601 datetime' }),
});

// ---------------------------------------------------------------------------
// POST /api/hostel/movements — Task 12.1
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

  const parsed = createMovementSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: 'Validation error', issues: parsed.error.issues },
      { status: 422 },
    );
  }

  const { destination, reason, expectedDeparture, expectedReturn } = parsed.data;

  const resolvedBranchId = branchId ?? session.user.branchId;
  if (!resolvedBranchId) {
    return NextResponse.json(
      { error: 'Branch not assigned', message: 'Your account has no branch assigned.' },
      { status: 400 },
    );
  }

  // Create hostel movement record — Requirement 5.1
  const [newMovement] = await db
    .insert(hostelMovements)
    .values({
      studentId,
      branchId:          resolvedBranchId,
      destination,
      reason,
      expectedDeparture: new Date(expectedDeparture),
      expectedReturn:    new Date(expectedReturn),
      status:            'pending',
    })
    .returning();

  // Requirement 5.1 — notify warden(s) in the same branch
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
        title:      'New Hostel Movement Request',
        message:    `A student has submitted a hostel movement request. Destination: ${destination}. Reason: ${reason}.`,
        severity:   'info',
        entityType: 'hostel_movements',
        entityId:   newMovement.id,
      }),
    ),
  );

  // Requirement 5.9 — write CREATE audit log
  await writeAuditLog({
    actorId:    studentId,
    branchId:   resolvedBranchId,
    actorIp,
    action:     'CREATE',
    entityType: 'hostel_movements',
    entityId:   newMovement.id,
    newState:   newMovement,
  });

  return NextResponse.json(
    {
      movementId: newMovement.id,
      status:     newMovement.status,
    },
    { status: 201 },
  );
};

// ---------------------------------------------------------------------------
// GET /api/hostel/movements — Task 12.2
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

  const statusParam    = searchParams.get('status');
  const studentIdParam = searchParams.get('studentId');
  const dateFrom       = searchParams.get('dateFrom');
  const dateTo         = searchParams.get('dateTo');
  const page           = Math.max(1, parseInt(searchParams.get('page') ?? '1', 10));
  const limit          = Math.min(100, Math.max(1, parseInt(searchParams.get('limit') ?? '20', 10)));
  const offset         = (page - 1) * limit;

  const conditions = [];

  // Branch isolation — Requirement 9.1
  if (branchId) {
    conditions.push(eq(hostelMovements.branchId, branchId));
  }

  // Role-scoped filtering — students see only their own records
  if (role === 'student') {
    conditions.push(eq(hostelMovements.studentId, actorId));
  } else {
    // warden, branch_admin, super_admin — branch-scoped (already applied above)
    if (studentIdParam) {
      conditions.push(eq(hostelMovements.studentId, studentIdParam));
    }
  }

  // Optional filters
  if (statusParam) {
    conditions.push(
      eq(hostelMovements.status, statusParam as typeof hostelMovements.status._.data),
    );
  }
  if (dateFrom) {
    conditions.push(gte(hostelMovements.createdAt, new Date(dateFrom)));
  }
  if (dateTo) {
    conditions.push(lte(hostelMovements.createdAt, new Date(dateTo)));
  }

  const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

  const rows = await db
    .select()
    .from(hostelMovements)
    .where(whereClause)
    .limit(limit)
    .offset(offset);

  return NextResponse.json({ movements: rows, page, limit });
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
  ['student', 'warden', 'branch_admin', 'super_admin'],
);
