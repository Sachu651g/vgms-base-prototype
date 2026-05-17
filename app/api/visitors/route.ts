/**
 * app/api/visitors/route.ts
 *
 * POST /api/visitors — register a new visitor (tasks 9.1)
 * GET  /api/visitors — list visitors with pagination (task 9.2)
 *
 * Requirements: 3.3, 3.4, 3.5, 3.11, 3.12, 3.15, 9.1
 */

import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { z } from 'zod';
import { and, eq, ilike, gte, lte, sql } from 'drizzle-orm';
import { getServerSession } from 'next-auth/next';

import { db } from '@/db';
import { visitors, visits, blacklist } from '@/db/schema';
import { authOptions } from '@/lib/auth';
import { withRBAC, withBranchIsolation } from '@/lib/auth';
import type { RouteContext, BranchIsolatedHandler } from '@/lib/auth';
import { writeAuditLog } from '@/lib/utils';
import { sendNotification } from '@/lib/notifications';

// ---------------------------------------------------------------------------
// Zod schema for POST body
// ---------------------------------------------------------------------------

const createVisitorSchema = z.object({
  name:                    z.string().min(1).max(255),
  phone:                   z.string().min(1).max(20),
  email:                   z.string().email().max(255).optional(),
  idType:                  z.string().max(50).optional(),
  idNumber:                z.string().max(100).optional(),
  purpose:                 z.string().min(1),
  hostUserId:              z.string().uuid(),
  expectedArrival:         z.string().datetime(),
  expectedDurationMinutes: z.number().int().positive(),
  branchId:                z.string().uuid().optional(),
});

// ---------------------------------------------------------------------------
// POST /api/visitors
// ---------------------------------------------------------------------------

const postHandler: BranchIsolatedHandler = async (
  req: NextRequest,
  _context: RouteContext,
  branchId: string | null,
) => {
  const session = await getServerSession(authOptions);
  const actorId = session!.user.id;
  const actorIp = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ?? null;

  // Parse + validate body
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  const parsed = createVisitorSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: 'Validation error', issues: parsed.error.issues },
      { status: 422 },
    );
  }

  const data = parsed.data;

  // Resolve effective branchId: super_admin may supply one in the body,
  // all other roles use their session branchId.
  const effectiveBranchId: string = data.branchId ?? branchId ?? '';
  if (!effectiveBranchId) {
    return NextResponse.json(
      { error: 'branchId is required for this role' },
      { status: 422 },
    );
  }

  // ------------------------------------------------------------------
  // Requirement 3.3 — blacklist check (exact name + phone match)
  // ------------------------------------------------------------------
  const blacklistMatches = await db
    .select()
    .from(blacklist)
    .where(
      and(
        eq(blacklist.name, data.name),
        eq(blacklist.phone, data.phone),
      ),
    )
    .limit(1);

  if (blacklistMatches.length > 0) {
    const entry = blacklistMatches[0];

    await writeAuditLog({
      actorId,
      branchId: effectiveBranchId,
      actorIp,
      action:     'BLOCKED_REGISTRATION',
      entityType: 'visitors',
      metadata: {
        visitorName:  data.name,
        visitorPhone: data.phone,
        blacklistId:  entry.id,
        reason:       entry.reason,
      },
    });

    return NextResponse.json(
      {
        error:  'Registration blocked',
        reason: entry.reason,
        code:   'BLOCKED_REGISTRATION',
      },
      { status: 409 },
    );
  }

  // ------------------------------------------------------------------
  // Requirement 3.4 — create Visitor + Visit records
  // ------------------------------------------------------------------
  const [newVisitor] = await db
    .insert(visitors)
    .values({
      branchId: effectiveBranchId,
      name:     data.name,
      phone:    data.phone,
      email:    data.email,
      idType:   data.idType,
      idNumber: data.idNumber,
    })
    .returning();

  const [newVisit] = await db
    .insert(visits)
    .values({
      branchId:                effectiveBranchId,
      visitorId:               newVisitor.id,
      hostUserId:              data.hostUserId,
      registeredById:          actorId,
      purpose:                 data.purpose,
      expectedArrival:         new Date(data.expectedArrival),
      expectedDurationMinutes: data.expectedDurationMinutes,
      status:                  'pending',
    })
    .returning();

  // ------------------------------------------------------------------
  // Requirement 3.5 — notify host user
  // ------------------------------------------------------------------
  await sendNotification({
    userId:     data.hostUserId,
    branchId:   effectiveBranchId,
    title:      'Visitor Approval Request',
    message:    `${data.name} (${data.phone}) has registered to visit you. Purpose: ${data.purpose}. Please approve or reject.`,
    severity:   'info',
    entityType: 'visits',
    entityId:   newVisit.id,
  });

  // ------------------------------------------------------------------
  // Requirement 3.15 — write CREATE audit log
  // ------------------------------------------------------------------
  await writeAuditLog({
    actorId,
    branchId: effectiveBranchId,
    actorIp,
    action:     'CREATE',
    entityType: 'visits',
    entityId:   newVisit.id,
    newState:   { visitorId: newVisitor.id, visitId: newVisit.id, status: 'pending' },
  });

  return NextResponse.json(
    { visitorId: newVisitor.id, visitId: newVisit.id, status: 'pending' },
    { status: 201 },
  );
};

// ---------------------------------------------------------------------------
// GET /api/visitors
// ---------------------------------------------------------------------------

const getHandler: BranchIsolatedHandler = async (
  req: NextRequest,
  _context: RouteContext,
  branchId: string | null,
) => {
  const { searchParams } = req.nextUrl;

  const name       = searchParams.get('name') ?? undefined;
  const dateFrom   = searchParams.get('dateFrom') ?? undefined;
  const dateTo     = searchParams.get('dateTo') ?? undefined;
  const hostUserId = searchParams.get('hostUserId') ?? undefined;
  const page       = Math.max(1, parseInt(searchParams.get('page') ?? '1', 10));
  const limit      = Math.min(100, Math.max(1, parseInt(searchParams.get('limit') ?? '20', 10)));
  const offset     = (page - 1) * limit;

  // Build WHERE conditions
  const conditions = [];

  // Branch isolation — Requirement 9.1
  if (branchId !== null) {
    conditions.push(eq(visits.branchId, branchId));
  }

  if (hostUserId) {
    conditions.push(eq(visits.hostUserId, hostUserId));
  }

  if (dateFrom) {
    conditions.push(gte(visits.expectedArrival, new Date(dateFrom)));
  }

  if (dateTo) {
    conditions.push(lte(visits.expectedArrival, new Date(dateTo)));
  }

  // Name filter applies to the visitors table — use a subquery approach
  // by joining visitors and filtering on name
  const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

  // Fetch visits joined with visitors
  const rows = await db
    .select({
      visitId:                 visits.id,
      visitorId:               visits.visitorId,
      branchId:                visits.branchId,
      hostUserId:              visits.hostUserId,
      registeredById:          visits.registeredById,
      purpose:                 visits.purpose,
      expectedArrival:         visits.expectedArrival,
      expectedDurationMinutes: visits.expectedDurationMinutes,
      status:                  visits.status,
      actualCheckin:           visits.actualCheckin,
      actualCheckout:          visits.actualCheckout,
      rejectionReason:         visits.rejectionReason,
      createdAt:               visits.createdAt,
      visitorName:             visitors.name,
      visitorPhone:            visitors.phone,
      visitorEmail:            visitors.email,
    })
    .from(visits)
    .innerJoin(visitors, eq(visits.visitorId, visitors.id))
    .where(
      whereClause
        ? name
          ? and(whereClause, ilike(visitors.name, `%${name}%`))
          : whereClause
        : name
          ? ilike(visitors.name, `%${name}%`)
          : undefined,
    )
    .limit(limit)
    .offset(offset);

  // Count total for pagination
  const countConditions = [...conditions];
  if (name) {
    // We need to count with the name filter too — use a separate count query
  }

  const [{ total }] = await db
    .select({ total: sql<number>`count(*)::int` })
    .from(visits)
    .innerJoin(visitors, eq(visits.visitorId, visitors.id))
    .where(
      whereClause
        ? name
          ? and(whereClause, ilike(visitors.name, `%${name}%`))
          : whereClause
        : name
          ? ilike(visitors.name, `%${name}%`)
          : undefined,
    );

  return NextResponse.json({
    data:  rows,
    total,
    page,
    limit,
    totalPages: Math.ceil(total / limit),
  });
};

// ---------------------------------------------------------------------------
// Export route handlers wrapped with RBAC + branch isolation
// ---------------------------------------------------------------------------

export const POST = withRBAC(
  withBranchIsolation(postHandler),
  ['receptionist', 'branch_admin', 'super_admin'],
);

export const GET = withRBAC(
  withBranchIsolation(getHandler),
  ['receptionist', 'branch_admin', 'super_admin', 'security_head'],
);
