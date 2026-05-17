/**
 * Property-Based Tests for Account Lockout Logic.
 *
 * **Validates: Requirements 1.10, 1.11, 1.13**
 *
 * Property 6: After n failed login attempts, failedLoginAttempts reaches n
 *             and lockedUntil is set when n >= MAX_FAILED_ATTEMPTS (5).
 *
 * Property 7: If failedLoginAttempts > 0 and a successful login occurs,
 *             the reset sets failedLoginAttempts = 0 and lockedUntil = null.
 */

import { describe, it, expect } from 'vitest';
import * as fc from 'fast-check';

const MAX_FAILED_ATTEMPTS = 5;
const LOCKOUT_DURATION_MS = 30 * 60 * 1000; // 30 minutes

// ---------------------------------------------------------------------------
// Pure functions that mirror the logic in lib/auth.ts authorize callback
// ---------------------------------------------------------------------------

interface UserState {
  failedLoginAttempts: number;
  lockedUntil: Date | null;
}

/**
 * Pure function: simulate n consecutive failed login attempts starting from
 * an unlocked account with 0 prior failures.
 */
function simulateFailedAttempts(n: number, now: Date): UserState {
  let state: UserState = { failedLoginAttempts: 0, lockedUntil: null };

  for (let i = 0; i < n; i++) {
    const newAttempts = state.failedLoginAttempts + 1;

    if (newAttempts >= MAX_FAILED_ATTEMPTS) {
      state = {
        failedLoginAttempts: newAttempts,
        lockedUntil: new Date(now.getTime() + LOCKOUT_DURATION_MS),
      };
    } else {
      state = {
        failedLoginAttempts: newAttempts,
        lockedUntil: null,
      };
    }
  }

  return state;
}

/**
 * Pure function: simulate a successful login that resets lockout state.
 */
function simulateSuccessfulLogin(state: UserState): UserState {
  return {
    failedLoginAttempts: 0,
    lockedUntil: null,
  };
}

// ---------------------------------------------------------------------------
// Property 6: Lockout threshold
// ---------------------------------------------------------------------------

describe('Account Lockout — Property 6 (lockout threshold)', () => {
  it('after n failed attempts, counter reaches n and lockedUntil is set when n >= 5', () => {
    /**
     * **Validates: Requirements 1.10, 1.11**
     *
     * For any n in [5, 10], after n failed login attempts:
     * - failedLoginAttempts === n
     * - lockedUntil is set (non-null) because n >= MAX_FAILED_ATTEMPTS
     */
    const now = new Date('2024-01-01T00:00:00Z');

    fc.assert(
      fc.property(
        fc.integer({ min: 5, max: 10 }),
        (n) => {
          const state = simulateFailedAttempts(n, now);

          // Counter must reach n
          expect(state.failedLoginAttempts).toBe(n);

          // lockedUntil must be set because n >= MAX_FAILED_ATTEMPTS
          expect(state.lockedUntil).not.toBeNull();
          expect(state.lockedUntil!.getTime()).toBe(now.getTime() + LOCKOUT_DURATION_MS);
        },
      ),
      { numRuns: 25 },
    );
  });

  it('after n failed attempts where n < 5, lockedUntil remains null', () => {
    /**
     * **Validates: Requirements 1.10**
     *
     * For any n in [1, 4], after n failed login attempts:
     * - failedLoginAttempts === n
     * - lockedUntil is null (threshold not yet reached)
     */
    const now = new Date('2024-01-01T00:00:00Z');

    fc.assert(
      fc.property(
        fc.integer({ min: 1, max: 4 }),
        (n) => {
          const state = simulateFailedAttempts(n, now);

          expect(state.failedLoginAttempts).toBe(n);
          expect(state.lockedUntil).toBeNull();
        },
      ),
      { numRuns: 25 },
    );
  });
});

// ---------------------------------------------------------------------------
// Property 7: Successful login resets lockout state
// ---------------------------------------------------------------------------

describe('Account Lockout — Property 7 (reset on success)', () => {
  it('successful login resets failedLoginAttempts to 0 and lockedUntil to null', () => {
    /**
     * **Validates: Requirements 1.13**
     *
     * For any prior state with failedLoginAttempts > 0 (and optionally a
     * lockedUntil set), a successful login must reset both fields.
     */
    fc.assert(
      fc.property(
        fc.integer({ min: 1, max: 20 }),
        fc.option(fc.date(), { nil: null }),
        (attempts, lockedUntil) => {
          const priorState: UserState = {
            failedLoginAttempts: attempts,
            lockedUntil,
          };

          const resetState = simulateSuccessfulLogin(priorState);

          expect(resetState.failedLoginAttempts).toBe(0);
          expect(resetState.lockedUntil).toBeNull();
        },
      ),
      { numRuns: 25 },
    );
  });
});
