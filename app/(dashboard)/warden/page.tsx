/**
 * app/(dashboard)/warden/page.tsx
 *
 * Task 22.7 — Warden dashboard page.
 * Allowed roles: warden
 *
 * Requirements: 2.6, 5.6, 5.21
 */

import { getServerSession } from 'next-auth/next';
import { redirect } from 'next/navigation';
import { authOptions } from '@/lib/auth';
import WardenDashboard from '@/components/dashboards/WardenDashboard';

export default async function WardenPage() {
  const session = await getServerSession(authOptions);

  if (!session?.user) {
    redirect('/login');
  }

  if (session.user.role !== 'warden') {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <div className="rounded-lg border border-red-200 bg-red-50 px-8 py-6 text-center">
          <h1 className="text-xl font-semibold text-red-800">403 — Forbidden</h1>
          <p className="mt-2 text-sm text-red-600">
            You do not have permission to access this page.
          </p>
        </div>
      </div>
    );
  }

  return <WardenDashboard />;
}
