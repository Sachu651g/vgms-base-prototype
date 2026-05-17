/**
 * app/api/users/[id]/route.ts
 *
 * Task 14.2 — PUT /api/users/:id, DELETE /api/users/:id
 *
 * PUT    (roles: branch_admin own branch, super_admin):
 *   Update user fields, enforce branch isolation, write UPDATE audit log.
 *
 * DELETE (roles: branch_admin own branch, super_admin):
 *   Delete user, enforce branch isolation, write DELETE audit log.
 *
 * Requirements: 7.1, 9.1
 */

import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { z } from 'zod';
import { eq } from 'drizzle-orm';
import { getServerSession } from 'next-auth/next';
import bcrypt from 'bcryptjs';

import { db } from '@/db';
import { users, userRoleEnum } from '@/db/schema';
import { authOptions, withRBAC, withBranchIsolation } from '@/lib/auth';
import type { RouteContext, BranchIsolatedHandler } from '@/lib/auth';
import { writeAuditLog } from '@/lib/utils';

// ---------------------------------------------------------------------------
// Zod schema for PUT body (all fields optional)
// ---------------------------------------------------------------------------

const updateUserSchema = z.object({
  name:         z.string().min(1).optional(),
  email:        z.string().email().optional(),
  password:     z.string().min(8).optional(),
  role:         z.enum(userRoleEnum.enumValues).optional(),
  phone:        z.string().optional(),
  departmentId: z.string().uuid().optional(),
  isActive:     z.boolean().optional(),
});

// ---------------------------------------------------------------------------
// Helper — resolve user ID from route context
// ---------------------------------------------------------------------------

function getUserId(context: RouteContext): string | null {
  const raw = context.params?.id;
  if (!raw) return null;
  return Array.isArray(raw) ? raw[0] : raw;
}

// ---------------------------------------------------------------------------
// PUT /api/users/:id — Task 14.2
// ---------------------------------------------------------------------------

const putHandler: BranchIsolatedHandler = async (
  req: NextRequest,
  context: RouteContext,
  branchId: string | null,
) => {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const userId  = getUserId(context);
  const actorIp = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ?? null;

  if (!userId) {
    return NextResponse.json({ error: 'Missing user ID' }, { status: 400 });
  }

  // Fetch the target user
  const [targetUser] = await db
    .select()
    .from(users)
    .where(eq(users.id, userId))
    .limit(1);

  if (!targetUser) {
    return NextResponse.json({ error: 'User not found' }, { status: 404 });
  }

  // Branch isolation — Requirement 9.1
  // branch_admin can only update users in their own branch
  if (branchId && targetUser.branchId !== branchId) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  const parsed = updateUserSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: 'Validation error', issues: parsed.error.issues },
      { status: 422 },
    );
  }

  const updates: Partial<typeof users.$inferInsert> = {};

  if (parsed.data.name !== undefined)         updates.name         = parsed.data.name;
  if (parsed.data.email !== undefined)        updates.email        = parsed.data.email.toLowerCase().trim();
  if (parsed.data.role !== undefined)         updates.role         = parsed.data.role;
  if (parsed.data.phone !== undefined)        updates.phone        = parsed.data.phone;
  if (parsed.data.departmentId !== undefined) updates.departmentId = parsed.data.departmentId;
  if (parsed.data.isActive !== undefined)     updates.isActive     = parsed.data.isActive;

  // Hash new password if provided — Requirement 1.5
  if (parsed.data.password !== undefined) {
    updates.passwordHash = await bcrypt.hash(parsed.data.password, 12);
  }

  updates.updatedAt = new Date();

  const previousState = { ...targetUser, passwordHash: '[REDACTED]' };

  const [updatedUser] = await db
    .update(users)
    .set(updates)
    .where(eq(users.id, userId))
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

  // Requirement 7.1 — write UPDATE audit log
  await writeAuditLog({
    actorId:       session.user.id,
    branchId:      targetUser.branchId,
    actorIp,
    action:        'UPDATE',
    entityType:    'users',
    entityId:      userId,
    previousState,
    newState:      updatedUser,
  });

  return NextResponse.json({ user: updatedUser });
};

// ---------------------------------------------------------------------------
// DELETE /api/users/:id — Task 14.2
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

  const userId  = getUserId(context);
  const actorIp = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ?? null;

  if (!userId) {
    return NextResponse.json({ error: 'Missing user ID' }, { status: 400 });
  }

  // Fetch the target user
  const [targetUser] = await db
    .select()
    .from(users)
    .where(eq(users.id, userId))
    .limit(1);

  if (!targetUser) {
    return NextResponse.json({ error: 'User not found' }, { status: 404 });
  }

  // Branch isolation — Requirement 9.1
  if (branchId && targetUser.branchId !== branchId) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  // Prevent self-deletion
  if (targetUser.id === session.user.id) {
    return NextResponse.json(
      { error: 'Bad Request', message: 'You cannot delete your own account.' },
      { status: 400 },
    );
  }

  const previousState = { ...targetUser, passwordHash: '[REDACTED]' };

  await db.delete(users).where(eq(users.id, userId));

  // Requirement 7.1 — write DELETE audit log
  await writeAuditLog({
    actorId:       session.user.id,
    branchId:      targetUser.branchId,
    actorIp,
    action:        'DELETE',
    entityType:    'users',
    entityId:      userId,
    previousState,
  });

  return NextResponse.json({ message: 'User deleted successfully.' });
};

// ---------------------------------------------------------------------------
// Export handlers wrapped with RBAC + branch isolation
// ---------------------------------------------------------------------------

export const PUT = withRBAC(
  withBranchIsolation(putHandler),
  ['branch_admin', 'super_admin'],
);

export const DELETE = withRBAC(
  withBranchIsolation(deleteHandler),
  ['branch_admin', 'super_admin'],
);
