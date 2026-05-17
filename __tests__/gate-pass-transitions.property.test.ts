/**
 * Property-Based Tests for Gate Pass Status Transitions.
 *
 * **Validates: Requirements 4.2**
 *
 * Property: for any (from, to) pair from all gate pass statuses,
 * validateGatePassTransition(from, to) must return { valid: true } iff the pair
 * is in the allowed set, and { valid: false, error: { status: 422 } } otherwise.
 */

import { describe, it, expect, vi } from 'vitest';
import * as fc from 'fast-check';

// Mock @/db so the module-level DATABASE_URL check doesn't throw during import
vi.mock('@/db', () => ({ db: {} }));

import { canTransitionGatePass, validateGatePassTransition } from '@/lib/utils';

const gatePassStatuses = [
  'pending',
  'approved',
  'rejected',
  'cancelled',
  'exited',
  'returned',
  'expired',
  'used',
] as const;

// Ground-truth allowed transitions (mirrors GATE_PASS_TRANSITIONS in utils.ts)
const ALLOWED_GATE_PASS_TRANSITIONS: Record<string, readonly string[]> = {
  pending:   ['approved', 'rejected', 'cancelled'],
  approved:  ['exited', 'expired'],
  exited:    ['returned'],
  returned:  ['used'],
  rejected:  [],
  cancelled: [],
  expired:   [],
  used:      [],
};

describe('Gate Pass Transition State Machine (Property-Based)', () => {
  it('validateGatePassTransition returns { valid: true } iff the pair is in the allowed set', () => {
    /**
     * **Validates: Requirements 4.2**
     *
     * For any (from, to) pair drawn from all gate pass statuses:
     * - If the transition is allowed, validateGatePassTransition must return { valid: true }
     * - If the transition is not allowed, it must return { valid: false } with a 422 error
     */
    fc.assert(
      fc.property(
        fc.constantFrom(...gatePassStatuses),
        fc.constantFrom(...gatePassStatuses),
        (from, to) => {
          const isAllowed = ALLOWED_GATE_PASS_TRANSITIONS[from]?.includes(to) ?? false;
          const result = validateGatePassTransition(from, to);

          if (isAllowed) {
            expect(result.valid).toBe(true);
            expect(result.error).toBeUndefined();
          } else {
            expect(result.valid).toBe(false);
            expect(result.error).toBeDefined();
            expect(result.error?.status).toBe(422);
          }

          // canTransitionGatePass must agree with validateGatePassTransition
          expect(canTransitionGatePass(from, to)).toBe(isAllowed);
        },
      ),
      { numRuns: 25 },
    );
  });
});
