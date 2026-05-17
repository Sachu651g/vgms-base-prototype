/**
 * app/(dashboard)/hod/page.tsx
 *
 * Task 22.7 — HOD / Faculty dashboard page.
 * Allowed roles: hod, faculty
 *
 * Requirements: 2.4, 2.5, 4.6, 4.7
 */

import { getServerSession } from 'next-auth/next';
import { redirect } from 'next/navigation';
import { authOptions } from '@/lib/auth';
import HodDashboard from '@/components/dashboards/HodDashboard';

const ALLOWED_ROLES = ['hod', 'faculty'] as const;
type AllowedRole = (typeof ALLOWED_ROLES)[number];

export default async function HodPage() {
  const session = await getServerSession(authOptions);

  if (!session?.user) {
    redirect('/login');
  }

  if (!ALLOWED_ROLES.includes(session.user.role as AllowedRole)) {
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

  return <HodDashboard />;
}
