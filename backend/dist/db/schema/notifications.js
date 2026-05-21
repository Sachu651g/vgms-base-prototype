"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.notifications = exports.notificationSeverityEnum = void 0;
const pg_core_1 = require("drizzle-orm/pg-core");
const users_1 = require("./users");
const branches_1 = require("./branches");
exports.notificationSeverityEnum = (0, pg_core_1.pgEnum)('notification_severity', [
    'info',
    'warning',
    'critical',
]);
exports.notifications = (0, pg_core_1.pgTable)('notifications', {
    id: (0, pg_core_1.uuid)('id').defaultRandom().primaryKey(),
    branchId: (0, pg_core_1.uuid)('branch_id').references(() => branches_1.branches.id),
    userId: (0, pg_core_1.uuid)('user_id').notNull().references(() => users_1.users.id),
    title: (0, pg_core_1.varchar)('title', { length: 255 }).notNull(),
    message: (0, pg_core_1.text)('message').notNull(),
    severity: (0, exports.notificationSeverityEnum)('severity').default('info').notNull(),
    entityType: (0, pg_core_1.varchar)('entity_type', { length: 100 }),
    entityId: (0, pg_core_1.uuid)('entity_id'),
    isRead: (0, pg_core_1.boolean)('is_read').default(false).notNull(),
    readAt: (0, pg_core_1.timestamp)('read_at'),
    createdAt: (0, pg_core_1.timestamp)('created_at').defaultNow().notNull(),
});
//# sourceMappingURL=notifications.js.map