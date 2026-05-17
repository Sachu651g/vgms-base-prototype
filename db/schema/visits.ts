import { pgTable, uuid, varchar, timestamp, text, integer, pgEnum } from 'drizzle-orm/pg-core';
import { visitors } from './visitors';
import { users } from './users';
import { branches } from './branches';

export const visitStatusEnum = pgEnum('visit_status', [
  'pending',
  'approved',
  'rejected',
  'checked_in',
  'checked_out',
  'expired',
  'no_show',
]);

export const visits = pgTable('visits', {
  id:                      uuid('id').defaultRandom().primaryKey(),
  branchId:                uuid('branch_id').notNull().references(() => branches.id),
  visitorId:               uuid('visitor_id').notNull().references(() => visitors.id),
  hostUserId:              uuid('host_user_id').notNull().references(() => users.id),
  registeredById:          uuid('registered_by_id').notNull().references(() => users.id),
  purpose:                 text('purpose').notNull(),
  expectedArrival:         timestamp('expected_arrival').notNull(),
  expectedDurationMinutes: integer('expected_duration_minutes').notNull(),
  status:                  visitStatusEnum('status').default('pending').notNull(),
  qrPayload:               text('qr_payload'),
  actualCheckin:           timestamp('actual_checkin'),
  actualCheckout:          timestamp('actual_checkout'),
  rejectionReason:         text('rejection_reason'),
  createdAt:               timestamp('created_at').defaultNow().notNull(),
  updatedAt:               timestamp('updated_at').defaultNow().notNull(),
});

export type Visit    = typeof visits.$inferSelect;
export type NewVisit = typeof visits.$inferInsert;
export type VisitStatus = typeof visitStatusEnum.enumValues[number];
