"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.departments = void 0;
const pg_core_1 = require("drizzle-orm/pg-core");
const branches_1 = require("./branches");
exports.departments = (0, pg_core_1.pgTable)('departments', {
    id: (0, pg_core_1.uuid)('id').defaultRandom().primaryKey(),
    branchId: (0, pg_core_1.uuid)('branch_id').notNull().references(() => branches_1.branches.id),
    name: (0, pg_core_1.varchar)('name', { length: 255 }).notNull(),
    code: (0, pg_core_1.varchar)('code', { length: 50 }).notNull(),
    createdAt: (0, pg_core_1.timestamp)('created_at').defaultNow().notNull(),
    updatedAt: (0, pg_core_1.timestamp)('updated_at').defaultNow().notNull(),
});
//# sourceMappingURL=departments.js.map