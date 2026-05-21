"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.users = exports.userRoleEnum = void 0;
const pg_core_1 = require("drizzle-orm/pg-core");
const branches_1 = require("./branches");
const departments_1 = require("./departments");
exports.userRoleEnum = (0, pg_core_1.pgEnum)('user_role', [
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
exports.users = (0, pg_core_1.pgTable)('users', {
    id: (0, pg_core_1.uuid)('id').defaultRandom().primaryKey(),
    branchId: (0, pg_core_1.uuid)('branch_id').references(() => branches_1.branches.id),
    departmentId: (0, pg_core_1.uuid)('department_id').references(() => departments_1.departments.id),
    name: (0, pg_core_1.varchar)('name', { length: 255 }).notNull(),
    email: (0, pg_core_1.varchar)('email', { length: 255 }).notNull().unique(),
    passwordHash: (0, pg_core_1.varchar)('password_hash', { length: 255 }).notNull(),
    role: (0, exports.userRoleEnum)('role').notNull(),
    phone: (0, pg_core_1.varchar)('phone', { length: 20 }),
    isActive: (0, pg_core_1.boolean)('is_active').default(true).notNull(),
    failedLoginAttempts: (0, pg_core_1.integer)('failed_login_attempts').default(0).notNull(),
    lockedUntil: (0, pg_core_1.timestamp)('locked_until'),
    createdAt: (0, pg_core_1.timestamp)('created_at').defaultNow().notNull(),
    updatedAt: (0, pg_core_1.timestamp)('updated_at').defaultNow().notNull(),
});
//# sourceMappingURL=users.js.map