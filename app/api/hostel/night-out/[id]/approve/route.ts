/**
 * app/api/hostel/night-out/[id]/approve/route.ts
 *
 * Task 13.4 — PUT /api/hostel/night-out/:id/approve
 * Roles: warden, hod, principal
 *
 * Transitions:
 *   warden    : pending          → warden_approved  (requires wardenConsentConfirmed: true)
 *   hod       : warden_approved  → hod_approved
 *   principal : hod_approved     → approved
 *
 * Each step notifies the next approver; principal step notifies the student.
 * Requirements: 5.12, 5.13, 5.14, 5.19
 */

import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { z } from 'zod';
import { and, eq } from 'drizzle-orm';
import { getServerSession } from 'next-auth/next';

import { db } from '@/db';
import { nightOutRequests, users } from '@/db/schema';
import { authOptions, withRBAC, withBranchIsolation } from '@/lib/auth';
import type { RouteContext, BranchIsolatedHandler } from '@/lib/auth';
import { writeAuditLog } from '@/lib/utils';
import { sendNotification } from '@/lib/notifications';

// ---------------------------------------------------------------------------
// Zod schema for PUT body
// ---------------------------------------------------------------------------

const approveNightOutSchema = z.object({
  wardenConsentConfirmed: z.boolean().optional(),
});

// ---------------------------------------------------------------------------
// PUT /api/hostel/night-out/:id/approve — Task 13.4
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

  const raw       = context.params?.id;
  const requestId = Array.isArray(raw) ? raw[0] : raw;
  const actorIp   = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ?? null;
  const { role, id: actorId } = session.user;

  if (!requestId) {
    return NextResponse.json({ error: 'Missing request ID' }, { status: 400 });
  }

  // Parse + validate body
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    body = {};
  }

  const parsed = approveNightOutSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: 'Validation error', issues: parsed.error.issues },
      { status: 422 },
    );
  }

  const { wardenConsentConfirmed } = parsed.data;

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

  const previousState = { ...nightOut };
  const now           = new Date();

  // -------------------------------------------------------------------------
  // Role-specific approval logic
  // -------------------------------------------------------------------------

  if (role === 'warden') {
    // Requirement 5.12 — warden must confirm parent consent
    if (!wardenConsentConfirmed) {
      return NextResponse.json(
        {
          error:   'Validation error',
          message: 'You must confirm parent consent before approving.',
        },
        { status: 422 },
      );
    }

    // Validate transition: pending → warden_approved
    if (nightOut.status !== 'pending') {
      return NextResponse.json(
        {
          error:   'Invalid transition',
          message: `Cannot move from ${nightOut.status} to warden_approved`,
        },
        { status: 422 },
      );
    }

    const [updated] = await db
      .update(nightOutRequests)
      .set({
        status:                 'warden_approved',
        wardenConsentConfirmed: true,
        wardenId:               actorId,
      })
      .where(eq(nightOutRequests.id, requestId))
      .returning();

    // Notify HOD — Requirement 5.12
    const hodUsers = await db
      .select({ id: users.id })
      .from(users)
      .where(
        and(
          eq(users.role, 'hod'),
          eq(users.branchId, nightOut.branchId),
        ),
      );

    await Promise.all(
      hodUsers.map((hod) =>
        sendNotification({
          userId:     hod.id,
          branchId:   nightOut.branchId,
          title:      'Night-Out Request Awaiting HOD Approval',
          message:    `A night-out request has been approved by the warden and requires your approval. Destination: ${nightOut.destinationAddress}.`,
          severity:   'info',
          entityType: 'night_out_requests',
          entityId:   requestId,
        }),
      ),
    );

    // Audit log — Requirement 5.19
    await writeAuditLog({
      actorId,
      branchId:      nightOut.branchId,
      actorIp,
      action:        'UPDATE',
      entityType:    'night_out_requests',
      entityId:      requestId,
      previousState,
      newState:      updated,
    });

    return NextResponse.json({ requestId, status: updated.status });
  }

  if (role === 'hod') {
    // Validate transition: warden_approved → hod_approved
    if (nightOut.status !== 'warden_approved') {
      return NextResponse.json(
        {
          error:   'Invalid transition',
          message: `Cannot move from ${nightOut.status} to hod_approved`,
        },
        { status: 422 },
      );
    }

    const [updated] = await db
      .update(nightOutRequests)
      .set({
        status: 'hod_approved',
        hodId:  actorId,
      })
      .where(eq(nightOutRequests.id, requestId))
      .returning();

    // Notify Principal — Requirement 5.13
    const principalUsers = await db
      .select({ id: users.id })
      .from(users)
      .where(
        and(
          eq(users.role, 'principal'),
          eq(users.branchId, nightOut.branchId),
        ),
      );

    await Promise.all(
      principalUsers.map((principal) =>
        sendNotification({
          userId:     principal.id,
          branchId:   nightOut.branchId,
          title:      'Night-Out Request Awaiting Principal Approval',
          message:    `A night-out request has been approved by the HOD and requires your final approval. Destination: ${nightOut.destinationAddress}.`,
          severity:   'info',
          entityType: 'night_out_requests',
          entityId:   requestId,
        }),
      ),
    );

    // Audit log — Requirement 5.19
    await writeAuditLog({
      actorId,
      branchId:      nightOut.branchId,
      actorIp,
      action:        'UPDATE',
      entityType:    'night_out_requests',
      entityId:      requestId,
      previousState,
      newState:      updated,
    });

    return NextResponse.json({ requestId, status: updated.status });
  }

  if (role === 'principal') {
    // Validate transition: hod_approved → approved
    if (nightOut.status !== 'hod_approved') {
      return NextResponse.json(
        {
          error:   'Invalid transition',
          message: `Cannot move from ${nightOut.status} to approved`,
        },
        { status: 422 },
      );
    }

    const [updated] = await db
      .update(nightOutRequests)
      .set({
        status:      'approved',
        principalId: actorId,
      })
      .where(eq(nightOutRequests.id, requestId))
      .returning();

    // Notify student — Requirement 5.14
    await sendNotification({
      userId:     nightOut.studentId,
      branchId:   nightOut.branchId,
      title:      'Night-Out Request Approved',
      message:    `Your night-out request to ${nightOut.destinationAddress} has been fully approved. You may depart on ${nightOut.departureDatetime.toISOString()}.`,
      severity:   'info',
      entityType: 'night_out_requests',
      entityId:   requestId,
    });

    // Audit log — Requirement 5.19
    await writeAuditLog({
      actorId,
      branchId:      nightOut.branchId,
      actorIp,
      action:        'UPDATE',
      entityType:    'night_out_requests',
      entityId:      requestId,
      previousState,
      newState:      updated,
    });

    return NextResponse.json({ requestId, status: updated.status });
  }

  // Should never reach here due to RBAC, but guard anyway
  return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
};

// ---------------------------------------------------------------------------
// Export handler wrapped with RBAC + branch isolation
// ---------------------------------------------------------------------------

export const PUT = withRBAC(
  withBranchIsolation(approveHandler),
  ['warden', 'hod', 'principal'],
);
