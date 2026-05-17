'use client';

/**
 * components/dashboards/PrincipalDashboard.tsx
 *
 * Task 22.7 — Principal dashboard.
 * Shows pending night-out requests (hod_approved) with approve/reject buttons.
 *
 * Requirements: 2.3, 5.14, 5.15
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

interface NightOutRequest {
  id: string;
  studentName?: string;
  reason?: string;
  destinationAddress?: string;
  departureDatetime?: string;
  expectedReturnDatetime?: string;
  status: string;
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
// Reject Modal
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
        <h2 className="mb-4 text-lg font-semibold">Reject Night-Out Request</h2>
        <div>
          <label className="block text-sm font-medium text-gray-700">
            Rejection Reason
          </label>
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

export default function PrincipalDashboard() {
  const {
    data,
    isLoading,
    mutate,
  } = useSWR<NightOutResponse>(
    '/api/hostel/night-out?status=hod_approved',
    fetcher
  );

  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [rejectTargetId, setRejectTargetId] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  const requests: NightOutRequest[] =
    data?.nightOutRequests ?? (data?.data as NightOutRequest[] | undefined) ?? [];

  async function approveRequest(id: string) {
    setActionLoading(id);
    setActionError(null);
    try {
      const res = await fetch(`/api/hostel/night-out/${id}/approve`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({}),
      });
      if (!res.ok) {
        const d = await res.json();
        setActionError(d?.message ?? 'Failed to approve request.');
        return;
      }
      mutate();
    } catch {
      setActionError('Network error.');
    } finally {
      setActionLoading(null);
    }
  }

  async function rejectRequest(id: string, reason: string) {
    setActionLoading(id);
    setActionError(null);
    try {
      const res = await fetch(`/api/hostel/night-out/${id}/reject`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reason }),
      });
      if (!res.ok) {
        const d = await res.json();
        setActionError(d?.message ?? 'Failed to reject request.');
        return;
      }
      mutate();
    } catch {
      setActionError('Network error.');
    } finally {
      setActionLoading(null);
      setRejectTargetId(null);
    }
  }

  return (
    <div className="space-y-8 p-6">
      <h1 className="text-2xl font-bold text-gray-900">Principal Dashboard</h1>

      {actionError && (
        <div className="rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {actionError}
        </div>
      )}

      <div>
        <h2 className="mb-3 text-lg font-semibold text-gray-800">
          Pending Night-Out Approvals (HOD Approved)
        </h2>

        {isLoading ? (
          <p className="text-sm text-gray-500">Loading…</p>
        ) : (
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
                      <TableCell className="font-medium">
                        {r.studentName ?? '—'}
                      </TableCell>
                      <TableCell className="text-gray-600">{r.reason ?? '—'}</TableCell>
                      <TableCell className="text-gray-600">
                        {r.destinationAddress ?? '—'}
                      </TableCell>
                      <TableCell className="text-xs text-gray-500">
                        {r.departureDatetime
                          ? new Date(r.departureDatetime).toLocaleString()
                          : '—'}
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
                            onClick={() => approveRequest(r.id)}
                          >
                            Approve
                          </Button>
                          <Button
                            size="sm"
                            variant="destructive"
                            disabled={actionLoading === r.id}
                            onClick={() => setRejectTargetId(r.id)}
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

      {rejectTargetId && (
        <RejectModal
          onConfirm={(reason) => rejectRequest(rejectTargetId, reason)}
          onClose={() => setRejectTargetId(null)}
          loading={actionLoading !== null}
        />
      )}
    </div>
  );
}
