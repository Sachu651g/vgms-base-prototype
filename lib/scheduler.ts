/**
 * lib/scheduler.ts
 *
 * Scheduled job functions invoked by cron API routes.
 *
 * Tasks 16.1–16.5
 * Requirements: 3.13, 3.14, 4.15, 4.16, 5.18
 */

import { and, eq, lt, lte } from 'drizzle-orm';

import { db } from '@/db';
import {
  visits,
  gatePasses,
  passApprovals,
  nightOutRequests,
  users,
} from '@/db/schema';
import { writeAuditLog } from '@/lib/utils';
import { sendNotification } from '@/lib/notifications';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Returns the current UTC time minus the given number of minutes. */
function minutesAgo(minutes: number): Date {
  return new Date(Date.now() - minutes * 60 * 1000);
}

// ---------------------------------------------------------------------------
// 16.1 — autoExpireVisits
// ---------------------------------------------------------------------------

/**
 * Finds all visits where status='approved' AND expectedArrival < now - 30 min,
 * bulk-updates them to 'expired', and writes an AUTO_EXPIRED audit log per record.
 *
 * Idempotent: only visits still in 'approved' state are touched.
 *
 * Requirement 3.13
 */
export async function autoExpireVisits(): Promise<void> {
  const cutoff = minutesAgo(30);

  const stale = await db
    .select()
    .from(visits)
    .where(
      and(
        eq(visits.status, 'approved'),
        lt(visits.expectedArrival, cutoff),
      ),
    );

  if (stale.length === 0) return;

  await db
    .update(visits)
    .set({ status: 'expired', updatedAt: new Date() })
    .where(
      and(
        eq(visits.status, 'approved'),
        lt(visits.expectedArrival, cutoff),
      ),
    );

  await Promise.all(
    stale.map((visit) =>
      writeAuditLog({
        actorId:    null,
        branchId:   visit.branchId,
        action:     'AUTO_EXPIRED',
        entityType: 'visits',
        entityId:   visit.id,
        previousState: { status: visit.status },
        newState:      { status: 'expired' },
        metadata:   { reason: 'Visitor did not arrive within 30 minutes of expected arrival' },
      }),
    ),
  );
}

// ---------------------------------------------------------------------------
// 16.2 — autoNoShowVisits
// ---------------------------------------------------------------------------

/**
 * Finds all visits where status='checked_in', bulk-updates them to 'no_show',
 * sends a 'warning' notification to the branch's security_head per record,
 * and writes an AUTO_NO_SHOW audit log per record.
 *
 * Requirement 3.14
 */
export async function autoNoShowVisits(): Promise<void> {
  const stale = await db
    .select()
    .from(visits)
    .where(eq(visits.status, 'checked_in'));

  if (stale.length === 0) return;

  await db
    .update(visits)
    .set({ status: 'no_show', updatedAt: new Date() })
    .where(eq(visits.status, 'checked_in'));

  await Promise.all(
    stale.map(async (visit) => {
      // Notify all security_heads in the branch
      const securityHeads = await db
        .select({ id: users.id })
        .from(users)
        .where(
          and(
            eq(users.role, 'security_head'),
            eq(users.branchId, visit.branchId),
          ),
        );

      await Promise.all(
        securityHeads.map((sh) =>
          sendNotification({
            userId:     sh.id,
            branchId:   visit.branchId,
            title:      'Visitor No-Show',
            message:    `A visitor (visit ID: ${visit.id}) checked in but never checked out before end of day. Status updated to no_show.`,
            severity:   'warning',
            entityType: 'visits',
            entityId:   visit.id,
          }),
        ),
      );

      await writeAuditLog({
        actorId:    null,
        branchId:   visit.branchId,
        action:     'AUTO_NO_SHOW',
        entityType: 'visits',
        entityId:   visit.id,
        previousState: { status: visit.status },
        newState:      { status: 'no_show' },
        metadata:   { reason: 'Visitor checked in but did not check out before end of business day' },
      });
    }),
  );
}

// ---------------------------------------------------------------------------
// 16.3 — autoExpireGatePasses
// ---------------------------------------------------------------------------

/**
 * Finds all gate passes where status='approved' AND requestedTimeIn < now - 30 min,
 * bulk-updates them to 'expired', sends a 'warning' notification to the student
 * per record, and writes an AUTO_EXPIRED audit log per record.
 *
 * Requirement 4.16
 */
export async function autoExpireGatePasses(): Promise<void> {
  const cutoff = minutesAgo(30);

  const stale = await db
    .select()
    .from(gatePasses)
    .where(
      and(
        eq(gatePasses.status, 'approved'),
        lt(gatePasses.requestedTimeIn, cutoff),
      ),
    );

  if (stale.length === 0) return;

  await db
    .update(gatePasses)
    .set({ status: 'expired', updatedAt: new Date() })
    .where(
      and(
        eq(gatePasses.status, 'approved'),
        lt(gatePasses.requestedTimeIn, cutoff),
      ),
    );

  await Promise.all(
    stale.map(async (pass) => {
      await sendNotification({
        userId:     pass.studentId,
        branchId:   pass.branchId,
        title:      'Gate Pass Expired',
        message:    'Your gate pass has expired unused.',
        severity:   'warning',
        entityType: 'gate_passes',
        entityId:   pass.id,
      });

      await writeAuditLog({
        actorId:    null,
        branchId:   pass.branchId,
        action:     'AUTO_EXPIRED',
        entityType: 'gate_passes',
        entityId:   pass.id,
        previousState: { status: pass.status },
        newState:      { status: 'expired' },
        metadata:   { reason: 'Gate pass approved but student never used it before requested time in + 30 min' },
      });
    }),
  );
}

// ---------------------------------------------------------------------------
// 16.4 — escalateGatePasses
// ---------------------------------------------------------------------------

/**
 * Finds all gate passes where status='pending', escalated=false, and
 * escalationDueAt < now. For each:
 *   - Sets escalated=true, currentApprovalLevel='principal'
 *   - Inserts a passApprovals record with action='ESCALATED'
 *   - Sends a 'warning' notification to the Principal
 *   - Sends an 'info' notification to the Student
 *   - Writes an ESCALATED audit log
 *
 * Requirement 4.15
 */
export async function escalateGatePasses(): Promise<void> {
  const now = new Date();

  const pending = await db
    .select({
      pass:    gatePasses,
      student: { id: users.id, name: users.name },
    })
    .from(gatePasses)
    .innerJoin(users, eq(gatePasses.studentId, users.id))
    .where(
      and(
        eq(gatePasses.status, 'pending'),
        eq(gatePasses.escalated, false),
        lt(gatePasses.escalationDueAt, now),
      ),
    );

  if (pending.length === 0) return;

  await Promise.all(
    pending.map(async ({ pass, student }) => {
      // Update the gate pass
      await db
        .update(gatePasses)
        .set({
          escalated:            true,
          currentApprovalLevel: 'principal',
          updatedAt:            new Date(),
        })
        .where(eq(gatePasses.id, pass.id));

      // Find the HOD who originally held the pass (for audit metadata)
      const hodUsers = await db
        .select({ id: users.id })
        .from(users)
        .where(
          and(
            eq(users.role, 'hod'),
            eq(users.branchId, pass.branchId),
          ),
        );
      const hodId = hodUsers[0]?.id ?? null;

      // Find principals in the branch
      const principals = await db
        .select({ id: users.id })
        .from(users)
        .where(
          and(
            eq(users.role, 'principal'),
            eq(users.branchId, pass.branchId),
          ),
        );

      // Insert passApprovals escalation record (use first principal as actor placeholder)
      const principalId = principals[0]?.id;
      if (principalId) {
        await db.insert(passApprovals).values({
          passId:  pass.id,
          actorId: principalId,
          action:  'ESCALATED',
          level:   'principal',
          notes:   'Auto-escalated by scheduler: HOD did not act within 2 hours',
        });
      }

      // Notify all principals
      await Promise.all(
        principals.map((principal) =>
          sendNotification({
            userId:     principal.id,
            branchId:   pass.branchId,
            title:      'Gate Pass Escalated to You',
            message:    `Gate pass for ${student.name} has been escalated to you for approval. Reason: ${pass.reason}. Requested: ${pass.requestedTimeOut.toISOString()} to ${pass.requestedTimeIn.toISOString()}.`,
            severity:   'warning',
            entityType: 'gate_passes',
            entityId:   pass.id,
          }),
        ),
      );

      // Notify student
      await sendNotification({
        userId:     pass.studentId,
        branchId:   pass.branchId,
        title:      'Gate Pass Escalated to Principal',
        message:    'Your gate pass request has been escalated to the Principal for approval.',
        severity:   'info',
        entityType: 'gate_passes',
        entityId:   pass.id,
      });

      // Audit log
      await writeAuditLog({
        actorId:    null,
        branchId:   pass.branchId,
        action:     'ESCALATED',
        entityType: 'gate_passes',
        entityId:   pass.id,
        previousState: { status: pass.status, escalated: false, currentApprovalLevel: pass.currentApprovalLevel },
        newState:      { status: pass.status, escalated: true,  currentApprovalLevel: 'principal' },
        metadata:   {
          studentId:   pass.studentId,
          hodId,
          principalId: principalId ?? null,
          reason:      'HOD did not act within 2 hours',
        },
      });
    }),
  );
}

// ---------------------------------------------------------------------------
// 16.5 — markOverdueNightOuts
// ---------------------------------------------------------------------------

/**
 * Finds all night-out requests where status='departed' AND
 * expectedReturnDatetime < now. For each:
 *   - Updates status to 'overdue'
 *   - Sends a 'critical' notification to Warden, HOD, and Principal
 *   - Writes an AUTO_EXPIRED audit log
 *
 * Requirement 5.18
 */
export async function markOverdueNightOuts(): Promise<void> {
  const now = new Date();

  const overdue = await db
    .select({
      nightOut: nightOutRequests,
      student:  { id: users.id, name: users.name },
    })
    .from(nightOutRequests)
    .innerJoin(users, eq(nightOutRequests.studentId, users.id))
    .where(
      and(
        eq(nightOutRequests.status, 'departed'),
        lt(nightOutRequests.expectedReturnDatetime, now),
      ),
    );

  if (overdue.length === 0) return;

  await Promise.all(
    overdue.map(async ({ nightOut, student }) => {
      // Update status to overdue
      await db
        .update(nightOutRequests)
        .set({ status: 'overdue' })
        .where(eq(nightOutRequests.id, nightOut.id));

      const expectedStr = nightOut.expectedReturnDatetime.toISOString();

      // Find wardens, HODs, and principals in the branch
      const recipients = await db
        .select({ id: users.id, role: users.role })
        .from(users)
        .where(
          and(
            eq(users.branchId, nightOut.branchId),
            eq(users.isActive, true),
          ),
        );

      const notifyRoles = new Set(['warden', 'hod', 'principal']);
      const targets = recipients.filter((u) => notifyRoles.has(u.role));

      await Promise.all(
        targets.map((target) =>
          sendNotification({
            userId:     target.id,
            branchId:   nightOut.branchId,
            title:      'CRITICAL: Student Overdue from Night Out',
            message:    `CRITICAL: Student ${student.name} is overdue for return from night out. Expected return: ${expectedStr}.`,
            severity:   'critical',
            entityType: 'night_out_requests',
            entityId:   nightOut.id,
          }),
        ),
      );

      // Audit log
      await writeAuditLog({
        actorId:    null,
        branchId:   nightOut.branchId,
        action:     'AUTO_EXPIRED',
        entityType: 'night_out_requests',
        entityId:   nightOut.id,
        previousState: { status: nightOut.status },
        newState:      { status: 'overdue' },
        metadata:   {
          studentId:              nightOut.studentId,
          studentName:            student.name,
          expectedReturnDatetime: expectedStr,
        },
      });
    }),
  );
}
