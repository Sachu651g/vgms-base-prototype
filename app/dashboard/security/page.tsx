'use client';

import { useSession } from 'next-auth/react';
import { QrCode, Users, DoorOpen, ShieldAlert, Eye, AlertTriangle, BarChart3 } from 'lucide-react';
import { HeroBar, StatCard, ActionCard, ActivityPanel, InfoStrip } from '@/components/dashboard/DashboardShell';

export default function SecurityDashboard() {
  const { data: session } = useSession();
  const name = session?.user?.name ?? 'Security Head';

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      <HeroBar
        gradient="from-red-950 to-red-900"
        title="Security Head Dashboard"
        subtitle={`Welcome, ${name}. Campus-wide gate activity and scan log monitoring.`}
        statusBadge={{ label: 'All gates active', color: 'bg-green-500/20 text-green-400 border border-green-500/30' }}
        actions={[
          { label: 'Live scan log', href: '/dashboard/security/scans', primary: true },
          { label: 'Active passes', href: '/dashboard/security/passes' },
        ]}
      />

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard label="Active passes"      value="0" sub="Currently in use"       icon={QrCode}      bg="bg-green-50" iconColor="text-green-600" border="border-green-100" valueColor="text-green-700" />
        <StatCard label="Visitors on campus" value="0" sub="Checked in, not out"    icon={Users}       bg="bg-blue-50"  iconColor="text-blue-600"  border="border-blue-100"  valueColor="text-blue-700" />
        <StatCard label="Students outside"   value="0" sub="Exited campus gate"     icon={DoorOpen}    bg="bg-amber-50" iconColor="text-amber-500" border="border-amber-100" valueColor="text-amber-700" />
        <StatCard label="Failed scans"       value="0" sub="Rejected at gate today" icon={ShieldAlert} bg="bg-red-50"   iconColor="text-red-500"   border="border-red-100"   valueColor="text-red-700" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="lg:col-span-2 bg-white rounded-xl border border-slate-200 p-5">
          <h2 className="text-sm font-medium text-slate-700 mb-4">Quick actions</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <ActionCard title="Scan log"      desc="All entry and exit events"        icon={Eye}           primary href="/dashboard/security/scans" />
            <ActionCard title="Active passes" desc="All currently valid passes"       icon={QrCode}               href="/dashboard/security/passes" />
            <ActionCard title="Visitor list"  desc="Everyone on campus right now"     icon={Users}                href="/dashboard/security/visitors" />
            <ActionCard title="Anomalies"     desc="Failed scans and violations"      icon={AlertTriangle}        href="/dashboard/security/anomalies" />
          </div>
        </div>
        <ActivityPanel
          title="Live gate events"
          emptyIcon={BarChart3}
          emptyMessage={"No gate events yet.\nScan activity appears here live."}
          ctaLabel="View full scan log"
          ctaHref="/dashboard/security/scans"
        />
      </div>

      <InfoStrip
        color="red"
        message="0 failed scan attempts today"
        sub="All QR payloads are AES-256 validated. Failed attempts are logged automatically."
        ctaLabel="View anomalies"
        ctaHref="/dashboard/security/anomalies"
      />
    </div>
  );
}
