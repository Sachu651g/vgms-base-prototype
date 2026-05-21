"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.nightOutRequests = exports.nightOutStatusEnum = void 0;
const pg_core_1 = require("drizzle-orm/pg-core");
const users_1 = require("./users");
const branches_1 = require("./branches");
exports.nightOutStatusEnum = (0, pg_core_1.pgEnum)('night_out_status', [
    'pending',
    'warden_approved',
    'hod_approved',
    'approved',
    'rejected',
    'departed',
    'returned',
    'overdue',
]);
exports.nightOutRequests = (0, pg_core_1.pgTable)('night_out_requests', {
    id: (0, pg_core_1.uuid)('id').defaultRandom().primaryKey(),
    studentId: (0, pg_core_1.uuid)('student_id').notNull().references(() => users_1.users.id),
    branchId: (0, pg_core_1.uuid)('branch_id').notNull().references(() => branches_1.branches.id),
    departureDatetime: (0, pg_core_1.timestamp)('departure_datetime').notNull(),
    expectedReturnDatetime: (0, pg_core_1.timestamp)('expected_return_datetime').notNull(),
    destinationAddress: (0, pg_core_1.text)('destination_address').notNull(),
    reason: (0, pg_core_1.text)('reason').notNull(),
    parentConsentUrl: (0, pg_core_1.text)('parent_consent_url').notNull(),
    status: (0, exports.nightOutStatusEnum)('status').default('pending').notNull(),
    wardenConsentConfirmed: (0, pg_core_1.boolean)('warden_consent_confirmed').default(false).notNull(),
    wardenId: (0, pg_core_1.uuid)('warden_id').references(() => users_1.users.id),
    hodId: (0, pg_core_1.uuid)('hod_id').references(() => users_1.users.id),
    principalId: (0, pg_core_1.uuid)('principal_id').references(() => users_1.users.id),
    rejectionReason: (0, pg_core_1.text)('rejection_reason'),
    actualDeparture: (0, pg_core_1.timestamp)('actual_departure'),
    actualReturn: (0, pg_core_1.timestamp)('actual_return'),
    createdAt: (0, pg_core_1.timestamp)('created_at').defaultNow().notNull(),
});
//# sourceMappingURL=night-out-requests.js.map