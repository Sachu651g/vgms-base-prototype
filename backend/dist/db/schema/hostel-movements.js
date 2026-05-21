"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.hostelMovements = exports.hostelMovementStatusEnum = void 0;
const pg_core_1 = require("drizzle-orm/pg-core");
const users_1 = require("./users");
const branches_1 = require("./branches");
exports.hostelMovementStatusEnum = (0, pg_core_1.pgEnum)('hostel_movement_status', [
    'pending',
    'approved',
    'rejected',
    'departed',
    'returned',
]);
exports.hostelMovements = (0, pg_core_1.pgTable)('hostel_movements', {
    id: (0, pg_core_1.uuid)('id').defaultRandom().primaryKey(),
    branchId: (0, pg_core_1.uuid)('branch_id').notNull().references(() => branches_1.branches.id),
    studentId: (0, pg_core_1.uuid)('student_id').notNull().references(() => users_1.users.id),
    wardenId: (0, pg_core_1.uuid)('warden_id').references(() => users_1.users.id),
    destination: (0, pg_core_1.varchar)('destination', { length: 500 }).notNull(),
    reason: (0, pg_core_1.text)('reason').notNull(),
    expectedDeparture: (0, pg_core_1.timestamp)('expected_departure').notNull(),
    expectedReturn: (0, pg_core_1.timestamp)('expected_return').notNull(),
    actualDeparture: (0, pg_core_1.timestamp)('actual_departure'),
    actualReturn: (0, pg_core_1.timestamp)('actual_return'),
    status: (0, exports.hostelMovementStatusEnum)('status').default('pending').notNull(),
    rejectionReason: (0, pg_core_1.text)('rejection_reason'),
    createdAt: (0, pg_core_1.timestamp)('created_at').defaultNow().notNull(),
    updatedAt: (0, pg_core_1.timestamp)('updated_at').defaultNow().notNull(),
});
//# sourceMappingURL=hostel-movements.js.map