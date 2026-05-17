/**
 * app/api/hostel/movements/[id]/approve/route.ts
 *
 * Task 12.3 — PUT /api/hostel/movements/:id/approve
 * Role: warden
 *
 * Transitions: pending → approved
 * Requirements: 5.2, 5.9
 */

import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { eq } from 'drizzle-orm';
import { getServerSession } from 'next-auth/next';

import { db } from '@/db';
import { hostelMovements } from '@/db/schema';
import { authOptions, withRBAC, withBranchIsolation } from '@/lib/auth';
import type { RouteContext, BranchIsolatedHandler } from '@/lib/auth';
import { writeAuditLog } from '@/lib/utils';
import { sendNotification } from '@/lib/notifications';

// ---------------------------------------------------------------------------
// PUT /api/hostel/movements/:id/approve — Task 12.3
// ---------------------------------------------------------------------------

const approveHandler: BranchIsolatedHandler = async (
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

  // Validate transition: only pending → approved is allowed
  if (movement.status !== 'pending') {
    return NextResponse.json(
      {
        error:   'Invalid transition',
        message: `Cannot move from ${movement.status} to approved`,
      },
      { status: 422 },
    );
  }

  const previousState = { ...movement };
  const now           = new Date();

  const [updated] = await db
    .update(hostelMovements)
    .set({
      status:    'approved',
      wardenId:  session.user.id,
      updatedAt: now,
    })
    .where(eq(hostelMovements.id, movementId))
    .returning();

  // Requirement 5.2 — notify student
  await sendNotification({
    userId:     movement.studentId,
    branchId:   movement.branchId,
    title:      'Hostel Movement Approved',
    message:    `Your hostel movement request to ${movement.destination} has been approved.`,
    severity:   'info',
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
  withBranchIsolation(approveHandler),
  ['warden'],
);
