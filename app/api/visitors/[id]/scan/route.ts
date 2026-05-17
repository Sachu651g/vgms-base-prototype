/**
 * app/api/visitors/[id]/scan/route.ts
 *
 * POST /api/visitors/:id/scan — watchman scans a visitor QR code (task 9.6)
 *
 * Requirements: 3.8, 3.9, 6.3, 6.4, 6.5
 */

import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { z } from 'zod';
import { eq } from 'drizzle-orm';
import { getServerSession } from 'next-auth/next';

import { db } from '@/db';
import { visitors, visits, scanLogs, users } from '@/db/schema';
import { authOptions, withRBAC } from '@/lib/auth';
import type { RouteContext, NextRouteHandler } from '@/lib/auth';
import { validateVisitTransition } from '@/lib/utils';
import { decryptQRPayload } from '@/lib/qr';

// ---------------------------------------------------------------------------
// Zod schema for POST body
// ---------------------------------------------------------------------------

const scanSchema = z.object({
  qrPayload:    z.string().min(1),
  gateLocation: z.string().max(100).optional(),
});

// ---------------------------------------------------------------------------
// POST /api/visitors/:id/scan
// ---------------------------------------------------------------------------

const postHandler: NextRouteHandler = async (
  req: NextRequest,
  _context: RouteContext,
) => {
  const session = await getServerSession(authOptions);
  const actorId  = session!.user.id;
  const branchId = session!.user.branchId;

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

  const { qrPayload, gateLocation } = parsed.data;

  // ------------------------------------------------------------------
  // Requirement 6.4 — decrypt QR payload; failure → 422 + ScanLog(failure)
  // ------------------------------------------------------------------
  let decrypted: ReturnType<typeof decryptQRPayload>;
  try {
    decrypted = decryptQRPayload(qrPayload);
  } catch {
    // Write failure scan log — Requirement 6.5
    await db.insert(scanLogs).values({
      branchId:      branchId ?? '',
      scannedById:   actorId,
      passType:      'visitor',
      gateLocation:  gateLocation,
      outcome:       'failure',
      failureReason: 'QR payload decryption failed — invalid or tampered payload',
      rawPayload:    qrPayload,
    });

    return NextResponse.json(
      { error: 'Invalid QR Code', message: 'The QR payload could not be decrypted.' },
      { status: 422 },
    );
  }

  // ------------------------------------------------------------------
  // Validate expiry — Requirement 3.9
  // ------------------------------------------------------------------
  const now = new Date();
  const expiresAt = new Date(decrypted.expiresAt);

  if (expiresAt < now) {
    await db.insert(scanLogs).values({
      branchId:      branchId ?? decrypted.branchId,
      scannedById:   actorId,
      passId:        decrypted.passId,
      passType:      'visitor',
      gateLocation:  gateLocation,
      outcome:       'failure',
      failureReason: `Pass expired at ${decrypted.expiresAt}`,
      rawPayload:    qrPayload,
    });

    return NextResponse.json(
      { error: 'Pass expired', message: `This visitor pass expired at ${decrypted.expiresAt}` },
      { status: 422 },
    );
  }

  // ------------------------------------------------------------------
  // Fetch the visit record
  // ------------------------------------------------------------------
  const [visit] = await db
    .select()
    .from(visits)
    .where(eq(visits.id, decrypted.passId))
    .limit(1);

  if (!visit) {
    await db.insert(scanLogs).values({
      branchId:      branchId ?? decrypted.branchId,
      scannedById:   actorId,
      passId:        decrypted.passId,
      passType:      'visitor',
      gateLocation:  gateLocation,
      outcome:       'failure',
      failureReason: 'Visit record not found',
      rawPayload:    qrPayload,
    });

    return NextResponse.json(
      { error: 'Visit not found', message: 'No visit record matches this QR code.' },
      { status: 422 },
    );
  }

  // ------------------------------------------------------------------
  // Validate visit status — must be approved or checked_in (Requirement 3.9)
  // ------------------------------------------------------------------
  if (visit.status !== 'approved' && visit.status !== 'checked_in') {
    await db.insert(scanLogs).values({
      branchId:      visit.branchId,
      scannedById:   actorId,
      passId:        visit.id,
      passType:      'visitor',
      gateLocation:  gateLocation,
      outcome:       'failure',
      failureReason: `Invalid visit status: ${visit.status}`,
      rawPayload:    qrPayload,
    });

    return NextResponse.json(
      {
        error:   'Invalid pass status',
        message: `Cannot scan a visit with status '${visit.status}'. Expected 'approved' or 'checked_in'.`,
      },
      { status: 422 },
    );
  }

  // ------------------------------------------------------------------
  // Determine target status and validate transition
  // approved → checked_in  OR  checked_in → checked_out
  // ------------------------------------------------------------------
  const targetStatus = visit.status === 'approved' ? 'checked_in' : 'checked_out';

  const transition = validateVisitTransition(visit.status, targetStatus);
  if (!transition.valid) {
    return NextResponse.json(transition.error!.body, { status: transition.error!.status });
  }

  // Update visit status + timestamps
  const updatePayload: Partial<typeof visits.$inferInsert> = {
    status:    targetStatus,
    updatedAt: now,
  };
  if (targetStatus === 'checked_in')  updatePayload.actualCheckin  = now;
  if (targetStatus === 'checked_out') updatePayload.actualCheckout = now;

  const [updatedVisit] = await db
    .update(visits)
    .set(updatePayload)
    .where(eq(visits.id, visit.id))
    .returning();

  // ------------------------------------------------------------------
  // Fetch visitor name for response — Requirement 6.3
  // ------------------------------------------------------------------
  const [visitor] = await db
    .select({ name: visitors.name })
    .from(visitors)
    .where(eq(visitors.id, visit.visitorId))
    .limit(1);

  // ------------------------------------------------------------------
  // Write success ScanLog — Requirement 6.5
  // ------------------------------------------------------------------
  await db.insert(scanLogs).values({
    branchId:     visit.branchId,
    scannedById:  actorId,
    passId:       visit.id,
    passType:     'visitor',
    gateLocation: gateLocation,
    outcome:      'success',
  });

  return NextResponse.json({
    holderName: visitor?.name ?? 'Unknown',
    status:     updatedVisit.status,
    visitId:    updatedVisit.id,
  });
};

// ---------------------------------------------------------------------------
// Export route handler
// ---------------------------------------------------------------------------

export const POST = withRBAC(postHandler, ['watchman', 'security_head']);
