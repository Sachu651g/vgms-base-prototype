/**
 * app/api/gate-passes/[id]/approve/route.ts
 *
 * Task 11.4 — PUT /api/gate-passes/:id/approve
 * Roles: hod (non-escalated), principal (escalated)
 *
 * Requirements: 4.6, 4.17, 6.1
 */

import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { eq } from 'drizzle-orm';
import { getServerSession } from 'next-auth/next';
import QRCode from 'qrcode';

import { db } from '@/db';
import { gatePasses, passApprovals } from '@/db/schema';
import { authOptions, withRBAC, withBranchIsolation } from '@/lib/auth';
import type { RouteContext, BranchIsolatedHandler } from '@/lib/auth';
import { validateGatePassTransition, writeAuditLog } from '@/lib/utils';
import { encryptQRPayload } from '@/lib/qr';
import { sendNotification } from '@/lib/notifications';

// ---------------------------------------------------------------------------
// PUT /api/gate-passes/:id/approve — Task 11.4
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

  const raw    = context.params?.id;
  const passId = Array.isArray(raw) ? raw[0] : raw;
  const actorIp = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ?? null;

  if (!passId) {
    return NextResponse.json({ error: 'Missing pass ID' }, { status: 400 });
  }

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
      { error: 'Invalid transition', message: `Cannot approve a pass with status '${pass.status}'` },
      { status: 422 },
    );
  }

  // Escalation check — if escalated, only principal can approve
  if (pass.escalated && session.user.role !== 'principal') {
    return NextResponse.json(
      {
        error:   'Forbidden',
        message: 'This pass has been escalated and can only be approved by the Principal.',
      },
      { status: 403 },
    );
  }

  // Validate state machine transition
  const transition = validateGatePassTransition(pass.status, 'approved');
  if (!transition.valid) {
    return NextResponse.json(transition.error!.body, { status: transition.error!.status });
  }

  // Generate QR payload — Requirement 6.1
  const qrPayloadObj = {
    passId:    pass.id,
    holderId:  pass.studentId,
    branchId:  pass.branchId,
    passType:  'gate_pass' as const,
    expiresAt: pass.requestedTimeIn.toISOString(),
  };

  const encryptedPayload = encryptQRPayload(qrPayloadObj);

  // Encode as base64 PNG
  const qrCodeDataUrl = await QRCode.toDataURL(encryptedPayload);

  const previousState = { ...pass };
  const now           = new Date();

  // Update gate pass
  const [updated] = await db
    .update(gatePasses)
    .set({
      status:       'approved',
      approvedById: session.user.id,
      qrPayload:    encryptedPayload,
      updatedAt:    now,
    })
    .where(eq(gatePasses.id, passId))
    .returning();

  // Create passApprovals record — Requirement 4.6
  await db.insert(passApprovals).values({
    passId:   passId,
    actorId:  session.user.id,
    action:   'APPROVED',
    level:    pass.escalated ? 'principal' : 'hod',
    notes:    null,
  });

  // Notify student — Requirement 4.6
  await sendNotification({
    userId:     pass.studentId,
    branchId:   pass.branchId,
    title:      'Gate Pass Approved',
    message:    `Your gate pass request has been approved. You may exit between ${pass.requestedTimeOut.toISOString()} and ${pass.requestedTimeIn.toISOString()}.`,
    severity:   'info',
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

  return NextResponse.json({
    passId,
    status:  updated.status,
    qrCode:  qrCodeDataUrl,
  });
};

// ---------------------------------------------------------------------------
// Export handler wrapped with RBAC + branch isolation
// ---------------------------------------------------------------------------

export const PUT = withRBAC(
  withBranchIsolation(approveHandler),
  ['hod', 'principal'],
);
