/**
 * app/api/users/route.ts
 *
 * Task 14.1 — GET /api/users, POST /api/users
 *
 * GET  (roles: branch_admin, super_admin):
 *   Query params: role, branchId (super_admin only), departmentId
 *   Enforces branch isolation.
 *
 * POST (roles: branch_admin, super_admin):
 *   Body: { name, email, password, role, phone?, departmentId?, branchId? }
 *   Hashes password with bcrypt (12 rounds).
 *   branch_admin: auto-assigns branchId from session (ignores body branchId).
 *   Writes CREATE audit log.
 *
 * Requirements: 1.5, 7.1, 9.1
 */

import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { z } from 'zod';
import { and, eq } from 'drizzle-orm';
import { getServerSession } from 'next-auth/next';
import bcrypt from 'bcryptjs';

import { db } from '@/db';
import { users, userRoleEnum } from '@/db/schema';
import { authOptions, withRBAC, withBranchIsolation } from '@/lib/auth';
import type { RouteContext, BranchIsolatedHandler } from '@/lib/auth';
import { writeAuditLog } from '@/lib/utils';

// ---------------------------------------------------------------------------
// Zod schema for POST body
// ---------------------------------------------------------------------------

const createUserSchema = z.object({
  name:         z.string().min(1, 'Name is required'),
  email:        z.string().email('Invalid email address'),
  password:     z.string().min(8, 'Password must be at least 8 characters'),
  role:         z.enum(userRoleEnum.enumValues),
  phone:        z.string().optional(),
  departmentId: z.string().uuid('Invalid departmentId').optional(),
  branchId:     z.string().uuid('Invalid branchId').optional(),
});

// ---------------------------------------------------------------------------
// GET /api/users — Task 14.1
// ---------------------------------------------------------------------------

const getHandler: BranchIsolatedHandler = async (
  req: NextRequest,
  _context: RouteContext,
  branchId: string | null,
) => {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { role: actorRole } = session.user;
  const { searchParams }    = req.nextUrl;

  const roleParam         = searchParams.get('role');
  const branchIdParam     = searchParams.get('branchId');
  const departmentIdParam = searchParams.get('departmentId');

  const conditions = [];

  // Branch isolation — Requirement 9.1
  // branch_admin always sees only their own branch; super_admin may filter by branchId param
  if (branchId) {
    // Non-super_admin: enforce session branch
    conditions.push(eq(users.branchId, branchId));
  } else if (actorRole === 'super_admin' && branchIdParam) {
    // super_admin filtering by a specific branch
    conditions.push(eq(users.branchId, branchIdParam));
  }

  if (roleParam) {
    conditions.push(eq(users.role, roleParam as typeof userRoleEnum.enumValues[number]));
  }

  if (departmentIdParam) {
    conditions.push(eq(users.departmentId, departmentIdParam));
  }

  const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

  const rows = await db
    .select({
      id:           users.id,
      branchId:     users.branchId,
      departmentId: users.departmentId,
      name:         users.name,
      email:        users.email,
      role:         users.role,
      phone:        users.phone,
      isActive:     users.isActive,
      createdAt:    users.createdAt,
      updatedAt:    users.updatedAt,
    })
    .from(users)
    .where(whereClause);

  return NextResponse.json({ users: rows });
};

// ---------------------------------------------------------------------------
// POST /api/users — Task 14.1
// ---------------------------------------------------------------------------

const postHandler: BranchIsolatedHandler = async (
  req: NextRequest,
  _context: RouteContext,
  branchId: string | null,
) => {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const actorIp = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ?? null;

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  const parsed = createUserSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: 'Validation error', issues: parsed.error.issues },
      { status: 422 },
    );
  }

  const { name, email, password, role, phone, departmentId } = parsed.data;

  // Determine branchId:
  // branch_admin always uses their own session branchId (ignore body branchId).
  // super_admin may supply branchId in the body.
  let resolvedBranchId: string | null;
  if (session.user.role === 'branch_admin') {
    resolvedBranchId = session.user.branchId ?? null;
  } else {
    // super_admin
    resolvedBranchId = parsed.data.branchId ?? branchId ?? null;
  }

  // Hash password — Requirement 1.5 (12 rounds)
  const passwordHash = await bcrypt.hash(password, 12);

  // Check for duplicate email
  const [existing] = await db
    .select({ id: users.id })
    .from(users)
    .where(eq(users.email, email.toLowerCase().trim()))
    .limit(1);

  if (existing) {
    return NextResponse.json(
      { error: 'Conflict', message: 'A user with this email already exists.' },
      { status: 409 },
    );
  }

  const [newUser] = await db
    .insert(users)
    .values({
      name,
      email:        email.toLowerCase().trim(),
      passwordHash,
      role,
      phone:        phone ?? null,
      departmentId: departmentId ?? null,
      branchId:     resolvedBranchId ?? undefined,
      isActive:     true,
    })
    .returning({
      id:           users.id,
      branchId:     users.branchId,
      departmentId: users.departmentId,
      name:         users.name,
      email:        users.email,
      role:         users.role,
      phone:        users.phone,
      isActive:     users.isActive,
      createdAt:    users.createdAt,
      updatedAt:    users.updatedAt,
    });

  // Requirement 7.1 — write CREATE audit log
  await writeAuditLog({
    actorId:    session.user.id,
    branchId:   resolvedBranchId,
    actorIp,
    action:     'CREATE',
    entityType: 'users',
    entityId:   newUser.id,
    newState:   newUser,
  });

  return NextResponse.json({ user: newUser }, { status: 201 });
};

// ---------------------------------------------------------------------------
// Export handlers wrapped with RBAC + branch isolation
// ---------------------------------------------------------------------------

export const GET = withRBAC(
  withBranchIsolation(getHandler),
  ['branch_admin', 'super_admin'],
);

export const POST = withRBAC(
  withBranchIsolation(postHandler),
  ['branch_admin', 'super_admin'],
);
