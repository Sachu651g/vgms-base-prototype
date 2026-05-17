/**
 * app/api/gate-passes/[id]/reject/route.ts
 *
 * Task 11.5 — PUT /api/gate-passes/:id/reject
 * Roles: hod, principal
 *
 * Requirements: 4.7, 4.17
 */

import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { eq } from 'drizzle-orm';
import { getServerSession } from 'next-auth/next';
import { z } from 'zod';

import { db } from '@/db';
import { gatePasses, passApprovals } from '@/db/schema';
import { authOptions, withRBAC, withBranchIsolation } from '@/lib/auth';
import type { RouteContext, BranchIsolatedHandler } from '@/lib/auth';
import { validateGatePassTransition, writeAuditLog } from '@/lib/utils';
import { sendNotification } from '@/lib/notifications';

// ---------------------------------------------------------------------------
// Zod schema for PUT body
// ---------------------------------------------------------------------------

const rejectSchema = z.object({
  rejectionReason: z.string().min(1, 'Rejection reason is required'),
});

// ---------------------------------------------------------------------------
// PUT /api/gate-passes/:id/reject — Task 11.5
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

  const raw    = context.params?.id;
  const passId = Array.isArray(raw) ? raw[0] : raw;
  const actorIp = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ?? null;

  if (!passId) {
    return NextResponse.json({ error: 'Missing pass ID' }, { status: 400 });
  }

  // Parse body
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  const parsed = rejectSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: 'Validation error', issues: parsed.error.issues },
      { status: 422 },
    );
  }

  const { rejectionReason } = parsed.data;

  const [pass] = await db
    .select()
    .from(gatePasses)
    .where(eq(gatePasses.id, passId))
    .limit(1);

  if (!pass) {
    return NextResponse.json({ error: 'Gate pass not found' }, { status: 404 });
  }

  // Branch isolation
  if (branchId && pass.branchId !== branchId) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  // Validate pending status
  if (pass.status !== 'pending') {
    return NextResponse.json(
      { error: 'Invalid transition', message: `Cannot reject a pass with status '${pass.status}'` },
      { status: 422 },
    );
  }

  // Validate state machine transition
  const transition = validateGatePassTransition(pass.status, 'rejected');
  if (!transition.valid) {
    return NextResponse.json(transition.error!.body, { status: transition.error!.status });
  }

  const previousState = { ...pass };
  const now           = new Date();

  // Update gate pass
  const [updated] = await db
    .update(gatePasses)
    .set({
      status:          'rejected',
      rejectionReason,
      updatedAt:       now,
    })
    .where(eq(gatePasses.id, passId))
    .returning();

  // Create passApprovals record — Requirement 4.7
  await db.insert(passApprovals).values({
    passId:  passId,
    actorId: session.user.id,
    action:  'REJECTED',
    level:   pass.escalated ? 'principal' : 'hod',
    notes:   rejectionReason,
  });

  // Notify student — Requirement 4.7
  await sendNotification({
    userId:     pass.studentId,
    branchId:   pass.branchId,
    title:      'Gate Pass Rejected',
    message:    `Your gate pass request has been rejected. Reason: ${rejectionReason}`,
    severity:   'warning',
    entityType: 'gate_passes',
    entityId:   passId,
  });

  // Requirement 4.17 — write UPDATE audit log
  await writeAuditLog({
    actorId:       session.user.id,
    branchId:      pass.branchId,
    actorIp,
    action:        'UPDATE',
    entityType:    'gate_passes',
    entityId:      passId,
    previousState,
    newState:      updated,
  });

  return NextResponse.json({ passId, status: updated.status });
};

// ---------------------------------------------------------------------------
// Export handler wrapped with RBAC + branch isolation
// ---------------------------------------------------------------------------

export const PUT = withRBAC(
  withBranchIsolation(rejectHandler),
  ['hod', 'principal'],
);
