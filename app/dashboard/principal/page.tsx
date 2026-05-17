'use client';

import { useSession } from 'next-auth/react';
import { AlertTriangle, Clock, Eye, ShieldAlert, ClipboardList, BarChart3, FileText } from 'lucide-react';
import { HeroBar, StatCard, ActionCard, ActivityPanel, InfoStrip } from '@/components/dashboard/DashboardShell';

export default function PrincipalDashboard() {
  const { data: session } = useSession();
  const name = session?.user?.name ?? 'Principal';

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      <HeroBar
        gradient="from-indigo-950 to-indigo-900"
        title="Principal Dashboard"
        subtitle={`Welcome, ${name}. Review escalated approvals and branch-wide oversight.`}
        actions={[
          { label: 'Escalated passes', href: '/dashboard/principal/escalations', primary: true },
          { label: 'Branch report', href: '/dashboard/principal/reports' },
        ]}
      />

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard label="Escalated passes"  value="0" sub="Require your approval"    icon={AlertTriangle} bg="bg-red-50"    iconColor="text-red-500"    border="border-red-100"    valueColor="text-red-700" />
        <StatCard label="Pending review"    value="0" sub="Awaiting your decision"   icon={Clock}         bg="bg-amber-50"  iconColor="text-amber-500"  border="border-amber-100"  valueColor="text-amber-700" />
        <StatCard label="Active visitors"   value="0" sub="On campus right now"      icon={Eye}           bg="bg-blue-50"   iconColor="text-blue-600"   border="border-blue-100"   valueColor="text-blue-700" />
        <StatCard label="Today's incidents" value="0" sub="Violations and anomalies" icon={ShieldAlert}   bg="bg-purple-50" iconColor="text-purple-600" border="border-purple-100" valueColor="text-purple-700" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="lg:col-span-2 bg-white rounded-xl border border-slate-200 p-5">
          <h2 className="text-sm font-medium text-slate-700 mb-4">Quick actions</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <ActionCard title="Escalated passes" desc="HOD-escalated approvals"        icon={AlertTriangle} primary href="/dashboard/principal/escalations" />
            <ActionCard title="Override pass"    desc="Manually approve or reject"     icon={ClipboardList}        href="/dashboard/principal/override" />
            <ActionCard title="Branch report"    desc="Pass statistics and trends"     icon={BarChart3}            href="/dashboard/principal/reports" />
            <ActionCard title="Audit log"        desc="Full branch activity trail"     icon={FileText}             href="/dashboard/principal/audit" />
          </div>
        </div>
        <ActivityPanel
          title="Escalation queue"
          emptyIcon={AlertTriangle}
          emptyMessage={"No escalations.\nHOD-escalated passes appear here."}
          ctaLabel="View all escalations"
          ctaHref="/dashboard/principal/escalations"
        />
      </div>

      <InfoStrip
        color="red"
        message="0 escalated passes awaiting your approval"
        sub="Escalated passes are auto-forwarded when HOD does not act within 2 hours."
        ctaLabel="Review escalations"
        ctaHref="/dashboard/principal/escalations"
      />
    </div>
  );
}
