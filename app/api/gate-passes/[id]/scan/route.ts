/**
 * app/api/gate-passes/[id]/scan/route.ts
 *
 * Task 11.7 — POST /api/gate-passes/:id/scan
 * Roles: watchman, security_head
 *
 * Requirements: 4.8, 4.9, 4.10, 4.17
 */

import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { eq } from 'drizzle-orm';
import { getServerSession } from 'next-auth/next';
import { z } from 'zod';

import { db } from '@/db';
import { gatePasses, scanLogs, users } from '@/db/schema';
import { authOptions, withRBAC, withBranchIsolation } from '@/lib/auth';
import type { RouteContext, BranchIsolatedHandler } from '@/lib/auth';
import { validateGatePassTransition, writeAuditLog } from '@/lib/utils';
import { decryptQRPayload } from '@/lib/qr';

// ---------------------------------------------------------------------------
// Zod schema for POST body
// ---------------------------------------------------------------------------

const scanSchema = z.object({
  qrPayload:    z.string().min(1, 'qrPayload is required'),
  gateLocation: z.string().optional(),
});

// ---------------------------------------------------------------------------
// POST /api/gate-passes/:id/scan — Task 11.7
// ---------------------------------------------------------------------------

const scanHandler: BranchIsolatedHandler = async (
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

  const parsed = scanSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: 'Validation error', issues: parsed.error.issues },
      { status: 422 },
    );
  }

  const { qrPayload: rawQrPayload, gateLocation } = parsed.data;

  // Resolve the scanner's branchId for scan log
  const scannerBranchId = branchId ?? session.user.branchId ?? '';

  // ---------------------------------------------------------------------------
  // Decrypt QR payload — Requirement 4.8 / 6.4
  // ---------------------------------------------------------------------------
  let decrypted: ReturnType<typeof decryptQRPayload>;
  try {
    decrypted = decryptQRPayload(rawQrPayload);
  } catch (err) {
    // Write failure scan log — Requirement 4.10
    if (scannerBranchId) {
      await db.insert(scanLogs).values({
        branchId:      scannerBranchId,
        scannedById:   session.user.id,
        passId:        null,
        passType:      'gate_pass',
        gateLocation:  gateLocation ?? null,
        outcome:       'failure',
        failureReason: `QR decryption failed: ${err instanceof Error ? err.message : String(err)}`,
        rawPayload:    rawQrPayload,
      });
    }

    return NextResponse.json(
      { error: 'Invalid QR Code', message: 'The QR payload could not be decrypted.' },
      { status: 422 },
    );
  }

  // ---------------------------------------------------------------------------
  // Validate expiry — Requirement 4.10
  // ---------------------------------------------------------------------------
  const now = new Date();
  if (new Date(decrypted.expiresAt) < now) {
    if (scannerBranchId) {
      await db.insert(scanLogs).values({
        branchId:      scannerBranchId,
        scannedById:   session.user.id,
        passId:        decrypted.passId,
        passType:      'gate_pass',
        gateLocation:  gateLocation ?? null,
        outcome:       'failure',
        failureReason: 'QR payload has expired',
        rawPayload:    rawQrPayload,
      });
    }

    return NextResponse.json(
      { error: 'Expired QR Code', message: 'This gate pass has expired.' },
      { status: 422 },
    );
  }

  // ---------------------------------------------------------------------------
  // Look up the gate pass record
  // ---------------------------------------------------------------------------
  const [pass] = await db
    .select()
    .from(gatePasses)
    .where(eq(gatePasses.id, decrypted.passId))
    .limit(1);

  if (!pass) {
    if (scannerBranchId) {
      await db.insert(scanLogs).values({
        branchId:      scannerBranchId,
        scannedById:   session.user.id,
        passId:        decrypted.passId,
        passType:      'gate_pass',
        gateLocation:  gateLocation ?? null,
        outcome:       'failure',
        failureReason: 'Gate pass record not found',
        rawPayload:    rawQrPayload,
      });
    }

    return NextResponse.json({ error: 'Gate pass not found' }, { status: 404 });
  }

  // Branch isolation
  if (branchId && pass.branchId !== branchId) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  // ---------------------------------------------------------------------------
  // Determine target status — Requirement 4.8 / 4.9
  // ---------------------------------------------------------------------------
  let targetStatus: 'exited' | 'returned';

  if (pass.status === 'approved') {
    targetStatus = 'exited';
  } else if (pass.status === 'exited') {
    targetStatus = 'returned';
  } else {
    // Invalid status for scanning — Requirement 4.10
    await db.insert(scanLogs).values({
      branchId:      pass.branchId,
      scannedById:   session.user.id,
      passId:        pass.id,
      passType:      'gate_pass',
      gateLocation:  gateLocation ?? null,
      outcome:       'failure',
      failureReason: `Cannot scan a pass with status '${pass.status}'`,
      rawPayload:    rawQrPayload,
    });

    return NextResponse.json(
      {
        error:   'Invalid pass status',
        message: `Cannot scan a pass with status '${pass.status}'. Expected 'approved' or 'exited'.`,
      },
      { status: 422 },
    );
  }

  // Validate state machine transition
  const transition = validateGatePassTransition(pass.status, targetStatus);
  if (!transition.valid) {
    return NextResponse.json(transition.error!.body, { status: transition.error!.status });
  }

  // ---------------------------------------------------------------------------
  // Apply transition
  // ---------------------------------------------------------------------------
  const previousState = { ...pass };

  const updateValues: Partial<typeof pass> & { updatedAt: Date } = {
    status:    targetStatus,
    updatedAt: now,
  };

  if (targetStatus === 'exited') {
    updateValues.actualTimeOut = now;
  } else if (targetStatus === 'returned') {
    updateValues.actualTimeIn = now;
  }

  const [updated] = await db
    .update(gatePasses)
    .set(updateValues)
    .where(eq(gatePasses.id, pass.id))
    .returning();

  // Auto-close to 'used' on return — Requirement 4.9
  let finalPass = updated;
  if (targetStatus === 'returned') {
    const [closed] = await db
      .update(gatePasses)
      .set({ status: 'used', updatedAt: now })
      .where(eq(gatePasses.id, pass.id))
      .returning();
    finalPass = closed;
  }

  // ---------------------------------------------------------------------------
  // Write success scan log — Requirement 6.5
  // ---------------------------------------------------------------------------
  await db.insert(scanLogs).values({
    branchId:     pass.branchId,
    scannedById:  session.user.id,
    passId:       pass.id,
    passType:     'gate_pass',
    gateLocation: gateLocation ?? null,
    outcome:      'success',
    rawPayload:   rawQrPayload,
  });

  // ---------------------------------------------------------------------------
  // Write UPDATE audit log — Requirement 4.17
  // ---------------------------------------------------------------------------
  await writeAuditLog({
    actorId:       session.user.id,
    branchId:      pass.branchId,
    actorIp,
    action:        'UPDATE',
    entityType:    'gate_passes',
    entityId:      pass.id,
    previousState,
    newState:      finalPass,
    metadata:      { gateLocation, scanAction: targetStatus },
  });

  // ---------------------------------------------------------------------------
  // Resolve holder name for response — Requirement 6.3
  // ---------------------------------------------------------------------------
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
};

// ---------------------------------------------------------------------------
// Export handler wrapped with RBAC + branch isolation
// ---------------------------------------------------------------------------

export const POST = withRBAC(
  withBranchIsolation(scanHandler),
  ['watchman', 'security_head'],
);
