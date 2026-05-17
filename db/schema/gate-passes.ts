import { pgTable, uuid, varchar, timestamp, text, boolean, pgEnum } from 'drizzle-orm/pg-core';
import { users } from './users';
import { branches } from './branches';

export const gatePassStatusEnum = pgEnum('gate_pass_status', [
  'pending',
  'approved',
  'rejected',
  'cancelled',
  'exited',
  'returned',
  'expired',
  'used',
]);

export const gatePasses = pgTable('gate_passes', {
  id:                   uuid('id').defaultRandom().primaryKey(),
  branchId:             uuid('branch_id').notNull().references(() => branches.id),
  studentId:            uuid('student_id').notNull().references(() => users.id),
  approvedById:         uuid('approved_by_id').references(() => users.id),
  reason:               text('reason').notNull(),
  destination:          varchar('destination', { length: 500 }).notNull(),
  requestedTimeOut:     timestamp('requested_time_out').notNull(),
  requestedTimeIn:      timestamp('requested_time_in').notNull(),
  actualTimeOut:        timestamp('actual_time_out'),
  actualTimeIn:         timestamp('actual_time_in'),
  status:               gatePassStatusEnum('status').default('pending').notNull(),
  qrPayload:            text('qr_payload'),
  rejectionReason:      text('rejection_reason'),
  escalationDueAt:      timestamp('escalation_due_at').notNull(),
  escalated:            boolean('escalated').default(false).notNull(),
  currentApprovalLevel: varchar('current_approval_level', { length: 50 }).default('hod').notNull(),
  createdAt:            timestamp('created_at').defaultNow().notNull(),
  updatedAt:            timestamp('updated_at').defaultNow().notNull(),
});

export type GatePass       = typeof gatePasses.$inferSelect;
export type NewGatePass    = typeof gatePasses.$inferInsert;
export type GatePassStatus = typeof gatePassStatusEnum.enumValues[number];
