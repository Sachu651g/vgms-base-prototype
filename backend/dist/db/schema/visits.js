"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.visits = exports.visitStatusEnum = void 0;
const pg_core_1 = require("drizzle-orm/pg-core");
const visitors_1 = require("./visitors");
const users_1 = require("./users");
const branches_1 = require("./branches");
exports.visitStatusEnum = (0, pg_core_1.pgEnum)('visit_status', [
    'pending',
    'approved',
    'rejected',
    'checked_in',
    'checked_out',
    'expired',
    'no_show',
]);
exports.visits = (0, pg_core_1.pgTable)('visits', {
    id: (0, pg_core_1.uuid)('id').defaultRandom().primaryKey(),
    branchId: (0, pg_core_1.uuid)('branch_id').notNull().references(() => branches_1.branches.id),
    visitorId: (0, pg_core_1.uuid)('visitor_id').notNull().references(() => visitors_1.visitors.id),
    hostUserId: (0, pg_core_1.uuid)('host_user_id').notNull().references(() => users_1.users.id),
    registeredById: (0, pg_core_1.uuid)('registered_by_id').notNull().references(() => users_1.users.id),
    purpose: (0, pg_core_1.text)('purpose').notNull(),
    expectedArrival: (0, pg_core_1.timestamp)('expected_arrival').notNull(),
    expectedDurationMinutes: (0, pg_core_1.integer)('expected_duration_minutes').notNull(),
    status: (0, exports.visitStatusEnum)('status').default('pending').notNull(),
    qrPayload: (0, pg_core_1.text)('qr_payload'),
    actualCheckin: (0, pg_core_1.timestamp)('actual_checkin'),
    actualCheckout: (0, pg_core_1.timestamp)('actual_checkout'),
    rejectionReason: (0, pg_core_1.text)('rejection_reason'),
    createdAt: (0, pg_core_1.timestamp)('created_at').defaultNow().notNull(),
    updatedAt: (0, pg_core_1.timestamp)('updated_at').defaultNow().notNull(),
});
//# sourceMappingURL=visits.js.map