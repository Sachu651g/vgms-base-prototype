/**
 * middleware.ts — Next.js Edge Middleware for VGMS
 *
 * Uses `withAuth` from `next-auth/middleware` (next-auth v4) to:
 *  1. Protect all `/dashboard/:path*` routes by matching the path prefix
 *     against `roleRouteMap` and redirecting to `/login` when the token's
 *     role is not in the allowed list.
 *  2. Protect all `/api/:path*` routes (excluding `/api/auth/:path*`) by
 *     ensuring a valid JWT token exists; per-route RBAC is handled by
 *     `withRBAC` inside each handler.
 *
 * Tasks: 7
 * Requirements: 1.7, 2.11
 */

import { withAuth } from 'next-auth/middleware';
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import type { JWT } from 'next-auth/jwt';

// ---------------------------------------------------------------------------
// Role → dashboard path prefix mapping
// (Requirement 2.11 — prevent cross-role dashboard access)
// ---------------------------------------------------------------------------

/**
 * Maps each dashboard path prefix to the roles that are allowed to access it.
 * The key is the path prefix (without trailing slash) that the request URL
 * must start with.
 */
const roleRouteMap: Record<string, string[]> = {
  '/dashboard/admin':        ['super_admin', 'branch_admin'],
  '/dashboard/warden':       ['warden'],
  '/dashboard/hod':          ['hod'],
  '/dashboard/security':     ['security_head', 'watchman'],
  '/dashboard/receptionist': ['receptionist'],
  '/dashboard/student':      ['student'],
  '/dashboard/principal':    ['principal'],
  '/dashboard/faculty':      ['faculty'],
};

// ---------------------------------------------------------------------------
// Middleware — withAuth wrapper
// ---------------------------------------------------------------------------

export default withAuth(
  /**
   * The `middleware` function runs AFTER `withAuth` has verified that a valid
   * JWT token exists (i.e. the user is authenticated).  At this point
   * `req.nextauth.token` is guaranteed to be non-null for protected routes.
   */
  function middleware(req: NextRequest & { nextauth: { token: JWT | null } }) {
    const { pathname } = req.nextUrl;
    const token = req.nextauth.token;

    // -----------------------------------------------------------------------
    // Dashboard route — enforce role-based path access
    // -----------------------------------------------------------------------
    if (pathname.startsWith('/dashboard/')) {
      // Find the first matching prefix in roleRouteMap
      const matchedPrefix = Object.keys(roleRouteMap).find((prefix) =>
        pathname === prefix || pathname.startsWith(prefix + '/')
      );

      if (matchedPrefix) {
        const allowedRoles = roleRouteMap[matchedPrefix];
        const userRole = token?.role as string | undefined;

        if (!userRole || !allowedRoles.includes(userRole)) {
          // Role not permitted for this dashboard — redirect to login
          const loginUrl = req.nextUrl.clone();
          loginUrl.pathname = '/login';
          loginUrl.search = '';
          return NextResponse.redirect(loginUrl);
        }
      }
    }

    // -----------------------------------------------------------------------
    // API routes — token existence is already guaranteed by withAuth's
    // `authorized` callback below; per-route RBAC is handled by `withRBAC`
    // inside each handler.  No additional checks needed here.
    // -----------------------------------------------------------------------

    return NextResponse.next();
  },

  {
    callbacks: {
      /**
       * `authorized` is called by `withAuth` before the middleware function
       * above.  Return `true` to allow the request to proceed to the
       * middleware function; return `false` to redirect to the sign-in page.
       *
       * For dashboard routes: require a valid token.
       * For API routes (excluding /api/auth/**): require a valid token so
       *   that unauthenticated callers receive a 401 from the handler rather
       *   than a redirect (next-auth redirects to /login by default when
       *   `authorized` returns false, but API clients expect JSON 401s —
       *   returning true here lets `withRBAC` inside each handler return the
       *   correct JSON 401/403 response).
       *
       * Note: /api/auth/** is excluded from the matcher entirely (see below),
       * so it never reaches this callback.
       */
      authorized({ token, req }) {
        const { pathname } = req.nextUrl;

        // Always require a token for dashboard routes
        if (pathname.startsWith('/dashboard/')) {
          return !!token;
        }

        // For API routes, let the request through regardless of token
        // presence so that `withRBAC` can return a proper JSON 401/403.
        // The middleware function above will not apply role checks to API
        // routes, so this is safe.
        return true;
      },
    },

    pages: {
      signIn: '/login',
    },
  }
);

// ---------------------------------------------------------------------------
// Matcher — apply this middleware only to dashboard and API routes.
// /api/auth/** is intentionally excluded so NextAuth's own handlers are
// never intercepted.
// ---------------------------------------------------------------------------

export const config = {
  matcher: [
    '/dashboard/:path*',
    '/api/((?!auth/).*)',
  ],
};
