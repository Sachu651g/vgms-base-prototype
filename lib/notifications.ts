import { db } from '@/db';
import { notifications, users } from '@/db/schema';
import { eq } from 'drizzle-orm';
import type { User } from '@/db/schema';

/**
 * NotificationPayload — data required to create an in-app notification.
 * Requirement 8.1, 8.9
 */
export interface NotificationPayload {
  userId: string;
  branchId?: string;
  title: string;
  message: string;
  severity?: 'info' | 'warning' | 'critical';
  entityType?: string;
  entityId?: string;
}

/**
 * Looks up a user by their UUID.
 * Used by the notification service to resolve recipient contact details.
 */
export async function getUserById(id: string): Promise<User | undefined> {
  const result = await db
    .select()
    .from(users)
    .where(eq(users.id, id))
    .limit(1);
  return result[0];
}

/**
 * Inserts a notification row into the `notifications` table and logs a mock
 * SMS/email to the console. No external API calls are made.
 *
 * Requirement 8.1: delivered within the same request-response cycle.
 * Requirement 8.9: SMS/email mocked via console.log only.
 */
export async function sendNotification(payload: NotificationPayload): Promise<void> {
  // 1. Write to DB
  await db.insert(notifications).values({
    userId:     payload.userId,
    branchId:   payload.branchId,
    title:      payload.title,
    message:    payload.message,
    severity:   payload.severity ?? 'info',
    entityType: payload.entityType,
    entityId:   payload.entityId,
    isRead:     false,
  });

  // 2. Mock SMS/email — log only, no external API calls (Requirement 8.9)
  console.log('[SMS/Email Mock]', payload.title, '->', payload.message);

  const recipient = await getUserById(payload.userId);
  console.log(
    `[NOTIFICATION] To: ${recipient?.email ?? payload.userId} | Channel: in-app | Title: ${payload.title}`,
  );

  if (payload.severity === 'critical') {
    console.log(`[NOTIFICATION:SMS] To: ${recipient?.phone ?? 'unknown'} | ${payload.message}`);
    console.log(`[NOTIFICATION:EMAIL] To: ${recipient?.email ?? 'unknown'} | ${payload.message}`);
  }
}
