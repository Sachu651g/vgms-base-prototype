'use client';

import { useSession, signOut } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';
import { Shield, Bell, LogOut } from 'lucide-react';

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const { data: session, status } = useSession();
  const router = useRouter();

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/login');
    }
  }, [status, router]);

  if (status === 'loading') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
          <p className="text-sm text-slate-500">Loading dashboard...</p>
        </div>
      </div>
    );
  }

  if (!session) return null;

  const roleLabel: Record<string, string> = {
    super_admin:   'Super Admin',
    branch_admin:  'Branch Admin',
    principal:     'Principal',
    hod:           'Head of Department',
    warden:        'Warden',
    security_head: 'Security Head',
    watchman:      'Watchman',
    receptionist:  'Receptionist',
    student:       'Student',
  };

  const roleColor: Record<string, string> = {
    super_admin:   'bg-purple-100 text-purple-700',
    branch_admin:  'bg-blue-100 text-blue-700',
    principal:     'bg-indigo-100 text-indigo-700',
    hod:           'bg-teal-100 text-teal-700',
    warden:        'bg-amber-100 text-amber-700',
    security_head: 'bg-red-100 text-red-700',
    watchman:      'bg-orange-100 text-orange-700',
    receptionist:  'bg-green-100 text-green-700',
    student:       'bg-slate-100 text-slate-700',
  };

  const role = (session.user as { role?: string })?.role ?? 'branch_admin';

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      {/* Top nav */}
      <header className="bg-white border-b border-slate-200 px-6 py-3 flex items-center justify-between sticky top-0 z-40">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center">
            <Shield className="w-5 h-5 text-white" />
          </div>
          <span className="font-semibold text-slate-900 text-sm">VGMS</span>
          <span className="hidden md:block text-slate-300">|</span>
          <span className="hidden md:block text-xs text-slate-500">
            Visitor &amp; Gate Pass Management System
          </span>
        </div>

        <div className="flex items-center gap-3">
          <button className="relative p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition">
            <Bell className="w-5 h-5" />
            <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-red-500 rounded-full" />
          </button>

          <div className="flex items-center gap-2 pl-3 border-l border-slate-200">
            <div className="w-8 h-8 bg-blue-600 rounded-full flex items-center justify-center text-white text-xs font-medium">
              {session.user?.name?.charAt(0) ?? 'U'}
            </div>
            <div className="hidden md:block">
              <p className="text-xs font-medium text-slate-900 leading-none">
                {session.user?.name ?? 'User'}
              </p>
              <span className={`text-xs px-1.5 py-0.5 rounded font-medium mt-0.5 inline-block ${roleColor[role] ?? 'bg-slate-100 text-slate-700'}`}>
                {roleLabel[role] ?? role}
              </span>
            </div>
            <button
              onClick={() => signOut({ callbackUrl: '/login' })}
              className="ml-2 flex items-center gap-1.5 text-xs text-slate-500 hover:text-red-600 hover:bg-red-50 px-2 py-1.5 rounded-lg transition"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span className="hidden md:block">Sign out</span>
            </button>
          </div>
        </div>
      </header>

      {/* Page content */}
      <main className="flex-1 p-6">{children}</main>
    </div>
  );
}
