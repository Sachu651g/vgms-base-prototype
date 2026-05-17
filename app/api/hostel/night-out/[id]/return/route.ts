/**
 * app/api/hostel/night-out/[id]/return/route.ts
 *
 * Task 13.7 — PUT /api/hostel/night-out/:id/return
 * Roles: warden, watchman
 *
 * Transitions: departed → returned  OR  overdue → returned
 * Records actualReturn = now.
 * Requirements: 5.17, 5.19
 */

import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { eq } from 'drizzle-orm';
import { getServerSession } from 'next-auth/next';

import { db } from '@/db';
import { nightOutRequests } from '@/db/schema';
import { authOptions, withRBAC, withBranchIsolation } from '@/lib/auth';
import type { RouteContext, BranchIsolatedHandler } from '@/lib/auth';
import { writeAuditLog } from '@/lib/utils';

// ---------------------------------------------------------------------------
// PUT /api/hostel/night-out/:id/return — Task 13.7
// ---------------------------------------------------------------------------

const returnHandler: BranchIsolatedHandler = async (
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

  // Validate transition: departed → returned OR overdue → returned — Requirement 5.17
  if (nightOut.status !== 'departed' && nightOut.status !== 'overdue') {
    return NextResponse.json(
      {
        error:   'Invalid transition',
        message: `Cannot move from ${nightOut.status} to returned`,
      },
      { status: 422 },
    );
  }

  const previousState = { ...nightOut };
  const now           = new Date();

  const [updated] = await db
    .update(nightOutRequests)
    .set({
      status:       'returned',
      actualReturn: now,
    })
    .where(eq(nightOutRequests.id, requestId))
    .returning();

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

  return NextResponse.json({
    requestId,
    status:       updated.status,
    actualReturn: updated.actualReturn?.toISOString(),
  });
};

// ---------------------------------------------------------------------------
// Export handler wrapped with RBAC + branch isolation
// ---------------------------------------------------------------------------

export const PUT = withRBAC(
  withBranchIsolation(returnHandler),
  ['warden', 'watchman'],
);
