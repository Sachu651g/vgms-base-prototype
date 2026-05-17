import { pgTable, uuid, varchar, timestamp } from 'drizzle-orm/pg-core';
import { branches } from './branches';

export const departments = pgTable('departments', {
  id:        uuid('id').defaultRandom().primaryKey(),
  branchId:  uuid('branch_id').notNull().references(() => branches.id),
  name:      varchar('name', { length: 255 }).notNull(),
  code:      varchar('code', { length: 50 }).notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

export type Department    = typeof departments.$inferSelect;
export type NewDepartment = typeof departments.$inferInsert;
