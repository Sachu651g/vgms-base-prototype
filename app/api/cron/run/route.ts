/**
 * app/api/cron/run/route.ts
 *
 * Task 15.1 — GET /api/cron/run
 *
 * Protected by CRON_SECRET bearer token.
 * Runs: autoExpireVisits, autoExpireGatePasses, escalateGatePasses,
 *       markOverdueNightOuts.
 *
 * Requirements: 3.13, 4.15, 4.16, 5.18
 */

import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

import {
  autoExpireVisits,
  autoExpireGatePasses,
  escalateGatePasses,
  markOverdueNightOuts,
} from '@/lib/scheduler';

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
  // Run jobs in sequence
  // -------------------------------------------------------------------------
  await autoExpireVisits();
  await autoExpireGatePasses();
  await escalateGatePasses();
  await markOverdueNightOuts();

  return NextResponse.json({
    success: true,
    ran: [
      'autoExpireVisits',
      'autoExpireGatePasses',
      'escalateGatePasses',
      'markOverdueNightOuts',
    ],
  });
}
