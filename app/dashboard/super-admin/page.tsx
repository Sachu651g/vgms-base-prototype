'use client';

import { useSession } from 'next-auth/react';
import { Building2, Users, QrCode, FileText, Globe, Settings, BarChart3 } from 'lucide-react';
import { HeroBar, StatCard, ActionCard, ActivityPanel, InfoStrip } from '@/components/dashboard/DashboardShell';

export default function SuperAdminDashboard() {
  const { data: session } = useSession();
  void session;

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      <HeroBar
        gradient="from-violet-950 to-violet-900"
        title="Super Admin — System Overview"
        subtitle="Cross-branch access. You have full system control."
        statusBadge={{ label: 'All systems operational', color: 'bg-green-500/20 text-green-400 border border-green-500/30' }}
        actions={[
          { label: 'System config', href: '/dashboard/super-admin/config', primary: true },
          { label: 'All branches', href: '/dashboard/super-admin/branches' },
        ]}
      />

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard label="Total branches"     value="1" sub="Active campuses"     icon={Building2} bg="bg-violet-50" iconColor="text-violet-600" border="border-violet-100" valueColor="text-violet-700" />
        <StatCard label="Total users"        value="9" sub="Across all branches" icon={Users}     bg="bg-blue-50"   iconColor="text-blue-600"   border="border-blue-100"   valueColor="text-blue-700" />
        <StatCard label="System-wide passes" value="0" sub="Active right now"    icon={QrCode}    bg="bg-green-50"  iconColor="text-green-600"  border="border-green-100"  valueColor="text-green-700" />
        <StatCard label="Audit events"       value="0" sub="Last 24 hours"       icon={FileText}  bg="bg-slate-50"  iconColor="text-slate-500"  border="border-slate-100"  valueColor="text-slate-700" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="lg:col-span-2 bg-white rounded-xl border border-slate-200 p-5">
          <h2 className="text-sm font-medium text-slate-700 mb-4">System actions</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <ActionCard title="All branches"  desc="View and configure each campus"   icon={Globe}    primary href="/dashboard/super-admin/branches" />
            <ActionCard title="System config" desc="Global settings and permissions"  icon={Settings}        href="/dashboard/super-admin/config" />
            <ActionCard title="Audit log"     desc="Full cross-branch event trail"    icon={FileText}        href="/dashboard/super-admin/audit" />
            <ActionCard title="All users"     desc="Manage users across all branches" icon={Users}           href="/dashboard/super-admin/users" />
          </div>
        </div>
        <ActivityPanel
          title="System events"
          emptyIcon={BarChart3}
          emptyMessage={"No system events.\nActivity will appear here."}
          ctaLabel="View audit log"
          ctaHref="/dashboard/super-admin/audit"
        />
      </div>

      <InfoStrip
        color="violet"
        message="You have super admin access across all branches"
        sub="All actions are fully audit logged with your user ID and timestamp."
        ctaLabel="View audit log"
        ctaHref="/dashboard/super-admin/audit"
      />
    </div>
  );
}
