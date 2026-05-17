'use client';

/**
 * components/dashboards/ReceptionistDashboard.tsx
 *
 * Task 22.2 — Receptionist dashboard.
 * Shows today's visitor registrations, pending approvals, and embeds
 * the VisitorRegistrationForm. Includes a search bar for visitors by name.
 *
 * Requirements: 2.9, 3.4, 3.11
 */

import { useState } from 'react';
import useSWR from 'swr';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
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
import VisitorRegistrationForm from '@/components/forms/VisitorRegistrationForm';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface Visitor {
  id: string;
  name: string;
  phone: string;
  purpose?: string;
  status: string;
  createdAt?: string;
  expectedArrival?: string;
}

interface VisitorsResponse {
  visitors?: Visitor[];
  data?: Visitor[];
}

// ---------------------------------------------------------------------------
// Fetcher
// ---------------------------------------------------------------------------

const fetcher = (url: string) => fetch(url).then((r) => r.json());

// ---------------------------------------------------------------------------
// Status badge variant helper
// ---------------------------------------------------------------------------

function statusVariant(status: string): 'success' | 'warning' | 'destructive' | 'secondary' {
  switch (status) {
    case 'checked_in':
    case 'checked_out':
    case 'approved':
      return 'success';
    case 'pending':
      return 'warning';
    case 'rejected':
    case 'expired':
    case 'no_show':
      return 'destructive';
    default:
      return 'secondary';
  }
}

// ---------------------------------------------------------------------------
// Visitor Table
// ---------------------------------------------------------------------------

function VisitorTable({ visitors, emptyMessage }: { visitors: Visitor[]; emptyMessage: string }) {
  return (
    <div className="rounded-lg border border-gray-200">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Name</TableHead>
            <TableHead>Phone</TableHead>
            <TableHead>Purpose</TableHead>
            <TableHead>Status</TableHead>
            <TableHead>Time</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {visitors.length === 0 ? (
            <TableRow>
              <TableCell colSpan={5} className="text-center text-gray-400">
                {emptyMessage}
              </TableCell>
            </TableRow>
          ) : (
            visitors.map((v) => (
              <TableRow key={v.id}>
                <TableCell className="font-medium">{v.name}</TableCell>
                <TableCell className="text-gray-600">{v.phone}</TableCell>
                <TableCell className="text-gray-600">{v.purpose ?? '—'}</TableCell>
                <TableCell>
                  <Badge variant={statusVariant(v.status)}>{v.status}</Badge>
                </TableCell>
                <TableCell className="text-gray-500 text-xs">
                  {v.expectedArrival
                    ? new Date(v.expectedArrival).toLocaleString()
                    : v.createdAt
                    ? new Date(v.createdAt).toLocaleString()
                    : '—'}
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

export default function ReceptionistDashboard() {
  const today = new Date().toISOString().split('T')[0];

  const { data: todayData, isLoading: loadingToday, mutate: mutateToday } = useSWR<VisitorsResponse>(
    `/api/visitors?dateFrom=${today}`,
    fetcher
  );
  const { data: pendingData, isLoading: loadingPending } = useSWR<VisitorsResponse>(
    '/api/visitors?status=pending',
    fetcher
  );

  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<Visitor[] | null>(null);
  const [searching, setSearching] = useState(false);

  const todayVisitors: Visitor[] =
    todayData?.visitors ?? (todayData?.data as Visitor[] | undefined) ?? [];
  const pendingVisitors: Visitor[] =
    pendingData?.visitors ?? (pendingData?.data as Visitor[] | undefined) ?? [];

  async function handleSearch(e: React.FormEvent) {
    e.preventDefault();
    if (!searchQuery.trim()) {
      setSearchResults(null);
      return;
    }
    setSearching(true);
    try {
      const res = await fetch(`/api/visitors?search=${encodeURIComponent(searchQuery.trim())}`);
      const data: VisitorsResponse = await res.json();
      const results: Visitor[] = data?.visitors ?? (data?.data as Visitor[] | undefined) ?? [];
      setSearchResults(results);
    } catch {
      setSearchResults([]);
    } finally {
      setSearching(false);
    }
  }

  return (
    <div className="space-y-8 p-6">
      <h1 className="text-2xl font-bold text-gray-900">Receptionist Dashboard</h1>

      {/* Search */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Search Visitors</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSearch} className="flex gap-2">
            <input
              type="text"
              placeholder="Search by visitor name…"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="flex-1 rounded-md border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <Button type="submit" disabled={searching}>
              {searching ? 'Searching…' : 'Search'}
            </Button>
            {searchResults !== null && (
              <Button
                type="button"
                variant="outline"
                onClick={() => { setSearchResults(null); setSearchQuery(''); }}
              >
                Clear
              </Button>
            )}
          </form>
          {searchResults !== null && (
            <div className="mt-4">
              <p className="mb-2 text-sm text-gray-500">
                {searchResults.length} result{searchResults.length !== 1 ? 's' : ''} found
              </p>
              <VisitorTable visitors={searchResults} emptyMessage="No visitors match your search." />
            </div>
          )}
        </CardContent>
      </Card>

      {/* Today's Registrations */}
      <div>
        <h2 className="mb-3 text-lg font-semibold text-gray-800">
          Today&apos;s Registrations
        </h2>
        {loadingToday ? (
          <p className="text-sm text-gray-500">Loading…</p>
        ) : (
          <VisitorTable visitors={todayVisitors} emptyMessage="No visitors registered today." />
        )}
      </div>

      {/* Pending Approvals */}
      <div>
        <h2 className="mb-3 text-lg font-semibold text-gray-800">Pending Approvals</h2>
        {loadingPending ? (
          <p className="text-sm text-gray-500">Loading…</p>
        ) : (
          <VisitorTable visitors={pendingVisitors} emptyMessage="No pending approvals." />
        )}
      </div>

      {/* Registration Form */}
      <div>
        <h2 className="mb-3 text-lg font-semibold text-gray-800">Register New Visitor</h2>
        <VisitorRegistrationForm onSuccess={() => mutateToday()} />
      </div>
    </div>
  );
}
