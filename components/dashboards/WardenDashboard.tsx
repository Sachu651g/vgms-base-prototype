'use client';

/**
 * components/dashboards/WardenDashboard.tsx
 *
 * Tasks 22.4 + 23 — Warden dashboard with hostel status stats,
 * movement approval queue, and night-out status widget.
 *
 * Requirements: 2.6, 5.2, 5.3, 5.6, 5.21
 */

import { useState } from 'react';
import useSWR from 'swr';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface HostelStatus {
  totalResidents?: number;
  currentlyIn?: number;
  currentlyOut?: number;
  overdueReturns?: number;
  nightOutPending?: number;
  nightOutDeparted?: number;
  nightOutOverdue?: number;
}

interface Movement {
  id: string;
  studentName?: string;
  destination?: string;
  reason?: string;
  expectedDeparture?: string;
  expectedReturn?: string;
  status: string;
}

interface MovementsResponse {
  movements?: Movement[];
  data?: Movement[];
}

// ---------------------------------------------------------------------------
// Fetcher
// ---------------------------------------------------------------------------

const fetcher = (url: string) => fetch(url).then((r) => r.json());

// ---------------------------------------------------------------------------
// Stat Card
// ---------------------------------------------------------------------------

function StatCard({
  title,
  value,
  loading,
  highlight,
}: {
  title: string;
  value: number | undefined;
  loading: boolean;
  highlight?: boolean;
}) {
  return (
    <Card className={highlight && (value ?? 0) > 0 ? 'border-red-300 bg-red-50' : ''}>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium text-gray-500">{title}</CardTitle>
      </CardHeader>
      <CardContent>
        <p
          className={`text-3xl font-bold ${
            highlight && (value ?? 0) > 0 ? 'text-red-700' : 'text-gray-900'
          }`}
        >
          {loading ? '—' : (value ?? 0)}
        </p>
      </CardContent>
    </Card>
  );
}

// ---------------------------------------------------------------------------
// Night-Out Widget (Task 23)
// ---------------------------------------------------------------------------

function NightOutWidget({ status, loading }: { status: HostelStatus | undefined; loading: boolean }) {
  const pending = status?.nightOutPending ?? 0;
  const departed = status?.nightOutDeparted ?? 0;
  const overdue = status?.nightOutOverdue ?? 0;

  return (
    <div>
      <h2 className="mb-3 text-lg font-semibold text-gray-800">Night-Out Status</h2>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        {/* Pending Approvals */}
        <div className="rounded-lg border border-blue-200 bg-blue-50 p-4">
          <p className="text-sm font-medium text-blue-700">Pending Approvals</p>
          <p className="mt-1 text-3xl font-bold text-blue-900">
            {loading ? '—' : pending}
          </p>
        </div>

        {/* Departed (Out Now) */}
        <div className="rounded-lg border border-yellow-200 bg-yellow-50 p-4">
          <p className="text-sm font-medium text-yellow-700">Departed (Out Now)</p>
          <p className="mt-1 text-3xl font-bold text-yellow-900">
            {loading ? '—' : departed}
          </p>
        </div>

        {/* Overdue Returns */}
        <div
          className={`rounded-lg border p-4 ${
            overdue > 0
              ? 'border-red-300 bg-red-100'
              : 'border-gray-200 bg-gray-50'
          }`}
        >
          <p
            className={`text-sm font-medium ${
              overdue > 0 ? 'text-red-700' : 'text-gray-600'
            }`}
          >
            Overdue Returns
          </p>
          <p
            className={`mt-1 text-3xl font-bold ${
              overdue > 0 ? 'text-red-900' : 'text-gray-700'
            }`}
          >
            {loading ? '—' : overdue}
          </p>
        </div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Reject Reason Modal
// ---------------------------------------------------------------------------

interface RejectModalProps {
  onConfirm: (reason: string) => void;
  onClose: () => void;
  loading: boolean;
}

function RejectModal({ onConfirm, onClose, loading }: RejectModalProps) {
  const [reason, setReason] = useState('');

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
      <div className="w-full max-w-md rounded-lg bg-white p-6 shadow-xl">
        <h2 className="mb-4 text-lg font-semibold">Reject Movement Request</h2>
        <div>
          <label className="block text-sm font-medium text-gray-700">Rejection Reason</label>
          <textarea
            className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            rows={3}
            placeholder="Enter reason for rejection…"
            value={reason}
            onChange={(e) => setReason(e.target.value)}
          />
        </div>
        <div className="mt-4 flex justify-end gap-2">
          <Button variant="outline" onClick={onClose} disabled={loading}>
            Cancel
          </Button>
          <Button
            variant="destructive"
            disabled={loading || !reason.trim()}
            onClick={() => onConfirm(reason.trim())}
          >
            {loading ? 'Rejecting…' : 'Reject'}
          </Button>
        </div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Main Component
// ---------------------------------------------------------------------------

export default function WardenDashboard() {
  // Hostel status — 30s refresh
  const {
    data: statusData,
    isLoading: loadingStatus,
  } = useSWR<HostelStatus>('/api/hostel/status', fetcher, {
    refreshInterval: 30000,
  });

  // Pending movements
  const {
    data: movementsData,
    isLoading: loadingMovements,
    mutate: mutateMovements,
  } = useSWR<MovementsResponse>('/api/hostel/movements?status=pending', fetcher, {
    refreshInterval: 30000,
  });

  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [rejectTargetId, setRejectTargetId] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  const movements: Movement[] =
    movementsData?.movements ?? (movementsData?.data as Movement[] | undefined) ?? [];

  async function approveMovement(id: string) {
    setActionLoading(id);
    setActionError(null);
    try {
      const res = await fetch(`/api/hostel/movements/${id}/approve`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({}),
      });
      if (!res.ok) {
        const data = await res.json();
        setActionError(data?.message ?? 'Failed to approve movement.');
        return;
      }
      mutateMovements();
    } catch {
      setActionError('Network error.');
    } finally {
      setActionLoading(null);
    }
  }

  async function rejectMovement(id: string, reason: string) {
    setActionLoading(id);
    setActionError(null);
    try {
      const res = await fetch(`/api/hostel/movements/${id}/reject`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reason }),
      });
      if (!res.ok) {
        const data = await res.json();
        setActionError(data?.message ?? 'Failed to reject movement.');
        return;
      }
      mutateMovements();
    } catch {
      setActionError('Network error.');
    } finally {
      setActionLoading(null);
      setRejectTargetId(null);
    }
  }

  return (
    <div className="space-y-8 p-6">
      <h1 className="text-2xl font-bold text-gray-900">Warden Dashboard</h1>

      {actionError && (
        <div className="rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {actionError}
        </div>
      )}

      {/* Hostel Status Stats */}
      <div>
        <h2 className="mb-3 text-lg font-semibold text-gray-800">Hostel Status</h2>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <StatCard
            title="Total Residents"
            value={statusData?.totalResidents}
            loading={loadingStatus}
          />
          <StatCard
            title="Currently In"
            value={statusData?.currentlyIn}
            loading={loadingStatus}
          />
          <StatCard
            title="Currently Out"
            value={statusData?.currentlyOut}
            loading={loadingStatus}
          />
          <StatCard
            title="Overdue Returns"
            value={statusData?.overdueReturns}
            loading={loadingStatus}
            highlight
          />
        </div>
      </div>

      {/* Night-Out Widget (Task 23) */}
      <NightOutWidget status={statusData} loading={loadingStatus} />

      {/* Movement Approval Queue */}
      <div>
        <h2 className="mb-3 text-lg font-semibold text-gray-800">
          Pending Movement Approvals
        </h2>
        {loadingMovements ? (
          <p className="text-sm text-gray-500">Loading…</p>
        ) : (
          <div className="rounded-lg border border-gray-200">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Student</TableHead>
                  <TableHead>Destination</TableHead>
                  <TableHead>Reason</TableHead>
                  <TableHead>Expected Departure</TableHead>
                  <TableHead>Expected Return</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {movements.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center text-gray-400">
                      No pending movement requests.
                    </TableCell>
                  </TableRow>
                ) : (
                  movements.map((m) => (
                    <TableRow key={m.id}>
                      <TableCell className="font-medium">{m.studentName ?? '—'}</TableCell>
                      <TableCell className="text-gray-600">{m.destination ?? '—'}</TableCell>
                      <TableCell className="text-gray-600">{m.reason ?? '—'}</TableCell>
                      <TableCell className="text-xs text-gray-500">
                        {m.expectedDeparture
                          ? new Date(m.expectedDeparture).toLocaleString()
                          : '—'}
                      </TableCell>
                      <TableCell className="text-xs text-gray-500">
                        {m.expectedReturn
                          ? new Date(m.expectedReturn).toLocaleString()
                          : '—'}
                      </TableCell>
                      <TableCell>
                        <Badge variant="warning">{m.status}</Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-2">
                          <Button
                            size="sm"
                            disabled={actionLoading === m.id}
                            onClick={() => approveMovement(m.id)}
                          >
                            Approve
                          </Button>
                          <Button
                            size="sm"
                            variant="destructive"
                            disabled={actionLoading === m.id}
                            onClick={() => setRejectTargetId(m.id)}
                          >
                            Reject
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        )}
      </div>

      {/* Reject Modal */}
      {rejectTargetId && (
        <RejectModal
          onConfirm={(reason) => rejectMovement(rejectTargetId, reason)}
          onClose={() => setRejectTargetId(null)}
          loading={actionLoading !== null}
        />
      )}
    </div>
  );
}
