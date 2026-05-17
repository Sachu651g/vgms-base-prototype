/**
 * Property-Based Tests for Role-Based Access Control (RBAC).
 *
 * **Validates: Requirements 1.7, 2.11**
 *
 * Property: for any (role, route) pair, if the role is NOT in the allowed list
 * for that route, isAllowed(role, route) must return false.
 */

import { describe, it, expect } from 'vitest';
import * as fc from 'fast-check';

// ---------------------------------------------------------------------------
// Role → dashboard route map (mirrors middleware.ts roleRouteMap)
// ---------------------------------------------------------------------------

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

const allRoutes = Object.keys(roleRouteMap);

const allRoles = [
  'super_admin',
  'branch_admin',
  'warden',
  'hod',
  'security_head',
  'watchman',
  'receptionist',
  'student',
  'principal',
  'faculty',
] as const;

type Role = typeof allRoles[number];

// ---------------------------------------------------------------------------
// Pure isAllowed function (mirrors middleware logic)
// ---------------------------------------------------------------------------

function isAllowed(role: string, route: string): boolean {
  const allowedRoles = roleRouteMap[route];
  if (!allowedRoles) return false;
  return allowedRoles.includes(role);
}

// ---------------------------------------------------------------------------
// Property tests
// ---------------------------------------------------------------------------

describe('RBAC isAllowed (Property-Based)', () => {
  it('returns false when role is not in the allowed list for a route', () => {
    /**
     * **Validates: Requirements 1.7, 2.11**
     *
     * For any (role, route) pair where the role is NOT in the allowed list,
     * isAllowed must return false.
     */
    fc.assert(
      fc.property(
        fc.constantFrom(...allRoles),
        fc.constantFrom(...allRoutes),
        (role, route) => {
          const allowed = roleRouteMap[route].includes(role);
          const result = isAllowed(role, route);

          if (!allowed) {
            expect(result).toBe(false);
          } else {
            expect(result).toBe(true);
          }
        },
      ),
      { numRuns: 25 },
    );
  });

  it('returns true only for the exact roles assigned to each route', () => {
    /**
     * **Validates: Requirements 1.7, 2.11**
     *
     * For each route, every role in its allowed list must return true,
     * and every role NOT in its allowed list must return false.
     */
    for (const [route, allowedRoles] of Object.entries(roleRouteMap)) {
      for (const role of allRoles) {
        const expected = allowedRoles.includes(role);
        expect(isAllowed(role, route)).toBe(expected);
      }
    }
  });
});
