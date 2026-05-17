'use client';

import { useSession } from 'next-auth/react';
import { Bed, DoorOpen, AlertTriangle, Moon, Users, MoveRight, ClipboardList, Bell } from 'lucide-react';
import { HeroBar, StatCard, ActionCard, ActivityPanel, InfoStrip } from '@/components/dashboard/DashboardShell';

export default function WardenDashboard() {
  const { data: session } = useSession();
  const name = session?.user?.name ?? 'Warden';
  const overdueCount = 0;

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      <HeroBar
        gradient="from-amber-950 to-amber-900"
        title="Warden Dashboard"
        subtitle={`Welcome, ${name}. Live hostel occupancy and student movement tracking.`}
        statusBadge={{ label: 'Block A — Live', color: 'bg-green-500/20 text-green-400 border border-green-500/30' }}
        actions={[
          { label: 'Live hostel status', href: '/dashboard/warden/live', primary: true },
          { label: 'Night-out requests', href: '/dashboard/warden/night-out' },
        ]}
      />

      {overdueCount > 0 && (
        <div className="bg-red-50 border border-red-200 rounded-xl p-4 flex items-center gap-3">
          <AlertTriangle className="w-5 h-5 text-red-500 flex-shrink-0" />
          <div className="flex-1">
            <p className="text-sm font-medium text-red-800">
              {overdueCount} student{overdueCount > 1 ? 's have' : ' has'} not returned on time
            </p>
            <p className="text-xs text-red-600 mt-0.5">Immediate action required. Check the movement log.</p>
          </div>
          <button
            onClick={() => { window.location.href = '/dashboard/warden/overdue'; }}
            className="text-xs font-medium text-red-700 border border-red-200 bg-white rounded-lg px-3 py-1.5 hover:bg-red-50 transition whitespace-nowrap"
          >
            View now →
          </button>
        </div>
      )}

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard label="Students IN"        value="1" sub="Present in hostel"         icon={Bed}           bg="bg-green-50" iconColor="text-green-600" border="border-green-100" valueColor="text-green-700" />
        <StatCard label="Students OUT"       value="0" sub="Currently outside"         icon={DoorOpen}      bg="bg-amber-50" iconColor="text-amber-500" border="border-amber-100" valueColor="text-amber-700" />
        <StatCard label="Overdue returns"    value="0" sub="Past expected return time" icon={AlertTriangle} bg="bg-red-50"   iconColor="text-red-500"   border="border-red-100"   valueColor="text-red-700" />
        <StatCard label="Night-out requests" value="0" sub="Pending approval"          icon={Moon}          bg="bg-slate-50" iconColor="text-slate-500" border="border-slate-100" valueColor="text-slate-700" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="lg:col-span-2 bg-white rounded-xl border border-slate-200 p-5">
          <h2 className="text-sm font-medium text-slate-700 mb-4">Quick actions</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <ActionCard title="Live hostel status" desc="Who is IN and OUT right now"       icon={Users}    primary href="/dashboard/warden/live" />
            <ActionCard title="Movement log"       desc="Full departure and return history" icon={MoveRight}       href="/dashboard/warden/movements" />
            <ActionCard title="Night-out requests" desc="Review and approve overnight stay" icon={Moon}            href="/dashboard/warden/night-out" />
            <ActionCard title="Overdue alerts"     desc="Students past expected return"     icon={Bell}            href="/dashboard/warden/overdue" />
          </div>
        </div>
        <ActivityPanel
          title="Recent movements"
          emptyIcon={ClipboardList}
          emptyMessage={"No movements today.\nStudent exits will appear here."}
          ctaLabel="View movement log"
          ctaHref="/dashboard/warden/movements"
        />
      </div>

      <InfoStrip
        color="amber"
        message="All students currently accounted for"
        sub="Overdue alerts fire automatically when students exceed expected return time."
        ctaLabel="View hostel rules"
        ctaHref="/dashboard/warden/rules"
      />
    </div>
  );
}
