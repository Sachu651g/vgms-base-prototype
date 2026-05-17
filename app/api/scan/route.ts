/**
 * app/api/scan/route.ts
 *
 * Task 20.2 — POST /api/scan (unified QR scan endpoint)
 * Roles: watchman, security_head
 *
 * Accepts an encrypted QR payload and passType, decrypts the payload,
 * then routes to the appropriate scan logic based on passType.
 *
 * Requirements: 6.3, 6.4, 6.5
 */

import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { z } from 'zod';
import { eq } from 'drizzle-orm';
import { getServerSession } from 'next-auth/next';

import { db } from '@/db';
import { gatePasses, visits, visitors, hostelMovements, scanLogs, users } from '@/db/schema';
import { authOptions, withRBAC } from '@/lib/auth';
import type { RouteContext, NextRouteHandler } from '@/lib/auth';
import {
  validateGatePassTransition,
  validateVisitTransition,
  writeAuditLog,
} from '@/lib/utils';
import { decryptQRPayload } from '@/lib/qr';

// ---------------------------------------------------------------------------
// Zod schema for POST body
// ---------------------------------------------------------------------------

const scanSchema = z.object({
  qrPayload:    z.string().min(1, 'qrPayload is required'),
  passType:     z.enum(['gate_pass', 'visitor', 'hostel']),
  gateLocation: z.string().max(100).optional(),
});

// ---------------------------------------------------------------------------
// POST /api/scan — unified scan handler
// ---------------------------------------------------------------------------

const postHandler: NextRouteHandler = async (
  req: NextRequest,
  _context: RouteContext,
) => {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const actorId  = session.user.id;
  const branchId = session.user.branchId ?? '';
  const actorIp  = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ?? null;

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

  const { qrPayload, passType, gateLocation } = parsed.data;

  // ---------------------------------------------------------------------------
  // Decrypt QR payload — Requirement 6.4
  // ---------------------------------------------------------------------------
  let decrypted: ReturnType<typeof decryptQRPayload>;
  try {
    decrypted = decryptQRPayload(qrPayload);
  } catch (err) {
    // Write failure scan log — Requirement 6.5
    if (branchId) {
      await db.insert(scanLogs).values({
        branchId,
        scannedById:   actorId,
        passType,
        gateLocation:  gateLocation ?? null,
        outcome:       'failure',
        failureReason: `QR decryption failed: ${err instanceof Error ? err.message : String(err)}`,
        rawPayload:    qrPayload,
      });
    }

    return NextResponse.json(
      { error: 'Invalid QR Code', message: 'The QR payload could not be decrypted.' },
      { status: 422 },
    );
  }

  // ---------------------------------------------------------------------------
  // Validate expiry — Requirement 6.4
  // ---------------------------------------------------------------------------
  const now = new Date();
  if (new Date(decrypted.expiresAt) < now) {
    if (branchId) {
      await db.insert(scanLogs).values({
        branchId,
        scannedById:   actorId,
        passId:        decrypted.passId,
        passType,
        gateLocation:  gateLocation ?? null,
        outcome:       'failure',
        failureReason: `QR payload expired at ${decrypted.expiresAt}`,
        rawPayload:    qrPayload,
      });
    }

    return NextResponse.json(
      { error: 'Expired QR Code', message: 'This pass has expired.' },
      { status: 422 },
    );
  }

  // ---------------------------------------------------------------------------
  // Route to the appropriate handler based on passType
  // ---------------------------------------------------------------------------

  if (passType === 'gate_pass') {
    return handleGatePassScan({
      actorId, branchId, actorIp, qrPayload, gateLocation, decrypted, now,
    });
  }

  if (passType === 'visitor') {
    return handleVisitorScan({
      actorId, branchId, actorIp, qrPayload, gateLocation, decrypted, now,
    });
  }

  // hostel
  return handleHostelScan({
    actorId, branchId, actorIp, qrPayload, gateLocation, decrypted, now,
  });
};

// ---------------------------------------------------------------------------
// Gate pass scan logic
// ---------------------------------------------------------------------------

interface ScanContext {
  actorId: string;
  branchId: string;
  actorIp: string | null;
  qrPayload: string;
  gateLocation?: string;
  decrypted: ReturnType<typeof decryptQRPayload>;
  now: Date;
}

async function handleGatePassScan(ctx: ScanContext): Promise<NextResponse> {
  const { actorId, branchId, actorIp, qrPayload, gateLocation, decrypted, now } = ctx;

  const [pass] = await db
    .select()
    .from(gatePasses)
    .where(eq(gatePasses.id, decrypted.passId))
    .limit(1);

  if (!pass) {
    await db.insert(scanLogs).values({
      branchId,
      scannedById:   actorId,
      passId:        decrypted.passId,
      passType:      'gate_pass',
      gateLocation:  gateLocation ?? null,
      outcome:       'failure',
      failureReason: 'Gate pass record not found',
      rawPayload:    qrPayload,
    });
    return NextResponse.json({ error: 'Gate pass not found' }, { status: 404 });
  }

  // Branch isolation
  if (branchId && pass.branchId !== branchId) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  // Determine target status
  let targetStatus: 'exited' | 'returned';
  if (pass.status === 'approved') {
    targetStatus = 'exited';
  } else if (pass.status === 'exited') {
    targetStatus = 'returned';
  } else {
    await db.insert(scanLogs).values({
      branchId:      pass.branchId,
      scannedById:   actorId,
      passId:        pass.id,
      passType:      'gate_pass',
      gateLocation:  gateLocation ?? null,
      outcome:       'failure',
      failureReason: `Cannot scan a pass with status '${pass.status}'`,
      rawPayload:    qrPayload,
    });
    return NextResponse.json(
      {
        error:   'Invalid pass status',
        message: `Cannot scan a pass with status '${pass.status}'. Expected 'approved' or 'exited'.`,
      },
      { status: 422 },
    );
  }

  const transition = validateGatePassTransition(pass.status, targetStatus);
  if (!transition.valid) {
    return NextResponse.json(transition.error!.body, { status: transition.error!.status });
  }

  const previousState = { ...pass };

  const updateValues: Partial<typeof pass> & { updatedAt: Date } = {
    status:    targetStatus,
    updatedAt: now,
  };
  if (targetStatus === 'exited')   updateValues.actualTimeOut = now;
  if (targetStatus === 'returned') updateValues.actualTimeIn  = now;

  const [updated] = await db
    .update(gatePasses)
    .set(updateValues)
    .where(eq(gatePasses.id, pass.id))
    .returning();

  // Auto-close to 'used' on return
  let finalPass = updated;
  if (targetStatus === 'returned') {
    const [closed] = await db
      .update(gatePasses)
      .set({ status: 'used', updatedAt: now })
      .where(eq(gatePasses.id, pass.id))
      .returning();
    finalPass = closed;
  }

  // Write success scan log — Requirement 6.5
  await db.insert(scanLogs).values({
    branchId:     pass.branchId,
    scannedById:  actorId,
    passId:       pass.id,
    passType:     'gate_pass',
    gateLocation: gateLocation ?? null,
    outcome:      'success',
    rawPayload:   qrPayload,
  });

  // Write audit log — Requirement 4.17
  await writeAuditLog({
    actorId,
    branchId:      pass.branchId,
    actorIp,
    action:        'UPDATE',
    entityType:    'gate_passes',
    entityId:      pass.id,
    previousState,
    newState:      finalPass,
    metadata:      { gateLocation, scanAction: targetStatus, via: 'unified_scan' },
  });

  // Resolve holder name — Requirement 6.3
  const [student] = await db
    .select({ name: users.name })
    .from(users)
    .where(eq(users.id, pass.studentId))
    .limit(1);

  return NextResponse.json({
    holderName: student?.name ?? 'Unknown',
    status:     finalPass.status,
    passId:     pass.id,
  });
}

// ---------------------------------------------------------------------------
// Visitor scan logic
// ---------------------------------------------------------------------------

async function handleVisitorScan(ctx: ScanContext): Promise<NextResponse> {
  const { actorId, branchId, actorIp, qrPayload, gateLocation, decrypted, now } = ctx;

  const [visit] = await db
    .select()
    .from(visits)
    .where(eq(visits.id, decrypted.passId))
    .limit(1);

  if (!visit) {
    await db.insert(scanLogs).values({
      branchId,
      scannedById:   actorId,
      passId:        decrypted.passId,
      passType:      'visitor',
      gateLocation:  gateLocation ?? null,
      outcome:       'failure',
      failureReason: 'Visit record not found',
      rawPayload:    qrPayload,
    });
    return NextResponse.json(
      { error: 'Visit not found', message: 'No visit record matches this QR code.' },
      { status: 422 },
    );
  }

  // Branch isolation
  if (branchId && visit.branchId !== branchId) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  if (visit.status !== 'approved' && visit.status !== 'checked_in') {
    await db.insert(scanLogs).values({
      branchId:      visit.branchId,
      scannedById:   actorId,
      passId:        visit.id,
      passType:      'visitor',
      gateLocation:  gateLocation ?? null,
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

  const targetStatus = visit.status === 'approved' ? 'checked_in' : 'checked_out';

  const transition = validateVisitTransition(visit.status, targetStatus);
  if (!transition.valid) {
    return NextResponse.json(transition.error!.body, { status: transition.error!.status });
  }

  const previousState = { ...visit };

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

  // Write success scan log — Requirement 6.5
  await db.insert(scanLogs).values({
    branchId:     visit.branchId,
    scannedById:  actorId,
    passId:       visit.id,
    passType:     'visitor',
    gateLocation: gateLocation ?? null,
    outcome:      'success',
    rawPayload:   qrPayload,
  });

  // Write audit log
  await writeAuditLog({
    actorId,
    branchId:      visit.branchId,
    actorIp,
    action:        'UPDATE',
    entityType:    'visits',
    entityId:      visit.id,
    previousState,
    newState:      updatedVisit,
    metadata:      { gateLocation, scanAction: targetStatus, via: 'unified_scan' },
  });

  // Resolve visitor name — Requirement 6.3
  const [visitor] = await db
    .select({ name: visitors.name })
    .from(visitors)
    .where(eq(visitors.id, visit.visitorId))
    .limit(1);

  return NextResponse.json({
    holderName: visitor?.name ?? 'Unknown',
    status:     updatedVisit.status,
    visitId:    updatedVisit.id,
  });
}

// ---------------------------------------------------------------------------
// Hostel scan logic
// ---------------------------------------------------------------------------

async function handleHostelScan(ctx: ScanContext): Promise<NextResponse> {
  const { actorId, branchId, actorIp, qrPayload, gateLocation, decrypted, now } = ctx;

  const [movement] = await db
    .select()
    .from(hostelMovements)
    .where(eq(hostelMovements.id, decrypted.passId))
    .limit(1);

  if (!movement) {
    await db.insert(scanLogs).values({
      branchId,
      scannedById:   actorId,
      passId:        decrypted.passId,
      passType:      'hostel',
      gateLocation:  gateLocation ?? null,
      outcome:       'failure',
      failureReason: 'Hostel movement record not found',
      rawPayload:    qrPayload,
    });
    return NextResponse.json({ error: 'Hostel movement not found' }, { status: 404 });
  }

  // Branch isolation
  if (branchId && movement.branchId !== branchId) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  // Determine action: approved → departed, departed → returned
  let targetStatus: 'departed' | 'returned';
  if (movement.status === 'approved') {
    targetStatus = 'departed';
  } else if (movement.status === 'departed') {
    targetStatus = 'returned';
  } else {
    await db.insert(scanLogs).values({
      branchId:      movement.branchId,
      scannedById:   actorId,
      passId:        movement.id,
      passType:      'hostel',
      gateLocation:  gateLocation ?? null,
      outcome:       'failure',
      failureReason: `Cannot scan a hostel movement with status '${movement.status}'`,
      rawPayload:    qrPayload,
    });
    return NextResponse.json(
      {
        error:   'Invalid movement status',
        message: `Cannot scan a hostel movement with status '${movement.status}'. Expected 'approved' or 'departed'.`,
      },
      { status: 422 },
    );
  }

  const previousState = { ...movement };

  const updatePayload =
    targetStatus === 'departed'
      ? { status: 'departed' as const, actualDeparture: now, updatedAt: now }
      : { status: 'returned' as const, actualReturn: now, updatedAt: now };

  const [updated] = await db
    .update(hostelMovements)
    .set(updatePayload)
    .where(eq(hostelMovements.id, movement.id))
    .returning();

  // Write success scan log — Requirement 6.5
  await db.insert(scanLogs).values({
    branchId:     movement.branchId,
    scannedById:  actorId,
    passId:       movement.id,
    passType:     'hostel',
    gateLocation: gateLocation ?? null,
    outcome:      'success',
    rawPayload:   qrPayload,
  });

  // Write audit log
  await writeAuditLog({
    actorId,
    branchId:      movement.branchId,
    actorIp,
    action:        'UPDATE',
    entityType:    'hostel_movements',
    entityId:      movement.id,
    previousState,
    newState:      updated,
    metadata:      { gateLocation, scanAction: targetStatus, via: 'unified_scan' },
  });

  // Resolve student name — Requirement 6.3
  const [student] = await db
    .select({ name: users.name })
    .from(users)
    .where(eq(users.id, movement.studentId))
    .limit(1);

  return NextResponse.json({
    holderName:      student?.name ?? 'Unknown',
    status:          updated.status,
    movementId:      movement.id,
    actualDeparture: updated.actualDeparture?.toISOString() ?? null,
    actualReturn:    updated.actualReturn?.toISOString() ?? null,
  });
}

// ---------------------------------------------------------------------------
// Export handler wrapped with RBAC
// ---------------------------------------------------------------------------

export const POST = withRBAC(postHandler, ['watchman', 'security_head']);
