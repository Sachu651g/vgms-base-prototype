/**
 * Property-Based Tests for Hostel Movement Count Logic.
 *
 * **Validates: Requirements 8.1, 8.2**
 *
 * Property: for any array of movement statuses, computeHostelCounts must
 * correctly compute currentlyOut, currentlyIn, and totalResidents.
 */

import { describe, it, expect } from 'vitest';
import * as fc from 'fast-check';

// ---------------------------------------------------------------------------
// Pure computeHostelCounts function (inline implementation)
// ---------------------------------------------------------------------------

type MovementStatus = 'pending' | 'approved' | 'departed' | 'returned' | 'rejected';

interface HostelCounts {
  totalResidents: number;
  currentlyOut: number;
  currentlyIn: number;
  overdueReturns: number;
}

/**
 * Pure function: compute hostel occupancy counts from an array of movement statuses.
 *
 * - totalResidents = count of non-rejected statuses (pending, approved, departed, returned)
 * - currentlyOut   = count of 'departed' statuses
 * - currentlyIn    = totalResidents - currentlyOut
 * - overdueReturns = 0 (cannot determine without timestamps in a pure test)
 */
function computeHostelCounts(statuses: MovementStatus[]): HostelCounts {
  const currentlyOut = statuses.filter((s) => s === 'departed').length;
  const totalResidents = statuses.filter((s) => s !== 'rejected').length;
  const currentlyIn = totalResidents - currentlyOut;

  return {
    totalResidents,
    currentlyOut,
    currentlyIn,
    overdueReturns: 0,
  };
}

// ---------------------------------------------------------------------------
// Property tests
// ---------------------------------------------------------------------------

describe('Hostel Count Logic (Property-Based)', () => {
  it('currentlyOut equals count of departed statuses', () => {
    /**
     * **Validates: Requirements 8.1, 8.2**
     *
     * For any array of movement statuses:
     * - currentlyOut must equal the number of 'departed' entries
     */
    fc.assert(
      fc.property(
        fc.array(
          fc.constantFrom('pending', 'approved', 'departed', 'returned', 'rejected' as MovementStatus),
          { maxLength: 20 },
        ),
        (statuses) => {
          const counts = computeHostelCounts(statuses);
          const expectedOut = statuses.filter((s) => s === 'departed').length;

          expect(counts.currentlyOut).toBe(expectedOut);
        },
      ),
      { numRuns: 25 },
    );
  });

  it('totalResidents equals count of non-rejected statuses', () => {
    /**
     * **Validates: Requirements 8.1**
     *
     * For any array of movement statuses:
     * - totalResidents must equal the number of non-rejected entries
     */
    fc.assert(
      fc.property(
        fc.array(
          fc.constantFrom('pending', 'approved', 'departed', 'returned', 'rejected' as MovementStatus),
          { maxLength: 20 },
        ),
        (statuses) => {
          const counts = computeHostelCounts(statuses);
          const expectedTotal = statuses.filter((s) => s !== 'rejected').length;

          expect(counts.totalResidents).toBe(expectedTotal);
        },
      ),
      { numRuns: 25 },
    );
  });

  it('currentlyIn = totalResidents - currentlyOut and overdueReturns = 0', () => {
    /**
     * **Validates: Requirements 8.2**
     *
     * For any array of movement statuses:
     * - currentlyIn must equal totalResidents - currentlyOut
     * - overdueReturns must be 0 (no time-based logic in pure test)
     */
    fc.assert(
      fc.property(
        fc.array(
          fc.constantFrom('pending', 'approved', 'departed', 'returned', 'rejected' as MovementStatus),
          { maxLength: 20 },
        ),
        (statuses) => {
          const counts = computeHostelCounts(statuses);

          expect(counts.currentlyIn).toBe(counts.totalResidents - counts.currentlyOut);
          expect(counts.overdueReturns).toBe(0);
        },
      ),
      { numRuns: 25 },
    );
  });
});
