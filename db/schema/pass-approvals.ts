import { pgTable, uuid, varchar, text, timestamp, pgEnum } from 'drizzle-orm/pg-core';
import { gatePasses } from './gate-passes';
import { users } from './users';

export const passApprovalActionEnum = pgEnum('pass_approval_action', [
  'APPROVED',
  'REJECTED',
  'ESCALATED',
  'CANCELLED',
]);

export const passApprovals = pgTable('pass_approvals', {
  id:        uuid('id').defaultRandom().primaryKey(),
  passId:    uuid('pass_id').notNull().references(() => gatePasses.id),
  actorId:   uuid('actor_id').notNull().references(() => users.id),
  action:    passApprovalActionEnum('action').notNull(),
  level:     varchar('level', { length: 50 }).notNull(), // 'hod' | 'principal'
  notes:     text('notes'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

export type PassApproval    = typeof passApprovals.$inferSelect;
export type NewPassApproval = typeof passApprovals.$inferInsert;
export type PassApprovalAction = typeof passApprovalActionEnum.enumValues[number];
