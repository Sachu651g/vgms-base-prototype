/**
 * app/(dashboard)/receptionist/page.tsx
 *
 * Task 22.7 — Receptionist dashboard page.
 * Allowed roles: receptionist
 *
 * Requirements: 2.9, 3.4
 */

import { getServerSession } from 'next-auth/next';
import { redirect } from 'next/navigation';
import { authOptions } from '@/lib/auth';
import ReceptionistDashboard from '@/components/dashboards/ReceptionistDashboard';

export default async function ReceptionistPage() {
  const session = await getServerSession(authOptions);

  if (!session?.user) {
    redirect('/login');
  }

  if (session.user.role !== 'receptionist') {
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

  return <ReceptionistDashboard />;
}
