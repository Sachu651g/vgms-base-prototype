"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.visitors = void 0;
const pg_core_1 = require("drizzle-orm/pg-core");
const branches_1 = require("./branches");
exports.visitors = (0, pg_core_1.pgTable)('visitors', {
    id: (0, pg_core_1.uuid)('id').defaultRandom().primaryKey(),
    branchId: (0, pg_core_1.uuid)('branch_id').notNull().references(() => branches_1.branches.id),
    name: (0, pg_core_1.varchar)('name', { length: 255 }).notNull(),
    phone: (0, pg_core_1.varchar)('phone', { length: 20 }).notNull(),
    email: (0, pg_core_1.varchar)('email', { length: 255 }),
    idType: (0, pg_core_1.varchar)('id_type', { length: 50 }),
    idNumber: (0, pg_core_1.varchar)('id_number', { length: 100 }),
    photoUrl: (0, pg_core_1.varchar)('photo_url', { length: 500 }),
    createdAt: (0, pg_core_1.timestamp)('created_at').defaultNow().notNull(),
    updatedAt: (0, pg_core_1.timestamp)('updated_at').defaultNow().notNull(),
});
//# sourceMappingURL=visitors.js.map