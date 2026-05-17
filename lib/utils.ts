import { db } from '@/db';
import { auditLogs } from '@/db/schema';
import type { AuditAction } from '@/db/schema';

// ---------------------------------------------------------------------------
// Audit Log
// ---------------------------------------------------------------------------

export interface WriteAuditLogParams {
  actorId?: string | null;
  branchId?: string | null;
  actorIp?: string | null;
  action: AuditAction;
  entityType: string;
  entityId?: string | null;
  previousState?: unknown;
  newState?: unknown;
  metadata?: unknown;
}

/**
 * Inserts an immutable audit log entry into the `audit_logs` table.
 *
 * `previousState`, `newState`, and `metadata` are JSON-stringified when
 * objects are passed so they are stored as text columns.
 *
 * Requirement 7.1, 7.2
 */
export async function writeAuditLog(params: WriteAuditLogParams): Promise<void> {
  const stringify = (value: unknown): string | undefined => {
    if (value === undefined || value === null) return undefined;
    if (typeof value === 'string') return value;
    return JSON.stringify(value);
  };

  const nullToUndef = (v: string | null | undefined) => v ?? undefined;

  await db.insert(auditLogs).values({
    actorId:       nullToUndef(params.actorId),
    branchId:      nullToUndef(params.branchId),
    actorIp:       nullToUndef(params.actorIp),
    action:        params.action,
    entityType:    params.entityType,
    entityId:      nullToUndef(params.entityId),
    previousState: stringify(params.previousState),
    newState:      stringify(params.newState),
    metadata:      stringify(params.metadata),
  });
}

// ---------------------------------------------------------------------------
// Visit Status State Machine
// ---------------------------------------------------------------------------

/**
 * Allowed visit status transitions.
 * Requirement 3.2 / Design: Visit Status State Machine
 */
const VISIT_TRANSITIONS: Record<string, readonly string[]> = {
  pending:     ['approved', 'rejected'],
  approved:    ['checked_in', 'expired'],
  checked_in:  ['checked_out', 'no_show'],
  rejected:    [],
  checked_out: [],
  expired:     [],
  no_show:     [],
};

/**
 * Returns true if transitioning a visit from `from` to `to` is allowed.
 */
export function canTransitionVisit(from: string, to: string): boolean {
  return VISIT_TRANSITIONS[from]?.includes(to) ?? false;
}

/**
 * Validates a visit status transition.
 * Returns `{ valid: true }` on success, or a ready-to-use HTTP 422 error
 * object on failure.
 *
 * Requirement 3.2
 */
export function validateVisitTransition(
  from: string,
  to: string,
): { valid: boolean; error?: { status: 422; body: { error: string; message: string } } } {
  if (canTransitionVisit(from, to)) {
    return { valid: true };
  }
  return {
    valid: false,
    error: {
      status: 422,
      body: {
        error: 'Invalid transition',
        message: `Cannot move from ${from} to ${to}`,
      },
    },
  };
}

// ---------------------------------------------------------------------------
// Gate Pass Status State Machine
// ---------------------------------------------------------------------------

/**
 * Allowed gate pass status transitions.
 * Requirement 4.2 / Design: Gate Pass Status State Machine
 */
const GATE_PASS_TRANSITIONS: Record<string, readonly string[]> = {
  pending:   ['approved', 'rejected', 'cancelled'],
  approved:  ['exited', 'expired'],
  exited:    ['returned'],
  returned:  ['used'],
  rejected:  [],
  cancelled: [],
  expired:   [],
  used:      [],
};

/**
 * Returns true if transitioning a gate pass from `from` to `to` is allowed.
 */
export function canTransitionGatePass(from: string, to: string): boolean {
  return GATE_PASS_TRANSITIONS[from]?.includes(to) ?? false;
}

/**
 * Validates a gate pass status transition.
 * Returns `{ valid: true }` on success, or a ready-to-use HTTP 422 error
 * object on failure.
 *
 * Requirement 4.2
 */
export function validateGatePassTransition(
  from: string,
  to: string,
): { valid: boolean; error?: { status: 422; body: { error: string; message: string } } } {
  if (canTransitionGatePass(from, to)) {
    return { valid: true };
  }
  return {
    valid: false,
    error: {
      status: 422,
      body: {
        error: 'Invalid transition',
        message: `Cannot move from ${from} to ${to}`,
      },
    },
  };
}
