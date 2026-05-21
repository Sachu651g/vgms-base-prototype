"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.blacklist = void 0;
const pg_core_1 = require("drizzle-orm/pg-core");
const branches_1 = require("./branches");
const users_1 = require("./users");
exports.blacklist = (0, pg_core_1.pgTable)('blacklist', {
    id: (0, pg_core_1.uuid)('id').defaultRandom().primaryKey(),
    branchId: (0, pg_core_1.uuid)('branch_id').references(() => branches_1.branches.id),
    name: (0, pg_core_1.varchar)('name', { length: 255 }).notNull(),
    phone: (0, pg_core_1.varchar)('phone', { length: 20 }).notNull(),
    reason: (0, pg_core_1.text)('reason').notNull(),
    addedById: (0, pg_core_1.uuid)('added_by_id').references(() => users_1.users.id),
    createdAt: (0, pg_core_1.timestamp)('created_at').defaultNow().notNull(),
    updatedAt: (0, pg_core_1.timestamp)('updated_at').defaultNow().notNull(),
});
//# sourceMappingURL=blacklist.js.map