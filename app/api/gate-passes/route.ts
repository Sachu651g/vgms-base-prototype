/**
 * app/api/gate-passes/route.ts
 *
 * Task 11.1 — POST /api/gate-passes (student only)
 * Task 11.2 — GET  /api/gate-passes (student own, hod, security_head, branch_admin, super_admin)
 *
 * Requirements: 4.4, 4.5, 4.12, 4.13, 4.14, 4.17, 9.1
 */

import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { z } from 'zod';
import { and, eq, inArray, gte, lte, or } from 'drizzle-orm';
import { getServerSession } from 'next-auth/next';

import { db } from '@/db';
import { gatePasses, users } from '@/db/schema';
import { authOptions } from '@/lib/auth';
import { withRBAC, withBranchIsolation } from '@/lib/auth';
import type { RouteContext, BranchIsolatedHandler } from '@/lib/auth';
import { writeAuditLog } from '@/lib/utils';
import { sendNotification } from '@/lib/notifications';

// ---------------------------------------------------------------------------
// Zod schema for POST body
// ---------------------------------------------------------------------------

const createGatePassSchema = z.object({
  reason:           z.string().min(1, 'Reason is required'),
  destination:      z.string().min(1, 'Destination is required'),
  requestedTimeOut: z.string().datetime({ message: 'requestedTimeOut must be an ISO 8601 datetime' }),
  requestedTimeIn:  z.string().datetime({ message: 'requestedTimeIn must be an ISO 8601 datetime' }),
});

// ---------------------------------------------------------------------------
// POST /api/gate-passes — Task 11.1
// ---------------------------------------------------------------------------

const postHandler: BranchIsolatedHandler = async (
  req: NextRequest,
  _context: RouteContext,
  branchId: string | null,
) => {
  const session = await getServerSession(authOptions);
  // session is guaranteed by withRBAC, but TypeScript needs the check
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

  const parsed = createGatePassSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: 'Validation error', issues: parsed.error.issues },
      { status: 422 },
    );
  }

  const { reason, destination, requestedTimeOut, requestedTimeIn } = parsed.data;

  // Requirement 4.4 — check for existing active pass
  const activeStatuses = ['pending', 'approved', 'exited'] as const;
  const existingPasses = await db
    .select({ id: gatePasses.id, status: gatePasses.status })
    .from(gatePasses)
    .where(
      and(
        eq(gatePasses.studentId, studentId),
        inArray(gatePasses.status, [...activeStatuses]),
      ),
    )
    .limit(1);

  if (existingPasses.length > 0) {
    const existing = existingPasses[0];

    await writeAuditLog({
      actorId:    studentId,
      branchId:   session.user.branchId,
      actorIp,
      action:     'BLOCKED_DUPLICATE_PASS',
      entityType: 'gate_passes',
      entityId:   existing.id,
      metadata:   {
        studentId,
        existingPassId:     existing.id,
        existingPassStatus: existing.status,
      },
    });

    return NextResponse.json(
      {
        error:                'Active pass exists',
        message:              'You already have an active pass. Cancel or complete it before requesting a new one.',
        existing_pass_id:     existing.id,
        existing_pass_status: existing.status,
      },
      { status: 409 },
    );
  }

  // Create the gate pass
  const now              = new Date();
  const escalationDueAt  = new Date(now.getTime() + 120 * 60 * 1000); // +120 min
  const resolvedBranchId = branchId ?? session.user.branchId;

  if (!resolvedBranchId) {
    return NextResponse.json(
      { error: 'Branch not assigned', message: 'Your account has no branch assigned.' },
      { status: 400 },
    );
  }

  const [newPass] = await db
    .insert(gatePasses)
    .values({
      studentId,
      branchId:             resolvedBranchId,
      reason,
      destination,
      requestedTimeOut:     new Date(requestedTimeOut),
      requestedTimeIn:      new Date(requestedTimeIn),
      status:               'pending',
      escalationDueAt,
      escalated:            false,
      currentApprovalLevel: 'hod',
    })
    .returning();

  // Requirement 4.5 — notify HOD
  const hodUsers = await db
    .select({ id: users.id })
    .from(users)
    .where(
      and(
        eq(users.role, 'hod'),
        eq(users.branchId, resolvedBranchId),
      ),
    );

  await Promise.all(
    hodUsers.map((hod) =>
      sendNotification({
        userId:     hod.id,
        branchId:   resolvedBranchId,
        title:      'New Gate Pass Request',
        message:    `Student has submitted a gate pass request. Reason: ${reason}. Destination: ${destination}.`,
        severity:   'info',
        entityType: 'gate_passes',
        entityId:   newPass.id,
      }),
    ),
  );

  // Requirement 4.17 — write CREATE audit log
  await writeAuditLog({
    actorId:    studentId,
    branchId:   resolvedBranchId,
    actorIp,
    action:     'CREATE',
    entityType: 'gate_passes',
    entityId:   newPass.id,
    newState:   newPass,
  });

  return NextResponse.json(
    {
      passId:          newPass.id,
      status:          newPass.status,
      escalationDueAt: newPass.escalationDueAt.toISOString(),
    },
    { status: 201 },
  );
};

// ---------------------------------------------------------------------------
// GET /api/gate-passes — Task 11.2
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

  // Build where conditions
  const conditions = [];

  // Branch isolation — Requirement 9.1
  if (branchId) {
    conditions.push(eq(gatePasses.branchId, branchId));
  }

  // Role-scoped filtering
  if (role === 'student') {
    // Students see only their own passes
    conditions.push(eq(gatePasses.studentId, actorId));
  } else if (role === 'hod') {
    // HOD sees passes from students in their department (branch-scoped)
    // If a specific studentId is requested, honour it; otherwise show all branch passes
    if (studentIdParam) {
      conditions.push(eq(gatePasses.studentId, studentIdParam));
    }
  } else {
    // security_head, branch_admin, super_admin — branch-scoped (already applied above)
    if (studentIdParam) {
      conditions.push(eq(gatePasses.studentId, studentIdParam));
    }
  }

  // Optional filters
  if (statusParam) {
    conditions.push(eq(gatePasses.status, statusParam as typeof gatePasses.status._.data));
  }
  if (dateFrom) {
    conditions.push(gte(gatePasses.createdAt, new Date(dateFrom)));
  }
  if (dateTo) {
    conditions.push(lte(gatePasses.createdAt, new Date(dateTo)));
  }

  const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

  const rows = await db
    .select()
    .from(gatePasses)
    .where(whereClause)
    .limit(limit)
    .offset(offset);

  return NextResponse.json({ passes: rows, page, limit });
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
  ['student', 'hod', 'security_head', 'branch_admin', 'super_admin'],
);
