/**
 * app/(dashboard)/admin/page.tsx
 *
 * Task 22.7 — Admin dashboard page.
 * Allowed roles: super_admin, branch_admin
 *
 * Requirements: 2.1, 2.2
 */

import { getServerSession } from 'next-auth/next';
import { redirect } from 'next/navigation';
import { authOptions } from '@/lib/auth';
import AdminDashboard from '@/components/dashboards/AdminDashboard';

const ALLOWED_ROLES = ['super_admin', 'branch_admin'] as const;
type AllowedRole = (typeof ALLOWED_ROLES)[number];

export default async function AdminPage() {
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

  return <AdminDashboard />;
}
