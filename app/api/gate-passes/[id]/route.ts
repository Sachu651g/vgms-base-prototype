/**
 * app/api/gate-passes/[id]/route.ts
 *
 * Task 11.3 — GET  /api/gate-passes/:id
 * Task 11.6 — DELETE /api/gate-passes/:id  (student own, pending only)
 *
 * Requirements: 4.11, 4.12, 4.17
 */

import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { eq } from 'drizzle-orm';
import { getServerSession } from 'next-auth/next';
import QRCode from 'qrcode';

import { db } from '@/db';
import { gatePasses } from '@/db/schema';
import { authOptions, withRBAC, withBranchIsolation } from '@/lib/auth';
import type { RouteContext, BranchIsolatedHandler } from '@/lib/auth';
import { validateGatePassTransition, writeAuditLog } from '@/lib/utils';

// ---------------------------------------------------------------------------
// Helper — resolve pass ID from route context
// ---------------------------------------------------------------------------

function getPassId(context: RouteContext): string | null {
  const raw = context.params?.id;
  if (!raw) return null;
  return Array.isArray(raw) ? raw[0] : raw;
}

// ---------------------------------------------------------------------------
// GET /api/gate-passes/:id — Task 11.3
// ---------------------------------------------------------------------------

const getHandler: BranchIsolatedHandler = async (
  _req: NextRequest,
  context: RouteContext,
  branchId: string | null,
) => {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const passId = getPassId(context);
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

  // Branch isolation — Requirement 9.1
  if (branchId && pass.branchId !== branchId) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  // Students may only view their own passes — Requirement 4.12
  if (session.user.role === 'student' && pass.studentId !== session.user.id) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  // For approved passes, include QR code as base64 PNG — Requirement 4.12
  let qrCode: string | undefined;
  if (pass.status === 'approved' && pass.qrPayload) {
    try {
      qrCode = await QRCode.toDataURL(pass.qrPayload);
    } catch {
      // Non-fatal — return pass without QR if generation fails
    }
  }

  return NextResponse.json({ pass, qrCode });
};

// ---------------------------------------------------------------------------
// DELETE /api/gate-passes/:id — Task 11.6
// ---------------------------------------------------------------------------

const deleteHandler: BranchIsolatedHandler = async (
  req: NextRequest,
  context: RouteContext,
  branchId: string | null,
) => {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const passId  = getPassId(context);
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

  // Verify the pass belongs to the session student — Requirement 4.11
  if (pass.studentId !== session.user.id) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  // Branch isolation
  if (branchId && pass.branchId !== branchId) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  // Only pending passes can be cancelled — Requirement 4.11
  const transition = validateGatePassTransition(pass.status, 'cancelled');
  if (!transition.valid) {
    return NextResponse.json(transition.error!.body, { status: transition.error!.status });
  }

  const previousState = { ...pass };

  const [updated] = await db
    .update(gatePasses)
    .set({ status: 'cancelled', updatedAt: new Date() })
    .where(eq(gatePasses.id, passId))
    .returning();

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
// Export handlers wrapped with RBAC + branch isolation
// ---------------------------------------------------------------------------

export const GET = withRBAC(
  withBranchIsolation(getHandler),
  ['student', 'hod', 'security_head', 'branch_admin', 'super_admin'],
);

export const DELETE = withRBAC(
  withBranchIsolation(deleteHandler),
  ['student'],
);
