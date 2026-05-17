'use client';

/**
 * components/dashboards/AdminDashboard.tsx
 *
 * Task 22.1 — Admin dashboard for super_admin and branch_admin roles.
 * Shows cross-branch (or branch-scoped) stats and a user management table.
 *
 * Requirements: 2.1, 2.2
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

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface StatResponse {
  total?: number;
  data?: unknown[];
}

interface User {
  id: string;
  name: string;
  email: string;
  role: string;
  isActive: boolean;
}

interface UsersResponse {
  users?: User[];
  data?: User[];
}

// ---------------------------------------------------------------------------
// Fetcher
// ---------------------------------------------------------------------------

const fetcher = (url: string) => fetch(url).then((r) => r.json());

// ---------------------------------------------------------------------------
// Stat Card
// ---------------------------------------------------------------------------

function StatCard({ title, value, loading }: { title: string; value: number | undefined; loading: boolean }) {
  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium text-gray-500">{title}</CardTitle>
      </CardHeader>
      <CardContent>
        <p className="text-3xl font-bold text-gray-900">
          {loading ? '—' : (value ?? 0)}
        </p>
      </CardContent>
    </Card>
  );
}

// ---------------------------------------------------------------------------
// Edit User Modal (inline)
// ---------------------------------------------------------------------------

interface EditUserModalProps {
  user: User;
  onClose: () => void;
  onSaved: () => void;
}

function EditUserModal({ user, onClose, onSaved }: EditUserModalProps) {
  const [name, setName] = useState(user.name);
  const [role, setRole] = useState(user.role);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const roles = [
    'super_admin', 'branch_admin', 'principal', 'hod', 'faculty',
    'warden', 'security_head', 'watchman', 'receptionist', 'student',
  ];

  async function handleSave() {
    setSaving(true);
    setError(null);
    try {
      const res = await fetch(`/api/users/${user.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, role }),
      });
      if (!res.ok) {
        const data = await res.json();
        setError(data?.message ?? 'Failed to update user.');
        return;
      }
      onSaved();
      onClose();
    } catch {
      setError('Network error. Please try again.');
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
      <div className="w-full max-w-md rounded-lg bg-white p-6 shadow-xl">
        <h2 className="mb-4 text-lg font-semibold">Edit User</h2>
        {error && <p className="mb-3 text-sm text-red-600">{error}</p>}
        <div className="space-y-3">
          <div>
            <label className="block text-sm font-medium text-gray-700">Name</label>
            <input
              className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">Role</label>
            <select
              className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              value={role}
              onChange={(e) => setRole(e.target.value)}
            >
              {roles.map((r) => (
                <option key={r} value={r}>{r}</option>
              ))}
            </select>
          </div>
        </div>
        <div className="mt-5 flex justify-end gap-2">
          <Button variant="outline" onClick={onClose} disabled={saving}>Cancel</Button>
          <Button onClick={handleSave} disabled={saving}>
            {saving ? 'Saving…' : 'Save'}
          </Button>
        </div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Main Component
// ---------------------------------------------------------------------------

export default function AdminDashboard() {
  const { data: activeVisitorsData, isLoading: loadingVisitors } = useSWR<StatResponse>(
    '/api/visitors?status=checked_in&limit=1',
    fetcher
  );
  const { data: openPassesData, isLoading: loadingPasses } = useSWR<StatResponse>(
    '/api/gate-passes?status=approved&limit=1',
    fetcher
  );
  const { data: pendingApprovalsData, isLoading: loadingPending } = useSWR<StatResponse>(
    '/api/gate-passes?status=pending&limit=1',
    fetcher
  );
  const {
    data: usersData,
    isLoading: loadingUsers,
    mutate: mutateUsers,
  } = useSWR<UsersResponse>('/api/users', fetcher);

  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  const users: User[] = usersData?.users ?? (usersData?.data as User[] | undefined) ?? [];

  async function handleDelete(userId: string) {
    if (!confirm('Delete this user? This action cannot be undone.')) return;
    setDeletingId(userId);
    setDeleteError(null);
    try {
      const res = await fetch(`/api/users/${userId}`, { method: 'DELETE' });
      if (!res.ok) {
        const data = await res.json();
        setDeleteError(data?.message ?? 'Failed to delete user.');
        return;
      }
      mutateUsers();
    } catch {
      setDeleteError('Network error. Please try again.');
    } finally {
      setDeletingId(null);
    }
  }

  return (
    <div className="space-y-8 p-6">
      <h1 className="text-2xl font-bold text-gray-900">Admin Dashboard</h1>

      {/* Stats */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <StatCard
          title="Active Visitors"
          value={activeVisitorsData?.total}
          loading={loadingVisitors}
        />
        <StatCard
          title="Open Gate Passes"
          value={openPassesData?.total}
          loading={loadingPasses}
        />
        <StatCard
          title="Pending Approvals"
          value={pendingApprovalsData?.total}
          loading={loadingPending}
        />
      </div>

      {/* User Management */}
      <div>
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-gray-800">User Management</h2>
          <Button size="sm" onClick={() => alert('Create user — connect to your user creation flow')}>
            + Create User
          </Button>
        </div>

        {deleteError && (
          <p className="mb-3 text-sm text-red-600">{deleteError}</p>
        )}

        {loadingUsers ? (
          <p className="text-sm text-gray-500">Loading users…</p>
        ) : (
          <div className="rounded-lg border border-gray-200">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Role</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {users.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center text-gray-400">
                      No users found.
                    </TableCell>
                  </TableRow>
                ) : (
                  users.map((user) => (
                    <TableRow key={user.id}>
                      <TableCell className="font-medium">{user.name}</TableCell>
                      <TableCell className="text-gray-600">{user.email}</TableCell>
                      <TableCell>
                        <Badge variant="secondary">{user.role}</Badge>
                      </TableCell>
                      <TableCell>
                        <Badge variant={user.isActive ? 'success' : 'destructive'}>
                          {user.isActive ? 'Active' : 'Inactive'}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-2">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => setEditingUser(user)}
                          >
                            Edit
                          </Button>
                          <Button
                            size="sm"
                            variant="destructive"
                            disabled={deletingId === user.id}
                            onClick={() => handleDelete(user.id)}
                          >
                            {deletingId === user.id ? '…' : 'Delete'}
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

      {/* Edit Modal */}
      {editingUser && (
        <EditUserModal
          user={editingUser}
          onClose={() => setEditingUser(null)}
          onSaved={() => mutateUsers()}
        />
      )}
    </div>
  );
}
