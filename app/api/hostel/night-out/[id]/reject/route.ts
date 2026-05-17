/**
 * app/api/hostel/night-out/[id]/reject/route.ts
 *
 * Task 13.5 — PUT /api/hostel/night-out/:id/reject
 * Roles: warden, hod, principal
 *
 * Transitions: any non-terminal status → rejected
 * Stores rejectionReason, notifies student.
 * Requirements: 5.15, 5.19
 */

import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { z } from 'zod';
import { eq } from 'drizzle-orm';
import { getServerSession } from 'next-auth/next';

import { db } from '@/db';
import { nightOutRequests } from '@/db/schema';
import { authOptions, withRBAC, withBranchIsolation } from '@/lib/auth';
import type { RouteContext, BranchIsolatedHandler } from '@/lib/auth';
import { writeAuditLog } from '@/lib/utils';
import { sendNotification } from '@/lib/notifications';

// ---------------------------------------------------------------------------
// Zod schema for PUT body
// ---------------------------------------------------------------------------

const rejectNightOutSchema = z.object({
  rejectionReason: z.string().min(1, 'Rejection reason is required'),
});

// Terminal statuses — cannot be rejected once in these states
const TERMINAL_STATUSES = ['rejected', 'approved', 'departed', 'returned', 'overdue'] as const;

// ---------------------------------------------------------------------------
// PUT /api/hostel/night-out/:id/reject — Task 13.5
// ---------------------------------------------------------------------------

const rejectHandler: BranchIsolatedHandler = async (
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
  const actorIp   = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ?? null;

  if (!requestId) {
    return NextResponse.json({ error: 'Missing request ID' }, { status: 400 });
  }

  // Parse + validate body
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  const parsed = rejectNightOutSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: 'Validation error', issues: parsed.error.issues },
      { status: 422 },
    );
  }

  const { rejectionReason } = parsed.data;

  // Fetch the night-out request
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

  // Prevent rejection from terminal statuses — Requirement 5.15
  if ((TERMINAL_STATUSES as readonly string[]).includes(nightOut.status)) {
    return NextResponse.json(
      {
        error:   'Invalid transition',
        message: `Cannot move from ${nightOut.status} to rejected`,
      },
      { status: 422 },
    );
  }

  const previousState = { ...nightOut };

  const [updated] = await db
    .update(nightOutRequests)
    .set({
      status:          'rejected',
      rejectionReason,
    })
    .where(eq(nightOutRequests.id, requestId))
    .returning();

  // Notify student with rejection reason — Requirement 5.15
  await sendNotification({
    userId:     nightOut.studentId,
    branchId:   nightOut.branchId,
    title:      'Night-Out Request Rejected',
    message:    `Your night-out request to ${nightOut.destinationAddress} has been rejected. Reason: ${rejectionReason}`,
    severity:   'warning',
    entityType: 'night_out_requests',
    entityId:   requestId,
  });

  // Audit log — Requirement 5.19
  await writeAuditLog({
    actorId:       session.user.id,
    branchId:      nightOut.branchId,
    actorIp,
    action:        'UPDATE',
    entityType:    'night_out_requests',
    entityId:      requestId,
    previousState,
    newState:      updated,
  });

  return NextResponse.json({ requestId, status: updated.status });
};

// ---------------------------------------------------------------------------
// Export handler wrapped with RBAC + branch isolation
// ---------------------------------------------------------------------------

export const PUT = withRBAC(
  withBranchIsolation(rejectHandler),
  ['warden', 'hod', 'principal'],
);
