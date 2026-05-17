/**
 * lib/auth.ts — NextAuth configuration, account-lockout logic, RBAC middleware,
 * and branch-isolation middleware.
 *
 * Tasks: 5.1 (authorize callback), 5.2 (session/JWT callbacks + type extensions),
 *        5.3 (withRBAC), 5.4 (withBranchIsolation)
 *
 * Requirements: 1.1–1.14, 2.11, 9.1, 9.2
 */

import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import type { NextAuthOptions, Session } from 'next-auth';
import type { JWT } from 'next-auth/jwt';
import CredentialsProvider from 'next-auth/providers/credentials';
import { getServerSession } from 'next-auth/next';
import bcrypt from 'bcryptjs';
import { eq } from 'drizzle-orm';

import { db } from '@/db';
import { users } from '@/db/schema';
import type { UserRole } from '@/db/schema';
import { writeAuditLog } from '@/lib/utils';

// ---------------------------------------------------------------------------
// Type augmentation — extend next-auth Session and JWT with VGMS fields
// (Task 5.2 — Requirement 1.2)
// ---------------------------------------------------------------------------

declare module 'next-auth' {
  interface Session {
    user: {
      id: string;
      email: string;
      name: string;
      role: UserRole;
      branchId: string | null;
    };
  }

  // The User object returned from the authorize callback
  interface User {
    id: string;
    email: string;
    name: string;
    role: UserRole;
    branchId: string | null;
  }
}

declare module 'next-auth/jwt' {
  interface JWT {
    id: string;
    role: UserRole;
    branchId: string | null;
  }
}

// ---------------------------------------------------------------------------
// SessionUser — the shape returned from authorize and embedded in the session
// ---------------------------------------------------------------------------

export interface SessionUser {
  id: string;
  email: string;
  name: string;
  role: UserRole;
  branchId: string | null;
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const MAX_FAILED_ATTEMPTS = 5;
const LOCKOUT_DURATION_MS = 30 * 60 * 1000; // 30 minutes

// ---------------------------------------------------------------------------
// NextAuth configuration
// ---------------------------------------------------------------------------

export const authOptions: NextAuthOptions = {
  // Use JWT-based sessions (no database adapter needed for session storage)
  session: {
    strategy: 'jwt',
    // Task 5.2 — Requirement 1.4: 30-minute idle timeout
    maxAge: 1800,
  },

  pages: {
    signIn: '/login',
  },

  providers: [
    CredentialsProvider({
      name: 'Credentials',
      credentials: {
        email:    { label: 'Email',    type: 'email' },
        password: { label: 'Password', type: 'password' },
      },

      /**
       * Task 5.1 — authorize callback
       * Requirements: 1.1, 1.3, 1.5, 1.9–1.14
       */
      async authorize(credentials, req) {
        if (!credentials?.email || !credentials?.password) {
          return null;
        }

        const email    = credentials.email.toLowerCase().trim();
        const password = credentials.password;

        // Derive actor IP for audit log (best-effort)
        const actorIp =
          (req as NextRequest | undefined)?.headers?.get?.('x-forwarded-for')?.split(',')[0]?.trim()
          ?? null;

        // ------------------------------------------------------------------
        // 1. Look up user by email
        // ------------------------------------------------------------------
        const [user] = await db
          .select()
          .from(users)
          .where(eq(users.email, email))
          .limit(1);

        if (!user) {
          // Requirement 1.3: do not reveal which field is wrong
          return null;
        }

        // ------------------------------------------------------------------
        // 2. Check account lockout BEFORE password comparison
        //    Requirement 1.12 / 1.14
        // ------------------------------------------------------------------
        const now = new Date();

        if (user.lockedUntil && user.lockedUntil > now) {
          // Throw a structured error so NextAuth surfaces it to the client
          throw new Error(
            `LOCKED:${user.lockedUntil.toISOString()}`
          );
        }

        // ------------------------------------------------------------------
        // 3. Compare bcrypt hash — Requirement 1.5
        // ------------------------------------------------------------------
        const passwordValid = await bcrypt.compare(password, user.passwordHash);

        if (!passwordValid) {
          // ------------------------------------------------------------------
          // 4. On failure: increment failedLoginAttempts — Requirement 1.10
          // ------------------------------------------------------------------
          const newAttempts = (user.failedLoginAttempts ?? 0) + 1;

          if (newAttempts >= MAX_FAILED_ATTEMPTS) {
            // Requirement 1.11: lock the account for 30 minutes
            const lockedUntil = new Date(now.getTime() + LOCKOUT_DURATION_MS);

            await db
              .update(users)
              .set({
                failedLoginAttempts: newAttempts,
                lockedUntil,
                updatedAt: now,
              })
              .where(eq(users.id, user.id));

            // Write ACCOUNT_LOCKED audit log — Requirement 1.11
            await writeAuditLog({
              actorId:    user.id,
              branchId:   user.branchId,
              actorIp,
              action:     'ACCOUNT_LOCKED',
              entityType: 'users',
              entityId:   user.id,
              metadata:   {
                email:       user.email,
                lockedUntil: lockedUntil.toISOString(),
                attempts:    newAttempts,
              },
            });

            throw new Error(`LOCKED:${lockedUntil.toISOString()}`);
          } else {
            // Not yet at the threshold — just increment the counter
            await db
              .update(users)
              .set({
                failedLoginAttempts: newAttempts,
                updatedAt: now,
              })
              .where(eq(users.id, user.id));
          }

          // Requirement 1.3: generic error, no field hint
          return null;
        }

        // ------------------------------------------------------------------
        // 5. Successful authentication
        //    Requirement 1.13: reset failedLoginAttempts and lockedUntil
        // ------------------------------------------------------------------
        await db
          .update(users)
          .set({
            failedLoginAttempts: 0,
            lockedUntil:         null,
            updatedAt:           now,
          })
          .where(eq(users.id, user.id));

        // Return the SessionUser object — Requirement 1.2
        const sessionUser: SessionUser = {
          id:       user.id,
          email:    user.email,
          name:     user.name,
          role:     user.role,
          branchId: user.branchId ?? null,
        };

        return sessionUser;
      },
    }),
  ],

  callbacks: {
    /**
     * Task 5.2 — jwt callback
     * Embed role, branchId, and id into the JWT token so they survive
     * across requests without hitting the database.
     * Requirement 1.2
     */
    async jwt({ token, user }) {
      if (user) {
        // First sign-in: copy fields from the User object returned by authorize
        const u = user as SessionUser;
        token.id       = u.id;
        token.role     = u.role;
        token.branchId = u.branchId;
      }
      return token;
    },

    /**
     * Task 5.2 — session callback
     * Expose id, role, and branchId on the Session object so server
     * components and API routes can read them via getServerSession().
     * Requirement 1.2
     */
    async session({ session, token }: { session: Session; token: JWT }) {
      session.user.id       = token.id;
      session.user.role     = token.role;
      session.user.branchId = token.branchId;
      return session;
    },
  },
};

// ---------------------------------------------------------------------------
// NextAuth handler export (used by app/api/auth/[...nextauth]/route.ts)
// ---------------------------------------------------------------------------
// Note: next-auth v4 — NextAuth(authOptions) returns the route handler directly.
// The route file calls NextAuth(authOptions) itself; nothing extra is exported here.

// ---------------------------------------------------------------------------
// Route handler type helpers
// ---------------------------------------------------------------------------

/** Minimal context shape passed to Next.js App Router route handlers. */
export interface RouteContext {
  params?: Record<string, string | string[]>;
}

/** Standard Next.js App Router route handler signature. */
export type NextRouteHandler = (
  req: NextRequest,
  context: RouteContext
) => Promise<NextResponse> | NextResponse;

/** Route handler that also receives the resolved branchId (task 5.4). */
export type BranchIsolatedHandler = (
  req: NextRequest,
  context: RouteContext,
  branchId: string | null
) => Promise<NextResponse> | NextResponse;

// ---------------------------------------------------------------------------
// Task 5.3 — withRBAC middleware factory
// Requirements: 1.7, 2.11
// ---------------------------------------------------------------------------

/**
 * Wraps a route handler with role-based access control.
 *
 * - Returns HTTP 401 JSON if there is no active session.
 * - Returns HTTP 403 JSON and writes an UNAUTHORIZED_ACCESS audit log if the
 *   authenticated role is not in `allowedRoles`.
 * - Passes through to `handler` if the role is permitted.
 */
export function withRBAC(
  handler: NextRouteHandler,
  allowedRoles: UserRole[]
): NextRouteHandler {
  return async (req: NextRequest, context: RouteContext) => {
    const session = await getServerSession(authOptions);

    // No session → 401
    if (!session?.user) {
      return NextResponse.json(
        { error: 'Unauthorized', message: 'Authentication required.' },
        { status: 401 }
      );
    }

    const { role, id: actorId, branchId } = session.user;

    // Role not permitted → 403 + audit log
    if (!allowedRoles.includes(role)) {
      const actorIp =
        req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ?? null;

      await writeAuditLog({
        actorId,
        branchId,
        actorIp,
        action:     'UNAUTHORIZED_ACCESS',
        entityType: 'api_route',
        metadata:   {
          path:         req.nextUrl.pathname,
          method:       req.method,
          role,
          allowedRoles,
        },
      });

      return NextResponse.json(
        { error: 'Forbidden', message: 'You do not have permission to perform this action.' },
        { status: 403 }
      );
    }

    return handler(req, context);
  };
}

// ---------------------------------------------------------------------------
// Task 5.4 — withBranchIsolation middleware factory
// Requirements: 1.8, 9.1, 9.2
// ---------------------------------------------------------------------------

/**
 * Wraps a route handler with branch isolation.
 *
 * - For `super_admin`: passes `branchId = null` so the handler knows it may
 *   query across all branches.
 * - For all other roles: passes `branchId = session.user.branchId` so the
 *   handler can use it as a mandatory filter on every DB query.
 *
 * The handler signature is extended to `(req, context, branchId)`.
 */
export function withBranchIsolation(
  handler: BranchIsolatedHandler
): NextRouteHandler {
  return async (req: NextRequest, context: RouteContext) => {
    const session = await getServerSession(authOptions);

    if (!session?.user) {
      return NextResponse.json(
        { error: 'Unauthorized', message: 'Authentication required.' },
        { status: 401 }
      );
    }

    const { role, branchId } = session.user;

    // super_admin has cross-branch access — pass null so the handler skips
    // the branch filter.
    const resolvedBranchId: string | null =
      role === 'super_admin' ? null : (branchId ?? null);

    return handler(req, context, resolvedBranchId);
  };
}
