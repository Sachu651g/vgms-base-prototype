import { pgTable, uuid, varchar, timestamp, text } from 'drizzle-orm/pg-core';
import { branches } from './branches';
import { users } from './users';

export const blacklist = pgTable('blacklist', {
  id:        uuid('id').defaultRandom().primaryKey(),
  branchId:  uuid('branch_id').references(() => branches.id), // null = global blacklist
  name:      varchar('name', { length: 255 }).notNull(),
  phone:     varchar('phone', { length: 20 }).notNull(),
  reason:    text('reason').notNull(),
  addedById: uuid('added_by_id').references(() => users.id),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

export type Blacklist    = typeof blacklist.$inferSelect;
export type NewBlacklist = typeof blacklist.$inferInsert;
