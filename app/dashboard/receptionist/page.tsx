'use client';

import { useSession } from 'next-auth/react';
import { Users, Clock, CheckCircle2, DoorOpen, UserPlus, ClipboardList, Shield, History } from 'lucide-react';
import { HeroBar, StatCard, ActionCard, ActivityPanel, InfoStrip } from '@/components/dashboard/DashboardShell';

export default function ReceptionistDashboard() {
  const { data: session } = useSession();
  const name = session?.user?.name ?? 'Receptionist';

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      <HeroBar
        gradient="from-green-950 to-green-900"
        title="Receptionist Dashboard"
        subtitle={`Welcome, ${name}. Manage visitor registrations and today's visit log.`}
        actions={[
          { label: '+ Register visitor', href: '/dashboard/receptionist/visitors/new', primary: true },
          { label: "Today's visits", href: '/dashboard/receptionist/visitors' },
        ]}
      />

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard label="Today's visitors"       value="0" sub="Registered today"       icon={Users}        bg="bg-green-50" iconColor="text-green-600" border="border-green-100" valueColor="text-green-700" />
        <StatCard label="Pending host approvals" value="0" sub="Awaiting host response" icon={Clock}        bg="bg-amber-50" iconColor="text-amber-500" border="border-amber-100" valueColor="text-amber-700" />
        <StatCard label="Checked in"             value="0" sub="Currently on campus"    icon={CheckCircle2} bg="bg-blue-50"  iconColor="text-blue-600"  border="border-blue-100"  valueColor="text-blue-700" />
        <StatCard label="Checked out"            value="0" sub="Departed today"         icon={DoorOpen}     bg="bg-slate-50" iconColor="text-slate-500" border="border-slate-100" valueColor="text-slate-700" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="lg:col-span-2 bg-white rounded-xl border border-slate-200 p-5">
          <h2 className="text-sm font-medium text-slate-700 mb-4">Quick actions</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <ActionCard title="Register visitor" desc="Walk-in visitor registration"      icon={UserPlus}     primary href="/dashboard/receptionist/visitors/new" />
            <ActionCard title="Today's visits"   desc="View and manage current visitors"  icon={ClipboardList}       href="/dashboard/receptionist/visitors" />
            <ActionCard title="Blacklist check"  desc="Check if a visitor is blocked"     icon={Shield}              href="/dashboard/receptionist/blacklist" />
            <ActionCard title="Visitor history"  desc="All past visits and records"       icon={History}             href="/dashboard/receptionist/history" />
          </div>
        </div>
        <ActivityPanel
          title="Pending host approvals"
          emptyIcon={Clock}
          emptyMessage={"No pending approvals.\nHost responses appear here."}
          ctaLabel="View all visits"
          ctaHref="/dashboard/receptionist/visitors"
        />
      </div>

      <InfoStrip
        color="green"
        message="Always check the blacklist before registering a new visitor"
        sub="Blacklisted visitors must be denied entry. The system checks automatically on submission."
        ctaLabel="Open blacklist"
        ctaHref="/dashboard/receptionist/blacklist"
      />
    </div>
  );
}
