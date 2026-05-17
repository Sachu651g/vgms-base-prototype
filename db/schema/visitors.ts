import { pgTable, uuid, varchar, timestamp } from 'drizzle-orm/pg-core';
import { branches } from './branches';

export const visitors = pgTable('visitors', {
  id:        uuid('id').defaultRandom().primaryKey(),
  branchId:  uuid('branch_id').notNull().references(() => branches.id),
  name:      varchar('name', { length: 255 }).notNull(),
  phone:     varchar('phone', { length: 20 }).notNull(),
  email:     varchar('email', { length: 255 }),
  idType:    varchar('id_type', { length: 50 }),
  idNumber:  varchar('id_number', { length: 100 }),
  photoUrl:  varchar('photo_url', { length: 500 }),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

export type Visitor    = typeof visitors.$inferSelect;
export type NewVisitor = typeof visitors.$inferInsert;
