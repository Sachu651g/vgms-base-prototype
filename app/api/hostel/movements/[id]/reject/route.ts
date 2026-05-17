/**
 * app/api/hostel/movements/[id]/reject/route.ts
 *
 * Task 12.3 — PUT /api/hostel/movements/:id/reject
 * Role: warden
 *
 * Transitions: pending → rejected
 * Requirements: 5.3, 5.9
 */

import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { z } from 'zod';
import { eq } from 'drizzle-orm';
import { getServerSession } from 'next-auth/next';

import { db } from '@/db';
import { hostelMovements } from '@/db/schema';
import { authOptions, withRBAC, withBranchIsolation } from '@/lib/auth';
import type { RouteContext, BranchIsolatedHandler } from '@/lib/auth';
import { writeAuditLog } from '@/lib/utils';
import { sendNotification } from '@/lib/notifications';

// ---------------------------------------------------------------------------
// Zod schema for PUT body
// ---------------------------------------------------------------------------

const rejectMovementSchema = z.object({
  rejectionReason: z.string().min(1, 'Rejection reason is required'),
});

// ---------------------------------------------------------------------------
// PUT /api/hostel/movements/:id/reject — Task 12.3
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

  const raw        = context.params?.id;
  const movementId = Array.isArray(raw) ? raw[0] : raw;
  const actorIp    = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ?? null;

  if (!movementId) {
    return NextResponse.json({ error: 'Missing movement ID' }, { status: 400 });
  }

  // Parse + validate body
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  const parsed = rejectMovementSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: 'Validation error', issues: parsed.error.issues },
      { status: 422 },
    );
  }

  const { rejectionReason } = parsed.data;

  const [movement] = await db
    .select()
    .from(hostelMovements)
    .where(eq(hostelMovements.id, movementId))
    .limit(1);

  if (!movement) {
    return NextResponse.json({ error: 'Hostel movement not found' }, { status: 404 });
  }

  // Branch isolation
  if (branchId && movement.branchId !== branchId) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  // Validate transition: only pending → rejected is allowed
  if (movement.status !== 'pending') {
    return NextResponse.json(
      {
        error:   'Invalid transition',
        message: `Cannot move from ${movement.status} to rejected`,
      },
      { status: 422 },
    );
  }

  const previousState = { ...movement };
  const now           = new Date();

  const [updated] = await db
    .update(hostelMovements)
    .set({
      status:          'rejected',
      wardenId:        session.user.id,
      rejectionReason,
      updatedAt:       now,
    })
    .where(eq(hostelMovements.id, movementId))
    .returning();

  // Requirement 5.3 — notify student with rejection reason
  await sendNotification({
    userId:     movement.studentId,
    branchId:   movement.branchId,
    title:      'Hostel Movement Rejected',
    message:    `Your hostel movement request to ${movement.destination} has been rejected. Reason: ${rejectionReason}`,
    severity:   'warning',
    entityType: 'hostel_movements',
    entityId:   movementId,
  });

  // Requirement 5.9 — write UPDATE audit log
  await writeAuditLog({
    actorId:       session.user.id,
    branchId:      movement.branchId,
    actorIp,
    action:        'UPDATE',
    entityType:    'hostel_movements',
    entityId:      movementId,
    previousState,
    newState:      updated,
  });

  return NextResponse.json({ movementId, status: updated.status });
};

// ---------------------------------------------------------------------------
// Export handler wrapped with RBAC + branch isolation
// ---------------------------------------------------------------------------

export const PUT = withRBAC(
  withBranchIsolation(rejectHandler),
  ['warden'],
);
