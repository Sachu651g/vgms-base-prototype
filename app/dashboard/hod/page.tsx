'use client';

import { useSession } from 'next-auth/react';
import { Clock, CheckCircle2, XCircle, AlertTriangle, ClipboardList, Users, BarChart3, Bell } from 'lucide-react';
import { HeroBar, StatCard, ActionCard, ActivityPanel, InfoStrip } from '@/components/dashboard/DashboardShell';

export default function HodDashboard() {
  const { data: session } = useSession();
  const name = session?.user?.name ?? 'HOD';

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      <HeroBar
        gradient="from-teal-950 to-teal-900"
        title="Head of Department"
        subtitle={`Welcome, ${name}. Review and approve student gate pass requests.`}
        actions={[
          { label: 'Pending approvals', href: '/dashboard/hod/approvals', primary: true },
          { label: 'Department students', href: '/dashboard/hod/students' },
        ]}
      />

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard label="Pending approvals" value="0" sub="Require your action"    icon={Clock}         bg="bg-amber-50"  iconColor="text-amber-500"  border="border-amber-100"  valueColor="text-amber-700" />
        <StatCard label="Approved today"    value="0" sub="Passes approved by you" icon={CheckCircle2}  bg="bg-green-50"  iconColor="text-green-600"  border="border-green-100"  valueColor="text-green-700" />
        <StatCard label="Rejected today"    value="0" sub="Passes declined by you" icon={XCircle}       bg="bg-red-50"    iconColor="text-red-500"    border="border-red-100"    valueColor="text-red-700" />
        <StatCard label="Escalated"         value="0" sub="Sent to Principal"      icon={AlertTriangle} bg="bg-purple-50" iconColor="text-purple-600" border="border-purple-100" valueColor="text-purple-700" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="lg:col-span-2 bg-white rounded-xl border border-slate-200 p-5">
          <h2 className="text-sm font-medium text-slate-700 mb-4">Quick actions</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <ActionCard title="Pending passes"      desc="Review and approve requests"       icon={ClipboardList} primary href="/dashboard/hod/approvals" />
            <ActionCard title="Department students" desc="View all students in your dept"    icon={Users}                href="/dashboard/hod/students" />
            <ActionCard title="Pass history"        desc="All past approvals and rejections" icon={BarChart3}            href="/dashboard/hod/history" />
            <ActionCard title="Escalation alerts"   desc="Passes forwarded to Principal"     icon={Bell}                 href="/dashboard/hod/escalations" />
          </div>
        </div>
        <ActivityPanel
          title="Recent approvals"
          emptyIcon={ClipboardList}
          emptyMessage={"No pending approvals.\nNew requests will appear here."}
          ctaLabel="View all requests"
          ctaHref="/dashboard/hod/approvals"
        />
      </div>

      <InfoStrip
        color="amber"
        message="Unreviewed passes auto-escalate to Principal after 2 hours"
        sub="Act promptly to avoid escalation. Students are notified at each step."
        ctaLabel="View pending"
        ctaHref="/dashboard/hod/approvals"
      />
    </div>
  );
}
