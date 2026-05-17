import { pgTable, uuid, varchar, timestamp, text, boolean, pgEnum } from 'drizzle-orm/pg-core';
import { users } from './users';
import { branches } from './branches';

export const nightOutStatusEnum = pgEnum('night_out_status', [
  'pending',
  'warden_approved',
  'hod_approved',
  'approved',
  'rejected',
  'departed',
  'returned',
  'overdue',
]);

export const nightOutRequests = pgTable('night_out_requests', {
  id:                     uuid('id').defaultRandom().primaryKey(),
  studentId:              uuid('student_id').notNull().references(() => users.id),
  branchId:               uuid('branch_id').notNull().references(() => branches.id),
  departureDatetime:      timestamp('departure_datetime').notNull(),
  expectedReturnDatetime: timestamp('expected_return_datetime').notNull(),
  destinationAddress:     text('destination_address').notNull(),
  reason:                 text('reason').notNull(),
  parentConsentUrl:       text('parent_consent_url').notNull(),
  status:                 nightOutStatusEnum('status').default('pending').notNull(),
  wardenConsentConfirmed: boolean('warden_consent_confirmed').default(false).notNull(),
  wardenId:               uuid('warden_id').references(() => users.id),
  hodId:                  uuid('hod_id').references(() => users.id),
  principalId:            uuid('principal_id').references(() => users.id),
  rejectionReason:        text('rejection_reason'),
  actualDeparture:        timestamp('actual_departure'),
  actualReturn:           timestamp('actual_return'),
  createdAt:              timestamp('created_at').defaultNow().notNull(),
});

export type NightOutRequest    = typeof nightOutRequests.$inferSelect;
export type NewNightOutRequest = typeof nightOutRequests.$inferInsert;
export type NightOutStatus     = typeof nightOutStatusEnum.enumValues[number];
