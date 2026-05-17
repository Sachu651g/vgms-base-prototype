'use client';

/**
 * components/dashboards/HodDashboard.tsx
 *
 * Task 22.3 — HOD dashboard.
 * Shows pending gate pass requests and pending night-out requests with
 * Approve/Reject actions.
 *
 * Requirements: 2.4, 4.6, 4.7, 5.13
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

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface GatePass {
  id: string;
  studentName?: string;
  reason?: string;
  destination?: string;
  requestedTimeOut?: string;
  requestedTimeIn?: string;
  status: string;
  createdAt?: string;
}

interface NightOutRequest {
  id: string;
  studentName?: string;
  reason?: string;
  destinationAddress?: string;
  departureDatetime?: string;
  expectedReturnDatetime?: string;
  status: string;
}

interface GatePassesResponse {
  gatePasses?: GatePass[];
  data?: GatePass[];
}

interface NightOutResponse {
  nightOutRequests?: NightOutRequest[];
  data?: NightOutRequest[];
}

// ---------------------------------------------------------------------------
// Fetcher
// ---------------------------------------------------------------------------

const fetcher = (url: string) => fetch(url).then((r) => r.json());

// ---------------------------------------------------------------------------
// Reject Reason Modal
// ---------------------------------------------------------------------------

interface RejectModalProps {
  title: string;
  onConfirm: (reason: string) => void;
  onClose: () => void;
  loading: boolean;
}

function RejectModal({ title, onConfirm, onClose, loading }: RejectModalProps) {
  const [reason, setReason] = useState('');

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
      <div className="w-full max-w-md rounded-lg bg-white p-6 shadow-xl">
        <h2 className="mb-4 text-lg font-semibold">{title}</h2>
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
          <Button variant="outline" onClick={onClose} disabled={loading}>Cancel</Button>
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
// Gate Pass Table
// ---------------------------------------------------------------------------

function GatePassTable({
  passes,
  onApprove,
  onReject,
  actionLoading,
}: {
  passes: GatePass[];
  onApprove: (id: string) => void;
  onReject: (id: string) => void;
  actionLoading: string | null;
}) {
  return (
    <div className="rounded-lg border border-gray-200">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Student</TableHead>
            <TableHead>Reason</TableHead>
            <TableHead>Destination</TableHead>
            <TableHead>Time Out</TableHead>
            <TableHead>Time In</TableHead>
            <TableHead>Status</TableHead>
            <TableHead className="text-right">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {passes.length === 0 ? (
            <TableRow>
              <TableCell colSpan={7} className="text-center text-gray-400">
                No pending gate pass requests.
              </TableCell>
            </TableRow>
          ) : (
            passes.map((p) => (
              <TableRow key={p.id}>
                <TableCell className="font-medium">{p.studentName ?? '—'}</TableCell>
                <TableCell className="text-gray-600">{p.reason ?? '—'}</TableCell>
                <TableCell className="text-gray-600">{p.destination ?? '—'}</TableCell>
                <TableCell className="text-xs text-gray-500">
                  {p.requestedTimeOut ? new Date(p.requestedTimeOut).toLocaleString() : '—'}
                </TableCell>
                <TableCell className="text-xs text-gray-500">
                  {p.requestedTimeIn ? new Date(p.requestedTimeIn).toLocaleString() : '—'}
                </TableCell>
                <TableCell>
                  <Badge variant="warning">{p.status}</Badge>
                </TableCell>
                <TableCell className="text-right">
                  <div className="flex justify-end gap-2">
                    <Button
                      size="sm"
                      disabled={actionLoading === p.id}
                      onClick={() => onApprove(p.id)}
                    >
                      Approve
                    </Button>
                    <Button
                      size="sm"
                      variant="destructive"
                      disabled={actionLoading === p.id}
                      onClick={() => onReject(p.id)}
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
  );
}

// ---------------------------------------------------------------------------
// Night-Out Table
// ---------------------------------------------------------------------------

function NightOutTable({
  requests,
  onApprove,
  onReject,
  actionLoading,
}: {
  requests: NightOutRequest[];
  onApprove: (id: string) => void;
  onReject: (id: string) => void;
  actionLoading: string | null;
}) {
  return (
    <div className="rounded-lg border border-gray-200">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Student</TableHead>
            <TableHead>Reason</TableHead>
            <TableHead>Destination</TableHead>
            <TableHead>Departure</TableHead>
            <TableHead>Expected Return</TableHead>
            <TableHead>Status</TableHead>
            <TableHead className="text-right">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {requests.length === 0 ? (
            <TableRow>
              <TableCell colSpan={7} className="text-center text-gray-400">
                No pending night-out requests.
              </TableCell>
            </TableRow>
          ) : (
            requests.map((r) => (
              <TableRow key={r.id}>
                <TableCell className="font-medium">{r.studentName ?? '—'}</TableCell>
                <TableCell className="text-gray-600">{r.reason ?? '—'}</TableCell>
                <TableCell className="text-gray-600">{r.destinationAddress ?? '—'}</TableCell>
                <TableCell className="text-xs text-gray-500">
                  {r.departureDatetime ? new Date(r.departureDatetime).toLocaleString() : '—'}
                </TableCell>
                <TableCell className="text-xs text-gray-500">
                  {r.expectedReturnDatetime
                    ? new Date(r.expectedReturnDatetime).toLocaleString()
                    : '—'}
                </TableCell>
                <TableCell>
                  <Badge variant="warning">{r.status}</Badge>
                </TableCell>
                <TableCell className="text-right">
                  <div className="flex justify-end gap-2">
                    <Button
                      size="sm"
                      disabled={actionLoading === r.id}
                      onClick={() => onApprove(r.id)}
                    >
                      Approve
                    </Button>
                    <Button
                      size="sm"
                      variant="destructive"
                      disabled={actionLoading === r.id}
                      onClick={() => onReject(r.id)}
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
  );
}

// ---------------------------------------------------------------------------
// Main Component
// ---------------------------------------------------------------------------

export default function HodDashboard() {
  const {
    data: gatePassData,
    isLoading: loadingPasses,
    mutate: mutatePasses,
  } = useSWR<GatePassesResponse>('/api/gate-passes?status=pending', fetcher);

  const {
    data: nightOutData,
    isLoading: loadingNightOut,
    mutate: mutateNightOut,
  } = useSWR<NightOutResponse>('/api/hostel/night-out?status=warden_approved', fetcher);

  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [rejectTarget, setRejectTarget] = useState<{ id: string; type: 'gate_pass' | 'night_out' } | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  const gatePasses: GatePass[] =
    gatePassData?.gatePasses ?? (gatePassData?.data as GatePass[] | undefined) ?? [];
  const nightOutRequests: NightOutRequest[] =
    nightOutData?.nightOutRequests ?? (nightOutData?.data as NightOutRequest[] | undefined) ?? [];

  async function approveGatePass(id: string) {
    setActionLoading(id);
    setActionError(null);
    try {
      const res = await fetch(`/api/gate-passes/${id}/approve`, { method: 'PUT' });
      if (!res.ok) {
        const data = await res.json();
        setActionError(data?.message ?? 'Failed to approve gate pass.');
        return;
      }
      mutatePasses();
    } catch {
      setActionError('Network error.');
    } finally {
      setActionLoading(null);
    }
  }

  async function rejectGatePass(id: string, reason: string) {
    setActionLoading(id);
    setActionError(null);
    try {
      const res = await fetch(`/api/gate-passes/${id}/reject`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reason }),
      });
      if (!res.ok) {
        const data = await res.json();
        setActionError(data?.message ?? 'Failed to reject gate pass.');
        return;
      }
      mutatePasses();
    } catch {
      setActionError('Network error.');
    } finally {
      setActionLoading(null);
      setRejectTarget(null);
    }
  }

  async function approveNightOut(id: string) {
    setActionLoading(id);
    setActionError(null);
    try {
      const res = await fetch(`/api/hostel/night-out/${id}/approve`, { method: 'PUT' });
      if (!res.ok) {
        const data = await res.json();
        setActionError(data?.message ?? 'Failed to approve night-out request.');
        return;
      }
      mutateNightOut();
    } catch {
      setActionError('Network error.');
    } finally {
      setActionLoading(null);
    }
  }

  async function rejectNightOut(id: string, reason: string) {
    setActionLoading(id);
    setActionError(null);
    try {
      const res = await fetch(`/api/hostel/night-out/${id}/reject`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reason }),
      });
      if (!res.ok) {
        const data = await res.json();
        setActionError(data?.message ?? 'Failed to reject night-out request.');
        return;
      }
      mutateNightOut();
    } catch {
      setActionError('Network error.');
    } finally {
      setActionLoading(null);
      setRejectTarget(null);
    }
  }

  function handleRejectConfirm(reason: string) {
    if (!rejectTarget) return;
    if (rejectTarget.type === 'gate_pass') {
      rejectGatePass(rejectTarget.id, reason);
    } else {
      rejectNightOut(rejectTarget.id, reason);
    }
  }

  return (
    <div className="space-y-8 p-6">
      <h1 className="text-2xl font-bold text-gray-900">HOD Dashboard</h1>

      {actionError && (
        <div className="rounded-md bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700">
          {actionError}
        </div>
      )}

      {/* Gate Pass Requests */}
      <div>
        <h2 className="mb-3 text-lg font-semibold text-gray-800">
          Pending Gate Pass Requests
        </h2>
        {loadingPasses ? (
          <p className="text-sm text-gray-500">Loading…</p>
        ) : (
          <GatePassTable
            passes={gatePasses}
            onApprove={approveGatePass}
            onReject={(id) => setRejectTarget({ id, type: 'gate_pass' })}
            actionLoading={actionLoading}
          />
        )}
      </div>

      {/* Night-Out Requests */}
      <div>
        <h2 className="mb-3 text-lg font-semibold text-gray-800">
          Pending Night-Out Requests (Warden Approved)
        </h2>
        {loadingNightOut ? (
          <p className="text-sm text-gray-500">Loading…</p>
        ) : (
          <NightOutTable
            requests={nightOutRequests}
            onApprove={approveNightOut}
            onReject={(id) => setRejectTarget({ id, type: 'night_out' })}
            actionLoading={actionLoading}
          />
        )}
      </div>

      {/* Reject Modal */}
      {rejectTarget && (
        <RejectModal
          title={
            rejectTarget.type === 'gate_pass'
              ? 'Reject Gate Pass Request'
              : 'Reject Night-Out Request'
          }
          onConfirm={handleRejectConfirm}
          onClose={() => setRejectTarget(null)}
          loading={actionLoading !== null}
        />
      )}
    </div>
  );
}
