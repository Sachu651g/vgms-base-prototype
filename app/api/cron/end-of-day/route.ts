/**
 * app/api/cron/end-of-day/route.ts
 *
 * Task 15.2 — GET /api/cron/end-of-day
 *
 * Protected by CRON_SECRET bearer token.
 * Runs: autoNoShowVisits.
 *
 * Requirement 3.14
 */

import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

import { autoNoShowVisits } from '@/lib/scheduler';

export async function GET(req: NextRequest): Promise<NextResponse> {
  // -------------------------------------------------------------------------
  // Auth: Bearer token check
  // -------------------------------------------------------------------------
  const cronSecret = process.env.CRON_SECRET;
  const authHeader = req.headers.get('authorization');
  const token      = authHeader?.startsWith('Bearer ') ? authHeader.slice(7) : null;

  if (!cronSecret || token !== cronSecret) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  // -------------------------------------------------------------------------
  // Run end-of-day job
  // -------------------------------------------------------------------------
  await autoNoShowVisits();

  return NextResponse.json({
    success: true,
    ran: ['autoNoShowVisits'],
  });
}
