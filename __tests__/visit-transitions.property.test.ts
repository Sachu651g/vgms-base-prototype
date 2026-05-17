/**
 * Property-Based Tests for Visit Status Transitions.
 *
 * **Validates: Requirements 3.2**
 *
 * Property: for any (from, to) pair from all visit statuses,
 * validateVisitTransition(from, to) must return { valid: true } iff the pair
 * is in the allowed set, and { valid: false, error: { status: 422 } } otherwise.
 */

import { describe, it, expect, vi } from 'vitest';
import * as fc from 'fast-check';

// Mock @/db so the module-level DATABASE_URL check doesn't throw during import
vi.mock('@/db', () => ({ db: {} }));

import { canTransitionVisit, validateVisitTransition } from '@/lib/utils';

const visitStatuses = [
  'pending',
  'approved',
  'rejected',
  'checked_in',
  'checked_out',
  'expired',
  'no_show',
] as const;

// Ground-truth allowed transitions (mirrors VISIT_TRANSITIONS in utils.ts)
const ALLOWED_VISIT_TRANSITIONS: Record<string, readonly string[]> = {
  pending:     ['approved', 'rejected'],
  approved:    ['checked_in', 'expired'],
  checked_in:  ['checked_out', 'no_show'],
  rejected:    [],
  checked_out: [],
  expired:     [],
  no_show:     [],
};

describe('Visit Transition State Machine (Property-Based)', () => {
  it('validateVisitTransition returns { valid: true } iff the pair is in the allowed set', () => {
    /**
     * **Validates: Requirements 3.2**
     *
     * For any (from, to) pair drawn from all visit statuses:
     * - If the transition is allowed, validateVisitTransition must return { valid: true }
     * - If the transition is not allowed, it must return { valid: false } with a 422 error
     */
    fc.assert(
      fc.property(
        fc.constantFrom(...visitStatuses),
        fc.constantFrom(...visitStatuses),
        (from, to) => {
          const isAllowed = ALLOWED_VISIT_TRANSITIONS[from]?.includes(to) ?? false;
          const result = validateVisitTransition(from, to);

          if (isAllowed) {
            expect(result.valid).toBe(true);
            expect(result.error).toBeUndefined();
          } else {
            expect(result.valid).toBe(false);
            expect(result.error).toBeDefined();
            expect(result.error?.status).toBe(422);
          }

          // canTransitionVisit must agree with validateVisitTransition
          expect(canTransitionVisit(from, to)).toBe(isAllowed);
        },
      ),
      { numRuns: 25 },
    );
  });
});
