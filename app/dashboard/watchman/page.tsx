'use client';

import { useSession } from 'next-auth/react';
import { useState } from 'react';
import { QrCode, CheckCircle2, XCircle, Clock } from 'lucide-react';
import { HeroBar, StatCard, InfoStrip } from '@/components/dashboard/DashboardShell';

export default function WatchmanDashboard() {
  const { data: session } = useSession();
  const name = session?.user?.name ?? 'Watchman';
  const [passId, setPassId] = useState('');
  const [scanResult, setScanResult] = useState<null | 'success' | 'fail'>(null);

  function handleValidate() {
    if (!passId.trim()) return;
    setScanResult(passId.length > 5 ? 'success' : 'fail');
  }

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      <HeroBar
        gradient="from-orange-950 to-orange-900"
        title="Gate Watchman"
        subtitle={`Welcome, ${name}. Scan or validate QR codes to log gate entry and exit.`}
        statusBadge={{ label: 'Gate active', color: 'bg-green-500/20 text-green-400 border border-green-500/30' }}
      />

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard label="Scans today" value="0" sub="Total scan events"    icon={QrCode}       bg="bg-orange-50" iconColor="text-orange-500" border="border-orange-100" valueColor="text-orange-700" />
        <StatCard label="Successful"  value="0" sub="Valid passes scanned" icon={CheckCircle2} bg="bg-green-50"  iconColor="text-green-600" border="border-green-100"  valueColor="text-green-700" />
        <StatCard label="Rejected"    value="0" sub="Invalid or expired"   icon={XCircle}      bg="bg-red-50"    iconColor="text-red-500"   border="border-red-100"    valueColor="text-red-700" />
        <StatCard label="Last scan"   value="—" sub="No scans yet today"   icon={Clock}        bg="bg-slate-50"  iconColor="text-slate-400" border="border-slate-100"  valueColor="text-slate-500" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="bg-white rounded-xl border border-slate-200 p-6 flex flex-col items-center">
          <h2 className="text-sm font-medium text-slate-700 self-start mb-5">QR code scanner</h2>
          <div className="w-56 h-56 bg-slate-50 border-2 border-dashed border-slate-300 rounded-2xl flex flex-col items-center justify-center gap-3 cursor-pointer hover:bg-orange-50 hover:border-orange-400 transition">
            <QrCode className="w-14 h-14 text-slate-300" />
            <p className="text-sm font-medium text-slate-400">Tap to scan QR code</p>
            <p className="text-xs text-slate-400">Gate pass or visitor pass</p>
          </div>
          <div className="w-full mt-5">
            <p className="text-xs text-slate-400 text-center mb-3">Or enter pass ID manually</p>
            <div className="flex gap-2">
              <input
                type="text"
                value={passId}
                onChange={e => { setPassId(e.target.value); setScanResult(null); }}
                placeholder="Enter pass ID..."
                className="flex-1 border border-slate-200 rounded-lg px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400 focus:border-transparent"
              />
              <button
                onClick={handleValidate}
                className="bg-orange-600 hover:bg-orange-700 text-white text-sm font-medium px-4 py-2 rounded-lg transition"
              >
                Validate
              </button>
            </div>
            {scanResult === 'success' && (
              <div className="mt-3 flex items-center gap-2 bg-green-50 border border-green-200 rounded-lg px-4 py-2.5">
                <CheckCircle2 className="w-4 h-4 text-green-600" />
                <p className="text-sm text-green-700 font-medium">Pass valid — entry permitted</p>
              </div>
            )}
            {scanResult === 'fail' && (
              <div className="mt-3 flex items-center gap-2 bg-red-50 border border-red-200 rounded-lg px-4 py-2.5">
                <XCircle className="w-4 h-4 text-red-500" />
                <p className="text-sm text-red-700 font-medium">Invalid pass — entry denied</p>
              </div>
            )}
          </div>
        </div>

        <div className="bg-white rounded-xl border border-slate-200 p-5">
          <h2 className="text-sm font-medium text-slate-700 mb-4">Today&apos;s scan log</h2>
          <div className="flex flex-col items-center justify-center py-12 gap-3">
            <div className="w-12 h-12 bg-slate-50 rounded-full flex items-center justify-center">
              <Clock className="w-6 h-6 text-slate-300" />
            </div>
            <p className="text-sm text-slate-400 text-center">No scans yet today.<br />Events will appear here after scanning.</p>
          </div>
        </div>
      </div>

      <InfoStrip
        color="amber"
        message="Always validate before allowing entry or exit"
        sub="Only green results mean the pass is valid. Red or expired passes must be denied."
        ctaLabel="View scan guide"
        ctaHref="/dashboard/watchman/guide"
      />
    </div>
  );
}
