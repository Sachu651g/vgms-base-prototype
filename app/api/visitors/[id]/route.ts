/**
 * app/api/visitors/[id]/route.ts
 *
 * GET /api/visitors/:id — full visitor + visit detail (task 9.3)
 * PUT /api/visitors/:id — update visitor fields (task 9.3)
 *
 * Requirements: 3.15, 9.1
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
import { writeAuditLog } from '@/lib/utils';

// ---------------------------------------------------------------------------
// Zod schema for PUT body
// ---------------------------------------------------------------------------

const updateVisitorSchema = z.object({
  name:     z.string().min(1).max(255).optional(),
  phone:    z.string().min(1).max(20).optional(),
  email:    z.string().email().max(255).optional().nullable(),
  idType:   z.string().max(50).optional().nullable(),
  idNumber: z.string().max(100).optional().nullable(),
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
// GET /api/visitors/:id
// ---------------------------------------------------------------------------

const getHandler: BranchIsolatedHandler = async (
  _req: NextRequest,
  context: RouteContext,
  branchId: string | null,
) => {
  const visitorId = getVisitorId(context);
  if (!visitorId) {
    return NextResponse.json({ error: 'Missing visitor id' }, { status: 400 });
  }

  // Fetch visitor
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

  // Fetch associated visits
  const visitRecords = await db
    .select()
    .from(visits)
    .where(eq(visits.visitorId, visitorId));

  return NextResponse.json({ visitor, visits: visitRecords });
};

// ---------------------------------------------------------------------------
// PUT /api/visitors/:id
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

  const parsed = updateVisitorSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: 'Validation error', issues: parsed.error.issues },
      { status: 422 },
    );
  }

  // Fetch existing visitor (enforce branch isolation)
  const [existing] = await db
    .select()
    .from(visitors)
    .where(
      branchId !== null
        ? and(eq(visitors.id, visitorId), eq(visitors.branchId, branchId))
        : eq(visitors.id, visitorId),
    )
    .limit(1);

  if (!existing) {
    return NextResponse.json({ error: 'Visitor not found' }, { status: 404 });
  }

  const data = parsed.data;

  // Build update payload — only include defined fields
  const updatePayload: Partial<typeof visitors.$inferInsert> = {
    updatedAt: new Date(),
  };
  if (data.name     !== undefined) updatePayload.name     = data.name;
  if (data.phone    !== undefined) updatePayload.phone    = data.phone;
  if (data.email    !== undefined) updatePayload.email    = data.email ?? undefined;
  if (data.idType   !== undefined) updatePayload.idType   = data.idType ?? undefined;
  if (data.idNumber !== undefined) updatePayload.idNumber = data.idNumber ?? undefined;

  const [updated] = await db
    .update(visitors)
    .set(updatePayload)
    .where(eq(visitors.id, visitorId))
    .returning();

  // Requirement 3.15 — write UPDATE audit log
  await writeAuditLog({
    actorId,
    branchId: existing.branchId,
    actorIp,
    action:        'UPDATE',
    entityType:    'visitors',
    entityId:      visitorId,
    previousState: existing,
    newState:      updated,
  });

  return NextResponse.json({ visitor: updated });
};

// ---------------------------------------------------------------------------
// Export route handlers
// ---------------------------------------------------------------------------

const ALLOWED_ROLES = ['receptionist', 'branch_admin', 'super_admin'] as const;

export const GET = withRBAC(
  withBranchIsolation(getHandler),
  [...ALLOWED_ROLES],
);

export const PUT = withRBAC(
  withBranchIsolation(putHandler),
  [...ALLOWED_ROLES],
);
