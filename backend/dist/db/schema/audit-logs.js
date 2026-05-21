"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.auditLogs = exports.auditActionEnum = void 0;
const pg_core_1 = require("drizzle-orm/pg-core");
const users_1 = require("./users");
const branches_1 = require("./branches");
exports.auditActionEnum = (0, pg_core_1.pgEnum)('audit_action', [
    'CREATE',
    'UPDATE',
    'DELETE',
    'AUTO_EXPIRED',
    'AUTO_NO_SHOW',
    'ESCALATED',
    'ACCOUNT_LOCKED',
    'BLOCKED_REGISTRATION',
    'BLOCKED_DUPLICATE_PASS',
    'UNAUTHORIZED_ACCESS',
]);
exports.auditLogs = (0, pg_core_1.pgTable)('audit_logs', {
    id: (0, pg_core_1.uuid)('id').defaultRandom().primaryKey(),
    branchId: (0, pg_core_1.uuid)('branch_id').references(() => branches_1.branches.id),
    actorId: (0, pg_core_1.uuid)('actor_id').references(() => users_1.users.id),
    actorIp: (0, pg_core_1.varchar)('actor_ip', { length: 45 }),
    action: (0, exports.auditActionEnum)('action').notNull(),
    entityType: (0, pg_core_1.varchar)('entity_type', { length: 100 }).notNull(),
    entityId: (0, pg_core_1.uuid)('entity_id'),
    previousState: (0, pg_core_1.text)('previous_state'),
    newState: (0, pg_core_1.text)('new_state'),
    metadata: (0, pg_core_1.text)('metadata'),
    createdAt: (0, pg_core_1.timestamp)('created_at').defaultNow().notNull(),
});
//# sourceMappingURL=audit-logs.js.map