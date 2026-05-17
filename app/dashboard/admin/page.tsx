'use client';

import { useSession } from 'next-auth/react';
import { Users, QrCode, Clock, Eye, UserPlus, Settings, Shield, FileText } from 'lucide-react';
import { HeroBar, StatCard, ActionCard, ActivityPanel, InfoStrip } from '@/components/dashboard/DashboardShell';

export default function AdminDashboard() {
  const { data: session } = useSession();
  const name = session?.user?.name ?? 'Admin';

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      <HeroBar
        gradient="from-slate-900 to-slate-800"
        title="Branch Admin Dashboard"
        subtitle={`Welcome back, ${name}. Here is your branch overview.`}
        actions={[
          { label: 'Register visitor', href: '/dashboard/admin/visitors/new', primary: true },
          { label: 'Add user', href: '/dashboard/admin/users/new' },
        ]}
      />

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard label="Total users"        value="9" sub="Across all roles"        icon={Users}  bg="bg-blue-50"   iconColor="text-blue-600"   border="border-blue-100"   valueColor="text-blue-700" />
        <StatCard label="Active gate passes" value="0" sub="Currently in use"        icon={QrCode} bg="bg-green-50"  iconColor="text-green-600"  border="border-green-100"  valueColor="text-green-700" />
        <StatCard label="Pending approvals"  value="0" sub="Awaiting action"         icon={Clock}  bg="bg-amber-50"  iconColor="text-amber-500"  border="border-amber-100"  valueColor="text-amber-700" />
        <StatCard label="Visitors today"     value="0" sub="Registered this session" icon={Eye}    bg="bg-purple-50" iconColor="text-purple-600" border="border-purple-100" valueColor="text-purple-700" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="lg:col-span-2 bg-white rounded-xl border border-slate-200 p-5">
          <h2 className="text-sm font-medium text-slate-700 mb-4">Quick actions</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <ActionCard title="Manage users"  desc="Add, edit, or deactivate users"   icon={UserPlus} primary href="/dashboard/admin/users" />
            <ActionCard title="View audit log" desc="Full system activity trail"       icon={FileText}        href="/dashboard/admin/audit" />
            <ActionCard title="Branch config"  desc="Departments, gates, hostel blocks" icon={Settings}       href="/dashboard/admin/config" />
            <ActionCard title="Blacklist"       desc="Manage blocked visitor records"  icon={Shield}          href="/dashboard/admin/blacklist" />
          </div>
        </div>
        <ActivityPanel
          title="Recent audit events"
          emptyIcon={FileText}
          emptyMessage={"No recent events.\nAudit log will populate here."}
          ctaLabel="View full log"
          ctaHref="/dashboard/admin/audit"
        />
      </div>

      <InfoStrip
        color="amber"
        message="0 pending approvals in your branch"
        sub="All pass requests are up to date. Check back after new submissions."
        ctaLabel="Review approvals"
        ctaHref="/dashboard/admin/approvals"
      />
    </div>
  );
}
