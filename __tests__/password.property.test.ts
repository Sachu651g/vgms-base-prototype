/**
 * Property-Based Tests for bcrypt Password Hashing.
 *
 * **Validates: Requirements 1.5**
 *
 * Property: for any string, bcrypt.hashSync produces a valid bcrypt hash
 * (starts with $2) and bcrypt.compareSync returns true for the original string.
 */

import { describe, it, expect } from 'vitest';
import * as fc from 'fast-check';
import bcrypt from 'bcryptjs';

describe('bcrypt Password Hashing (Property-Based)', () => {
  it('hashSync produces a valid bcrypt hash and compareSync returns true for the original string', () => {
    /**
     * **Validates: Requirements 1.5**
     *
     * For any string s with length in [8, 20]:
     * - bcrypt.hashSync(s, 10) produces a string starting with '$2' (valid bcrypt)
     * - bcrypt.compareSync(s, hash) returns true
     */
    fc.assert(
      fc.property(
        fc.string({ minLength: 8, maxLength: 20 }),
        (s) => {
          const hash = bcrypt.hashSync(s, 10);

          // Valid bcrypt hash starts with $2 (e.g. $2a$, $2b$, $2y$)
          expect(hash).toMatch(/^\$2/);

          // The original string must verify against the hash
          expect(bcrypt.compareSync(s, hash)).toBe(true);
        },
      ),
      { numRuns: 10 },
    );
  });
});
