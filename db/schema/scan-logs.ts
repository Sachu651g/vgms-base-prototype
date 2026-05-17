import { pgTable, uuid, varchar, timestamp, text, pgEnum } from 'drizzle-orm/pg-core';
import { users } from './users';
import { branches } from './branches';

export const scanOutcomeEnum = pgEnum('scan_outcome', ['success', 'failure']);
export const scanPassTypeEnum = pgEnum('scan_pass_type', ['gate_pass', 'visitor', 'hostel']);

export const scanLogs = pgTable('scan_logs', {
  id:            uuid('id').defaultRandom().primaryKey(),
  branchId:      uuid('branch_id').notNull().references(() => branches.id),
  scannedById:   uuid('scanned_by_id').notNull().references(() => users.id),
  passId:        uuid('pass_id'),              // nullable — may be unresolvable on failure
  passType:      scanPassTypeEnum('pass_type'),
  gateLocation:  varchar('gate_location', { length: 100 }),
  outcome:       scanOutcomeEnum('outcome').notNull(),
  failureReason: text('failure_reason'),
  rawPayload:    text('raw_payload'),          // stored for forensics on failure
  scannedAt:     timestamp('scanned_at').defaultNow().notNull(),
});

export type ScanLog    = typeof scanLogs.$inferSelect;
export type NewScanLog = typeof scanLogs.$inferInsert;
export type ScanOutcome  = typeof scanOutcomeEnum.enumValues[number];
export type ScanPassType = typeof scanPassTypeEnum.enumValues[number];
