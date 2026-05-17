import { pgTable, uuid, varchar, timestamp, text, pgEnum } from 'drizzle-orm/pg-core';
import { users } from './users';
import { branches } from './branches';

export const auditActionEnum = pgEnum('audit_action', [
  'CREATE',
  'UPDATE',
  'DELETE',
  'AUTO_EXPIRED',
  'AUTO_NO_SHOW',
  'ESCALATED',
  'ACCOUNT_LOCKED',
  'BLOCKED_REGISTRATION',
  'BLOCKED_DUPLICATE_PASS',
  'UNAUTHORIZED_ACCESS',
]);

export const auditLogs = pgTable('audit_logs', {
  id:            uuid('id').defaultRandom().primaryKey(),
  branchId:      uuid('branch_id').references(() => branches.id),
  actorId:       uuid('actor_id').references(() => users.id),
  actorIp:       varchar('actor_ip', { length: 45 }),
  action:        auditActionEnum('action').notNull(),
  entityType:    varchar('entity_type', { length: 100 }).notNull(),
  entityId:      uuid('entity_id'),
  previousState: text('previous_state'),  // JSON string
  newState:      text('new_state'),        // JSON string
  metadata:      text('metadata'),         // JSON string for extra context
  createdAt:     timestamp('created_at').defaultNow().notNull(),
});

export type AuditLog    = typeof auditLogs.$inferSelect;
export type NewAuditLog = typeof auditLogs.$inferInsert;
export type AuditAction = typeof auditActionEnum.enumValues[number];
