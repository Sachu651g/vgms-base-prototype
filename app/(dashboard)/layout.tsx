/**
 * app/(dashboard)/layout.tsx
 *
 * Task 22.7 — Shared layout for all role-specific dashboard pages.
 * Provides a header with the NotificationBell and a Sign Out button.
 *
 * Requirements: 2.1–2.11, 8.7
 */

'use client';

import { signOut } from 'next-auth/react';
import { NotificationBell } from '@/components/NotificationBell';

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="sticky top-0 z-40 border-b border-gray-200 bg-white shadow-sm">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
          {/* Brand */}
          <div className="flex items-center gap-2">
            <span className="text-lg font-bold text-gray-900">VGMS</span>
            <span className="hidden text-sm text-gray-400 sm:block">
              Visitors &amp; Gate Pass Management
            </span>
          </div>

          {/* Right side actions */}
          <div className="flex items-center gap-3">
            <NotificationBell />
            <button
              type="button"
              onClick={() => signOut({ callbackUrl: '/login' })}
              className="rounded-md border border-gray-300 bg-white px-3 py-1.5 text-sm font-medium text-gray-700 transition hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
            >
              Sign out
            </button>
          </div>
        </div>
      </header>

      {/* Page content */}
      <main className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">{children}</main>
    </div>
  );
}
