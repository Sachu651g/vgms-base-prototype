'use client';

import { useSession } from 'next-auth/react';
import { QrCode, History, Clock, Bed, Plus, MoveRight, Moon } from 'lucide-react';
import { HeroBar, StatCard, ActionCard, ActivityPanel, InfoStrip } from '@/components/dashboard/DashboardShell';

export default function StudentDashboard() {
  const { data: session } = useSession();
  const name = session?.user?.name ?? 'Student';
  const firstName = name.split(' ')[0];
  const h = new Date().getHours();
  const greeting = h < 12 ? 'Good morning' : h < 17 ? 'Good afternoon' : 'Good evening';

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      <HeroBar
        gradient="from-slate-900 to-slate-800"
        title={`${greeting}, ${firstName} 👋`}
        subtitle="Here is a summary of your gate pass activity today."
        statusBadge={{ label: 'Currently IN hostel', color: 'bg-green-500/20 text-green-400 border border-green-500/30' }}
        actions={[{ label: '+ New pass request', href: '/dashboard/student/request-pass', primary: true }]}
      />

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard label="Active pass"     value="0"  sub="No active pass"        icon={QrCode}  bg="bg-blue-50"  iconColor="text-blue-600"  border="border-blue-100"  valueColor="text-blue-700" />
        <StatCard label="Pass history"    value="0"  sub="Total passes used"      icon={History} bg="bg-slate-50" iconColor="text-slate-500" border="border-slate-100" valueColor="text-slate-700" />
        <StatCard label="Pending request" value="0"  sub="Awaiting HOD approval"  icon={Clock}   bg="bg-amber-50" iconColor="text-amber-500" border="border-amber-100" valueColor="text-amber-700" />
        <StatCard label="Hostel status"   value="IN" sub="Block A · Room A-101"   icon={Bed}     bg="bg-green-50" iconColor="text-green-600" border="border-green-100" valueColor="text-green-700" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="lg:col-span-2 bg-white rounded-xl border border-slate-200 p-5">
          <h2 className="text-sm font-medium text-slate-700 mb-4">Quick actions</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <ActionCard title="Request gate pass" desc="Submit a day pass or hourly pass"   icon={Plus}     primary href="/dashboard/student/request-pass" />
            <ActionCard title="My passes"         desc="View history and active QR code"    icon={QrCode}          href="/dashboard/student/passes" />
            <ActionCard title="Hostel movement"   desc="Request permission to leave hostel" icon={MoveRight}       href="/dashboard/student/hostel" />
            <ActionCard title="Night-out request" desc="Apply for overnight leave"          icon={Moon}            href="/dashboard/student/night-out" />
          </div>
        </div>
        <ActivityPanel
          title="Recent activity"
          emptyIcon={History}
          emptyMessage={"No recent activity.\nRequest your first gate pass."}
          ctaLabel="Request now"
          ctaHref="/dashboard/student/request-pass"
        />
      </div>

      <InfoStrip
        color="blue"
        message="Gate pass requests require HOD approval"
        sub="Submit at least 30 minutes before departure. Auto-escalates to Principal after 2 hours."
        ctaLabel="Read policy"
        ctaHref="/policy"
      />
    </div>
  );
}
