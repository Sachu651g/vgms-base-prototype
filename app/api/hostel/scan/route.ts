/**
 * app/api/hostel/scan/route.ts
 *
 * Task 12.4 — POST /api/hostel/scan
 * Roles: watchman, warden
 *
 * Actions:
 *   depart  — approved  → departed  (records actualDeparture = now)
 *   return  — departed  → returned  (records actualReturn = now)
 *
 * Requirements: 5.4, 5.5, 5.9
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

// ---------------------------------------------------------------------------
// Zod schema for POST body
// ---------------------------------------------------------------------------

const scanSchema = z.object({
  studentId:  z.string().uuid('studentId must be a valid UUID'),
  movementId: z.string().uuid('movementId must be a valid UUID'),
  action:     z.enum(['depart', 'return'], {
    error: "action must be 'depart' or 'return'",
  }),
});

// ---------------------------------------------------------------------------
// Valid transitions for scan actions
// ---------------------------------------------------------------------------

const SCAN_TRANSITIONS = {
  depart: { from: 'approved',  to: 'departed' },
  return: { from: 'departed',  to: 'returned' },
} as const;

// ---------------------------------------------------------------------------
// POST /api/hostel/scan — Task 12.4
// ---------------------------------------------------------------------------

const scanHandler: BranchIsolatedHandler = async (
  req: NextRequest,
  _context: RouteContext,
  branchId: string | null,
) => {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const actorIp = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ?? null;

  // Parse + validate body
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  const parsed = scanSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: 'Validation error', issues: parsed.error.issues },
      { status: 422 },
    );
  }

  const { studentId, movementId, action } = parsed.data;

  // Fetch the movement record
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

  // Verify the movement belongs to the given student
  if (movement.studentId !== studentId) {
    return NextResponse.json(
      { error: 'Student mismatch', message: 'The movement does not belong to the specified student.' },
      { status: 400 },
    );
  }

  const transition = SCAN_TRANSITIONS[action];

  // Validate state machine transition
  if (movement.status !== transition.from) {
    return NextResponse.json(
      {
        error:   'Invalid transition',
        message: `Cannot perform '${action}' on a movement with status '${movement.status}'. Expected status: '${transition.from}'.`,
      },
      { status: 422 },
    );
  }

  const previousState = { ...movement };
  const now           = new Date();

  // Build the update payload based on action
  const updatePayload =
    action === 'depart'
      ? { status: 'departed' as const, actualDeparture: now, updatedAt: now }
      : { status: 'returned' as const, actualReturn: now, updatedAt: now };

  const [updated] = await db
    .update(hostelMovements)
    .set(updatePayload)
    .where(eq(hostelMovements.id, movementId))
    .returning();

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
    metadata:      { scanAction: action },
  });

  return NextResponse.json({
    movementId,
    status:          updated.status,
    actualDeparture: updated.actualDeparture?.toISOString() ?? null,
    actualReturn:    updated.actualReturn?.toISOString() ?? null,
  });
};

// ---------------------------------------------------------------------------
// Export handler wrapped with RBAC + branch isolation
// ---------------------------------------------------------------------------

export const POST = withRBAC(
  withBranchIsolation(scanHandler),
  ['watchman', 'warden'],
);
