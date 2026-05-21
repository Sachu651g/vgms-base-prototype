"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.passApprovals = exports.passApprovalActionEnum = void 0;
const pg_core_1 = require("drizzle-orm/pg-core");
const gate_passes_1 = require("./gate-passes");
const users_1 = require("./users");
exports.passApprovalActionEnum = (0, pg_core_1.pgEnum)('pass_approval_action', [
    'APPROVED',
    'REJECTED',
    'ESCALATED',
    'CANCELLED',
]);
exports.passApprovals = (0, pg_core_1.pgTable)('pass_approvals', {
    id: (0, pg_core_1.uuid)('id').defaultRandom().primaryKey(),
    passId: (0, pg_core_1.uuid)('pass_id').notNull().references(() => gate_passes_1.gatePasses.id),
    actorId: (0, pg_core_1.uuid)('actor_id').notNull().references(() => users_1.users.id),
    action: (0, exports.passApprovalActionEnum)('action').notNull(),
    level: (0, pg_core_1.varchar)('level', { length: 50 }).notNull(),
    notes: (0, pg_core_1.text)('notes'),
    createdAt: (0, pg_core_1.timestamp)('created_at').defaultNow().notNull(),
});
//# sourceMappingURL=pass-approvals.js.map