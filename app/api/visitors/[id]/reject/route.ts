/**
 * app/api/visitors/[id]/reject/route.ts
 *
 * PUT /api/visitors/:id/reject — host rejects a pending visit (task 9.5)
 *
 * Requirements: 3.7, 3.15
 */

import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { z } from 'zod';
import { and, eq } from 'drizzle-orm';
import { getServerSession } from 'next-auth/next';

import { db } from '@/db';
import { visitors, visits } from '@/db/schema';
import { authOptions, withRBAC, withBranchIsolation } from '@/lib/auth';
import type { RouteContext, BranchIsolatedHandler } from '@/lib/auth';
import { writeAuditLog, validateVisitTransition } from '@/lib/utils';
import { sendNotification } from '@/lib/notifications';

// ---------------------------------------------------------------------------
// Zod schema for PUT body
// ---------------------------------------------------------------------------

const rejectSchema = z.object({
  rejectionReason: z.string().min(1).max(1000),
});

// ---------------------------------------------------------------------------
// Helper — resolve visitor id from route params
// ---------------------------------------------------------------------------

function getVisitorId(context: RouteContext): string | null {
  const id = context.params?.id;
  if (!id) return null;
  return Array.isArray(id) ? id[0] : id;
}

// ---------------------------------------------------------------------------
// PUT /api/visitors/:id/reject
// ---------------------------------------------------------------------------

const putHandler: BranchIsolatedHandler = async (
  req: NextRequest,
  context: RouteContext,
  branchId: string | null,
) => {
  const session = await getServerSession(authOptions);
  const actorId = session!.user.id;
  const actorIp = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ?? null;

  const visitorId = getVisitorId(context);
  if (!visitorId) {
    return NextResponse.json({ error: 'Missing visitor id' }, { status: 400 });
  }

  // Parse + validate body
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

  // Fetch the visitor (enforce branch isolation)
  const [visitor] = await db
    .select()
    .from(visitors)
    .where(
      branchId !== null
        ? and(eq(visitors.id, visitorId), eq(visitors.branchId, branchId))
        : eq(visitors.id, visitorId),
    )
    .limit(1);

  if (!visitor) {
    return NextResponse.json({ error: 'Visitor not found' }, { status: 404 });
  }

  // Fetch the most recent pending visit for this visitor
  const [visit] = await db
    .select()
    .from(visits)
    .where(
      and(
        eq(visits.visitorId, visitorId),
        eq(visits.status, 'pending'),
      ),
    )
    .limit(1);

  if (!visit) {
    return NextResponse.json(
      { error: 'No pending visit found for this visitor' },
      { status: 404 },
    );
  }

  // Validate transition: pending → rejected
  const transition = validateVisitTransition(visit.status, 'rejected');
  if (!transition.valid) {
    return NextResponse.json(transition.error!.body, { status: transition.error!.status });
  }

  // Update visit: status → rejected, store rejectionReason
  const [updatedVisit] = await db
    .update(visits)
    .set({
      status:          'rejected',
      rejectionReason,
      updatedAt:       new Date(),
    })
    .where(eq(visits.id, visit.id))
    .returning();

  // Requirement 3.7 — notify the registeredById user (receptionist)
  await sendNotification({
    userId:     visit.registeredById,
    branchId:   visit.branchId,
    title:      'Visit Rejected',
    message:    `The visit for ${visitor.name} has been rejected. Reason: ${rejectionReason}`,
    severity:   'info',
    entityType: 'visits',
    entityId:   visit.id,
  });

  // Requirement 3.15 — write UPDATE audit log
  await writeAuditLog({
    actorId,
    branchId: visit.branchId,
    actorIp,
    action:        'UPDATE',
    entityType:    'visits',
    entityId:      visit.id,
    previousState: { status: visit.status },
    newState:      { status: 'rejected', rejectionReason },
  });

  return NextResponse.json({
    visitId:         updatedVisit.id,
    status:          updatedVisit.status,
    rejectionReason: updatedVisit.rejectionReason,
  });
};

// ---------------------------------------------------------------------------
// Export route handler
// ---------------------------------------------------------------------------

export const PUT = withRBAC(
  withBranchIsolation(putHandler),
  ['faculty', 'hod', 'branch_admin', 'super_admin'],
);
