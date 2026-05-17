'use client';

/**
 * components/dashboards/SecurityDashboard.tsx
 *
 * Task 22.5 — Security dashboard.
 * - watchman: QR scanner with gate location selector
 * - security_head: scan log table
 *
 * Requirements: 2.7, 2.8, 6.3, 6.5
 */

import { useState } from 'react';
import useSWR from 'swr';
import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import QRScanner from '@/components/qr/QRScanner';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface ScanLog {
  id: string;
  scannedAt?: string;
  passType?: string;
  outcome?: string;
  gateLocation?: string;
  holderName?: string;
}

interface ScanLogsResponse {
  scanLogs?: ScanLog[];
  data?: ScanLog[];
}

// ---------------------------------------------------------------------------
// Fetcher
// ---------------------------------------------------------------------------

const fetcher = (url: string) => fetch(url).then((r) => r.json());

// ---------------------------------------------------------------------------
// Gate locations
// ---------------------------------------------------------------------------

const GATE_LOCATIONS = ['Main Gate', 'Side Gate', 'Hostel Gate'] as const;
type GateLocation = (typeof GATE_LOCATIONS)[number];

// ---------------------------------------------------------------------------
// Watchman View
// ---------------------------------------------------------------------------

function WatchmanView() {
  const [selectedGate, setSelectedGate] = useState<GateLocation>('Main Gate');

  return (
    <div className="space-y-6">
      <div>
        <label
          htmlFor="gate-location-select"
          className="block text-sm font-medium text-gray-700"
        >
          Gate Location
        </label>
        <select
          id="gate-location-select"
          value={selectedGate}
          onChange={(e) => setSelectedGate(e.target.value as GateLocation)}
          className="mt-1 rounded-md border border-gray-300 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          {GATE_LOCATIONS.map((gate) => (
            <option key={gate} value={gate}>
              {gate}
            </option>
          ))}
        </select>
      </div>

      <QRScanner passType="gate_pass" gateLocation={selectedGate} />
    </div>
  );
}

// ---------------------------------------------------------------------------
// Security Head View
// ---------------------------------------------------------------------------

function SecurityHeadView() {
  const { data, isLoading } = useSWR<ScanLogsResponse>('/api/scan-logs', fetcher);

  const scanLogs: ScanLog[] =
    data?.scanLogs ?? (data?.data as ScanLog[] | undefined) ?? [];

  function outcomeVariant(
    outcome: string | undefined
  ): 'success' | 'destructive' | 'secondary' {
    if (!outcome) return 'secondary';
    if (outcome === 'success') return 'success';
    if (outcome === 'failure' || outcome === 'failed') return 'destructive';
    return 'secondary';
  }

  return (
    <div>
      <h2 className="mb-3 text-lg font-semibold text-gray-800">Scan Logs</h2>
      {isLoading ? (
        <p className="text-sm text-gray-500">Loading…</p>
      ) : (
        <div className="rounded-lg border border-gray-200">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Scanned At</TableHead>
                <TableHead>Pass Type</TableHead>
                <TableHead>Outcome</TableHead>
                <TableHead>Gate Location</TableHead>
                <TableHead>Holder</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {scanLogs.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-center text-gray-400">
                    No scan logs found.
                  </TableCell>
                </TableRow>
              ) : (
                scanLogs.map((log) => (
                  <TableRow key={log.id}>
                    <TableCell className="text-xs text-gray-500">
                      {log.scannedAt
                        ? new Date(log.scannedAt).toLocaleString()
                        : '—'}
                    </TableCell>
                    <TableCell className="text-gray-600">
                      {log.passType ?? '—'}
                    </TableCell>
                    <TableCell>
                      <Badge variant={outcomeVariant(log.outcome)}>
                        {log.outcome ?? '—'}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-gray-600">
                      {log.gateLocation ?? '—'}
                    </TableCell>
                    <TableCell className="text-gray-600">
                      {log.holderName ?? '—'}
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Main Component
// ---------------------------------------------------------------------------

interface SecurityDashboardProps {
  role: string;
}

export default function SecurityDashboard({ role }: SecurityDashboardProps) {
  return (
    <div className="space-y-8 p-6">
      <h1 className="text-2xl font-bold text-gray-900">Security Dashboard</h1>

      {role === 'watchman' ? <WatchmanView /> : <SecurityHeadView />}
    </div>
  );
}
