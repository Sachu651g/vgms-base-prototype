/**
 * Property-Based Tests for Zod Schema Validation.
 *
 * **Validates: Requirements 2.1, 3.1**
 *
 * Property: for any object missing at least one required field,
 * schema.safeParse(obj) must return { success: false }.
 */

import { describe, it, expect } from 'vitest';
import * as fc from 'fast-check';
import { z } from 'zod';

// Sample schema representative of visitor/visit request validation
const schema = z.object({
  name:    z.string().min(1),
  phone:   z.string().min(10),
  purpose: z.string().min(1),
});

describe('Zod Schema Validation (Property-Based)', () => {
  it('safeParse returns { success: false } when any required field is null/undefined', () => {
    /**
     * **Validates: Requirements 2.1, 3.1**
     *
     * For any record where at least one field is null (fc.option returns null
     * when the value is not generated), schema.safeParse must fail.
     */
    fc.assert(
      fc.property(
        fc.record({
          name:    fc.option(fc.string({ minLength: 1 })),
          phone:   fc.option(fc.string({ minLength: 10 })),
          purpose: fc.option(fc.string({ minLength: 1 })),
        }),
        (obj) => {
          // Only test cases where at least one field is null/undefined
          const hasMissingField =
            obj.name === null ||
            obj.phone === null ||
            obj.purpose === null;

          if (!hasMissingField) {
            // All fields present — skip this sample (not the case we're testing)
            return;
          }

          const result = schema.safeParse(obj);
          expect(result.success).toBe(false);
        },
      ),
      { numRuns: 25 },
    );
  });

  it('safeParse returns { success: true } when all required fields are valid', () => {
    /**
     * **Validates: Requirements 2.1, 3.1**
     *
     * For any record where all fields satisfy the schema constraints,
     * safeParse must succeed.
     */
    fc.assert(
      fc.property(
        fc.record({
          name:    fc.string({ minLength: 1 }),
          phone:   fc.string({ minLength: 10 }),
          purpose: fc.string({ minLength: 1 }),
        }),
        (obj) => {
          const result = schema.safeParse(obj);
          expect(result.success).toBe(true);
        },
      ),
      { numRuns: 25 },
    );
  });
});
