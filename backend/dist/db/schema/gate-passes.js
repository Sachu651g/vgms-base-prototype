"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.gatePasses = exports.gatePassStatusEnum = void 0;
const pg_core_1 = require("drizzle-orm/pg-core");
const users_1 = require("./users");
const branches_1 = require("./branches");
exports.gatePassStatusEnum = (0, pg_core_1.pgEnum)('gate_pass_status', [
    'pending',
    'approved',
    'rejected',
    'cancelled',
    'exited',
    'returned',
    'expired',
    'used',
]);
exports.gatePasses = (0, pg_core_1.pgTable)('gate_passes', {
    id: (0, pg_core_1.uuid)('id').defaultRandom().primaryKey(),
    branchId: (0, pg_core_1.uuid)('branch_id').notNull().references(() => branches_1.branches.id),
    studentId: (0, pg_core_1.uuid)('student_id').notNull().references(() => users_1.users.id),
    approvedById: (0, pg_core_1.uuid)('approved_by_id').references(() => users_1.users.id),
    reason: (0, pg_core_1.text)('reason').notNull(),
    destination: (0, pg_core_1.varchar)('destination', { length: 500 }).notNull(),
    requestedTimeOut: (0, pg_core_1.timestamp)('requested_time_out').notNull(),
    requestedTimeIn: (0, pg_core_1.timestamp)('requested_time_in').notNull(),
    actualTimeOut: (0, pg_core_1.timestamp)('actual_time_out'),
    actualTimeIn: (0, pg_core_1.timestamp)('actual_time_in'),
    status: (0, exports.gatePassStatusEnum)('status').default('pending').notNull(),
    qrPayload: (0, pg_core_1.text)('qr_payload'),
    rejectionReason: (0, pg_core_1.text)('rejection_reason'),
    escalationDueAt: (0, pg_core_1.timestamp)('escalation_due_at').notNull(),
    escalated: (0, pg_core_1.boolean)('escalated').default(false).notNull(),
    currentApprovalLevel: (0, pg_core_1.varchar)('current_approval_level', { length: 50 }).default('hod').notNull(),
    createdAt: (0, pg_core_1.timestamp)('created_at').defaultNow().notNull(),
    updatedAt: (0, pg_core_1.timestamp)('updated_at').defaultNow().notNull(),
});
//# sourceMappingURL=gate-passes.js.map