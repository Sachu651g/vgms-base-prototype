'use client';

/**
 * components/dashboards/StudentDashboard.tsx
 *
 * Task 22.6 — Student dashboard.
 * Tabs: My Passes | Request Pass | Hostel Movement | Night Out
 *
 * Requirements: 2.10, 4.11, 4.12
 */

import { useState } from 'react';
import useSWR from 'swr';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import QRCodeDisplay from '@/components/qr/QRCodeDisplay';
import GatePassRequestForm from '@/components/forms/GatePassRequestForm';
import HostelMovementForm from '@/components/forms/HostelMovementForm';
import NightOutRequestForm from '@/components/forms/NightOutRequestForm';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type TabId = 'passes' | 'request' | 'hostel' | 'nightout';

interface GatePass {
  id: string;
  reason?: string;
  destination?: string;
  requestedTimeOut?: string;
  requestedTimeIn?: string;
  status: string;
  qrPayload?: string;
  createdAt?: string;
}

interface GatePassesResponse {
  gatePasses?: GatePass[];
  data?: GatePass[];
}

// ---------------------------------------------------------------------------
// Fetcher
// ---------------------------------------------------------------------------

const fetcher = (url: string) => fetch(url).then((r) => r.json());

// ---------------------------------------------------------------------------
// Status badge variant helper
// ---------------------------------------------------------------------------

function statusVariant(
  status: string
): 'success' | 'warning' | 'destructive' | 'secondary' {
  switch (status) {
    case 'approved':
    case 'returned':
    case 'used':
      return 'success';
    case 'pending':
    case 'exited':
      return 'warning';
    case 'rejected':
    case 'cancelled':
    case 'expired':
      return 'destructive';
    default:
      return 'secondary';
  }
}

// ---------------------------------------------------------------------------
// My Passes Tab
// ---------------------------------------------------------------------------

function MyPassesTab() {
  const {
    data,
    isLoading,
    mutate,
  } = useSWR<GatePassesResponse>('/api/gate-passes', fetcher);

  const [cancellingId, setCancellingId] = useState<string | null>(null);
  const [cancelError, setCancelError] = useState<string | null>(null);

  const passes: GatePass[] =
    data?.gatePasses ?? (data?.data as GatePass[] | undefined) ?? [];

  async function handleCancel(id: string) {
    if (!confirm('Cancel this gate pass request?')) return;
    setCancellingId(id);
    setCancelError(null);
    try {
      const res = await fetch(`/api/gate-passes/${id}`, { method: 'DELETE' });
      if (!res.ok) {
        const d = await res.json();
        setCancelError(d?.message ?? 'Failed to cancel pass.');
        return;
      }
      mutate();
    } catch {
      setCancelError('Network error. Please try again.');
    } finally {
      setCancellingId(null);
    }
  }

  if (isLoading) {
    return <p className="text-sm text-gray-500">Loading passes…</p>;
  }

  return (
    <div className="space-y-4">
      {cancelError && (
        <div className="rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {cancelError}
        </div>
      )}

      <div className="rounded-lg border border-gray-200">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Reason</TableHead>
              <TableHead>Destination</TableHead>
              <TableHead>Time Out</TableHead>
              <TableHead>Time In</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>QR Code</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {passes.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="text-center text-gray-400">
                  No gate passes found.
                </TableCell>
              </TableRow>
            ) : (
              passes.map((pass) => (
                <TableRow key={pass.id}>
                  <TableCell className="font-medium">{pass.reason ?? '—'}</TableCell>
                  <TableCell className="text-gray-600">{pass.destination ?? '—'}</TableCell>
                  <TableCell className="text-xs text-gray-500">
                    {pass.requestedTimeOut
                      ? new Date(pass.requestedTimeOut).toLocaleString()
                      : '—'}
                  </TableCell>
                  <TableCell className="text-xs text-gray-500">
                    {pass.requestedTimeIn
                      ? new Date(pass.requestedTimeIn).toLocaleString()
                      : '—'}
                  </TableCell>
                  <TableCell>
                    <Badge variant={statusVariant(pass.status)}>{pass.status}</Badge>
                  </TableCell>
                  <TableCell>
                    {pass.status === 'approved' && pass.qrPayload ? (
                      <QRCodeDisplay encryptedPayload={pass.qrPayload} size={80} />
                    ) : (
                      <span className="text-xs text-gray-400">—</span>
                    )}
                  </TableCell>
                  <TableCell className="text-right">
                    {pass.status === 'pending' && (
                      <Button
                        size="sm"
                        variant="destructive"
                        disabled={cancellingId === pass.id}
                        onClick={() => handleCancel(pass.id)}
                      >
                        {cancellingId === pass.id ? '…' : 'Cancel'}
                      </Button>
                    )}
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Tab definitions
// ---------------------------------------------------------------------------

const TABS: { id: TabId; label: string }[] = [
  { id: 'passes', label: 'My Passes' },
  { id: 'request', label: 'Request Pass' },
  { id: 'hostel', label: 'Hostel Movement' },
  { id: 'nightout', label: 'Night Out' },
];

// ---------------------------------------------------------------------------
// Main Component
// ---------------------------------------------------------------------------

export default function StudentDashboard() {
  const [activeTab, setActiveTab] = useState<TabId>('passes');

  return (
    <div className="space-y-6 p-6">
      <h1 className="text-2xl font-bold text-gray-900">Student Dashboard</h1>

      {/* Tab Navigation */}
      <div className="border-b border-gray-200">
        <nav className="-mb-px flex gap-6" aria-label="Dashboard tabs">
          {TABS.map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveTab(tab.id)}
              className={[
                'whitespace-nowrap border-b-2 pb-3 text-sm font-medium transition-colors',
                activeTab === tab.id
                  ? 'border-blue-600 text-blue-600'
                  : 'border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700',
              ].join(' ')}
              aria-current={activeTab === tab.id ? 'page' : undefined}
            >
              {tab.label}
            </button>
          ))}
        </nav>
      </div>

      {/* Tab Content */}
      <div>
        {activeTab === 'passes' && <MyPassesTab />}
        {activeTab === 'request' && <GatePassRequestForm />}
        {activeTab === 'hostel' && <HostelMovementForm />}
        {activeTab === 'nightout' && <NightOutRequestForm />}
      </div>
    </div>
  );
}
