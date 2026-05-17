import { pgTable, uuid, varchar, timestamp, text, pgEnum } from 'drizzle-orm/pg-core';
import { users } from './users';
import { branches } from './branches';

export const hostelMovementStatusEnum = pgEnum('hostel_movement_status', [
  'pending',
  'approved',
  'rejected',
  'departed',
  'returned',
]);

export const hostelMovements = pgTable('hostel_movements', {
  id:                uuid('id').defaultRandom().primaryKey(),
  branchId:          uuid('branch_id').notNull().references(() => branches.id),
  studentId:         uuid('student_id').notNull().references(() => users.id),
  wardenId:          uuid('warden_id').references(() => users.id),
  destination:       varchar('destination', { length: 500 }).notNull(),
  reason:            text('reason').notNull(),
  expectedDeparture: timestamp('expected_departure').notNull(),
  expectedReturn:    timestamp('expected_return').notNull(),
  actualDeparture:   timestamp('actual_departure'),
  actualReturn:      timestamp('actual_return'),
  status:            hostelMovementStatusEnum('status').default('pending').notNull(),
  rejectionReason:   text('rejection_reason'),
  createdAt:         timestamp('created_at').defaultNow().notNull(),
  updatedAt:         timestamp('updated_at').defaultNow().notNull(),
});

export type HostelMovement       = typeof hostelMovements.$inferSelect;
export type NewHostelMovement    = typeof hostelMovements.$inferInsert;
export type HostelMovementStatus = typeof hostelMovementStatusEnum.enumValues[number];
