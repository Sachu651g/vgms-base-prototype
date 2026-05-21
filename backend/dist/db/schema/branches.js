"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.branches = void 0;
const pg_core_1 = require("drizzle-orm/pg-core");
exports.branches = (0, pg_core_1.pgTable)('branches', {
    id: (0, pg_core_1.uuid)('id').defaultRandom().primaryKey(),
    name: (0, pg_core_1.varchar)('name', { length: 255 }).notNull(),
    code: (0, pg_core_1.varchar)('code', { length: 50 }).notNull().unique(),
    address: (0, pg_core_1.varchar)('address', { length: 500 }),
    timezone: (0, pg_core_1.varchar)('timezone', { length: 100 }).default('Asia/Kolkata').notNull(),
    createdAt: (0, pg_core_1.timestamp)('created_at').defaultNow().notNull(),
    updatedAt: (0, pg_core_1.timestamp)('updated_at').defaultNow().notNull(),
});
//# sourceMappingURL=branches.js.map