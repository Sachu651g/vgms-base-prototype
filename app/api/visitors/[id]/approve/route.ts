/**
 * app/api/visitors/[id]/approve/route.ts
 *
 * PUT /api/visitors/:id/approve — host approves a pending visit (task 9.4)
 *
 * Requirements: 3.6, 3.15, 6.1
 */

import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { and, eq } from 'drizzle-orm';
import { getServerSession } from 'next-auth/next';
import QRCode from 'qrcode';

import { db } from '@/db';
import { visitors, visits } from '@/db/schema';
import { authOptions, withRBAC, withBranchIsolation } from '@/lib/auth';
import type { RouteContext, BranchIsolatedHandler } from '@/lib/auth';
import { writeAuditLog, validateVisitTransition } from '@/lib/utils';
import { encryptQRPayload } from '@/lib/qr';

// ---------------------------------------------------------------------------
// Helper — resolve visitor id from route params
// ---------------------------------------------------------------------------

function getVisitorId(context: RouteContext): string | null {
  const id = context.params?.id;
  if (!id) return null;
  return Array.isArray(id) ? id[0] : id;
}

// ---------------------------------------------------------------------------
// PUT /api/visitors/:id/approve
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

  // Validate transition: pending → approved
  const transition = validateVisitTransition(visit.status, 'approved');
  if (!transition.valid) {
    return NextResponse.json(transition.error!.body, { status: transition.error!.status });
  }

  // ------------------------------------------------------------------
  // Requirement 3.6 / 6.1 — generate QR payload
  // expiresAt = expectedArrival + expectedDurationMinutes
  // ------------------------------------------------------------------
  const expiresAt = new Date(
    visit.expectedArrival.getTime() + visit.expectedDurationMinutes * 60 * 1000,
  );

  const encryptedPayload = encryptQRPayload({
    passId:    visit.id,
    holderId:  visitor.id,
    branchId:  visit.branchId,
    passType:  'visitor',
    expiresAt: expiresAt.toISOString(),
  });

  // Encode as base64 PNG data URL
  const qrCode = await QRCode.toDataURL(encryptedPayload);

  // Update visit: status → approved, store qrPayload
  const [updatedVisit] = await db
    .update(visits)
    .set({
      status:    'approved',
      qrPayload: encryptedPayload,
      updatedAt: new Date(),
    })
    .where(eq(visits.id, visit.id))
    .returning();

  // Requirement 3.15 — write UPDATE audit log
  await writeAuditLog({
    actorId,
    branchId: visit.branchId,
    actorIp,
    action:        'UPDATE',
    entityType:    'visits',
    entityId:      visit.id,
    previousState: { status: visit.status },
    newState:      { status: 'approved' },
  });

  return NextResponse.json({
    visitId: updatedVisit.id,
    status:  updatedVisit.status,
    qrCode,
  });
};

// ---------------------------------------------------------------------------
// Export route handler
// ---------------------------------------------------------------------------

export const PUT = withRBAC(
  withBranchIsolation(putHandler),
  ['faculty', 'hod', 'branch_admin', 'super_admin'],
);
