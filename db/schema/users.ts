import { pgTable, uuid, varchar, timestamp, integer, boolean, pgEnum } from 'drizzle-orm/pg-core';
import { branches } from './branches';
import { departments } from './departments';

export const userRoleEnum = pgEnum('user_role', [
  'super_admin',
  'branch_admin',
  'principal',
  'hod',
  'faculty',
  'warden',
  'security_head',
  'watchman',
  'receptionist',
  'student',
]);

export const users = pgTable('users', {
  id:                  uuid('id').defaultRandom().primaryKey(),
  branchId:            uuid('branch_id').references(() => branches.id),
  departmentId:        uuid('department_id').references(() => departments.id),
  name:                varchar('name', { length: 255 }).notNull(),
  email:               varchar('email', { length: 255 }).notNull().unique(),
  passwordHash:        varchar('password_hash', { length: 255 }).notNull(),
  role:                userRoleEnum('role').notNull(),
  phone:               varchar('phone', { length: 20 }),
  isActive:            boolean('is_active').default(true).notNull(),
  failedLoginAttempts: integer('failed_login_attempts').default(0).notNull(),
  lockedUntil:         timestamp('locked_until'),
  createdAt:           timestamp('created_at').defaultNow().notNull(),
  updatedAt:           timestamp('updated_at').defaultNow().notNull(),
});

export type User     = typeof users.$inferSelect;
export type NewUser  = typeof users.$inferInsert;
export type UserRole = typeof userRoleEnum.enumValues[number];
