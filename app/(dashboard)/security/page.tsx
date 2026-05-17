/**
 * app/(dashboard)/security/page.tsx
 *
 * Task 22.7 — Security dashboard page.
 * Allowed roles: security_head, watchman
 *
 * Requirements: 2.7, 2.8
 */

import { getServerSession } from 'next-auth/next';
import { redirect } from 'next/navigation';
import { authOptions } from '@/lib/auth';
import SecurityDashboard from '@/components/dashboards/SecurityDashboard';

const ALLOWED_ROLES = ['security_head', 'watchman'] as const;
type AllowedRole = (typeof ALLOWED_ROLES)[number];

export default async function SecurityPage() {
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

  return <SecurityDashboard role={session.user.role} />;
}
