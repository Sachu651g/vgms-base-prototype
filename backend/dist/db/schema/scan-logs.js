"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.scanLogs = exports.scanPassTypeEnum = exports.scanOutcomeEnum = void 0;
const pg_core_1 = require("drizzle-orm/pg-core");
const users_1 = require("./users");
const branches_1 = require("./branches");
exports.scanOutcomeEnum = (0, pg_core_1.pgEnum)('scan_outcome', ['success', 'failure']);
exports.scanPassTypeEnum = (0, pg_core_1.pgEnum)('scan_pass_type', ['gate_pass', 'visitor', 'hostel']);
exports.scanLogs = (0, pg_core_1.pgTable)('scan_logs', {
    id: (0, pg_core_1.uuid)('id').defaultRandom().primaryKey(),
    branchId: (0, pg_core_1.uuid)('branch_id').notNull().references(() => branches_1.branches.id),
    scannedById: (0, pg_core_1.uuid)('scanned_by_id').notNull().references(() => users_1.users.id),
    passId: (0, pg_core_1.uuid)('pass_id'),
    passType: (0, exports.scanPassTypeEnum)('pass_type'),
    gateLocation: (0, pg_core_1.varchar)('gate_location', { length: 100 }),
    outcome: (0, exports.scanOutcomeEnum)('outcome').notNull(),
    failureReason: (0, pg_core_1.text)('failure_reason'),
    rawPayload: (0, pg_core_1.text)('raw_payload'),
    scannedAt: (0, pg_core_1.timestamp)('scanned_at').defaultNow().notNull(),
});
//# sourceMappingURL=scan-logs.js.map