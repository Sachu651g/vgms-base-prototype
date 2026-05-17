import { pgTable, uuid, varchar, timestamp, text, boolean, pgEnum } from 'drizzle-orm/pg-core';
import { users } from './users';
import { branches } from './branches';

export const notificationSeverityEnum = pgEnum('notification_severity', [
  'info',
  'warning',
  'critical',
]);

export const notifications = pgTable('notifications', {
  id:         uuid('id').defaultRandom().primaryKey(),
  branchId:   uuid('branch_id').references(() => branches.id),
  userId:     uuid('user_id').notNull().references(() => users.id),
  title:      varchar('title', { length: 255 }).notNull(),
  message:    text('message').notNull(),
  severity:   notificationSeverityEnum('severity').default('info').notNull(),
  entityType: varchar('entity_type', { length: 100 }),
  entityId:   uuid('entity_id'),
  isRead:     boolean('is_read').default(false).notNull(),
  readAt:     timestamp('read_at'),
  createdAt:  timestamp('created_at').defaultNow().notNull(),
});

export type Notification    = typeof notifications.$inferSelect;
export type NewNotification = typeof notifications.$inferInsert;
export type NotificationSeverity = typeof notificationSeverityEnum.enumValues[number];
