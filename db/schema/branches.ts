import { pgTable, uuid, varchar, timestamp } from 'drizzle-orm/pg-core';

export const branches = pgTable('branches', {
  id:        uuid('id').defaultRandom().primaryKey(),
  name:      varchar('name', { length: 255 }).notNull(),
  code:      varchar('code', { length: 50 }).notNull().unique(),
  address:   varchar('address', { length: 500 }),
  timezone:  varchar('timezone', { length: 100 }).default('Asia/Kolkata').notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

export type Branch    = typeof branches.$inferSelect;
export type NewBranch = typeof branches.$inferInsert;
