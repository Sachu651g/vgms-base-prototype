'use client';

import { useState } from 'react';
import { signIn } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import {
  Shield,
  Mail,
  Lock,
  Eye,
  EyeOff,
  QrCode,
  Building2,
  Users,
  AlertCircle,
  ChevronDown,
  ChevronUp,
  Loader2,
} from 'lucide-react';

const DEMO_ACCOUNTS = [
  { email: 'super_admin@vgms.com', role: 'Super Admin' },
  { email: 'admin@vgms.com',       role: 'Branch Admin' },
  { email: 'principal@vgms.com',   role: 'Principal' },
  { email: 'hod@vgms.com',         role: 'HOD' },
  { email: 'warden@vgms.com',      role: 'Warden' },
  { email: 'security@vgms.com',    role: 'Security Head' },
  { email: 'watchman@vgms.com',    role: 'Watchman' },
  { email: 'reception@vgms.com',   role: 'Receptionist' },
  { email: 'student@vgms.com',     role: 'Student' },
];

const ROLE_DASHBOARD_MAP: Record<string, string> = {
  super_admin:   '/dashboard/admin',
  branch_admin:  '/dashboard/admin',
  principal:     '/dashboard/principal',
  hod:           '/dashboard/hod',
  faculty:       '/dashboard/hod',
  warden:        '/dashboard/warden',
  receptionist:  '/dashboard/receptionist',
  security_head: '/dashboard/security',
  watchman:      '/dashboard/security',
  student:       '/dashboard/student',
};

const ROLE_BADGE_MAP: Record<string, string> = {
  super_admin: 'Super Admin',
  admin:       'Branch Admin',
  principal:   'Principal',
  hod:         'HOD',
  warden:      'Warden',
  security:    'Security Head',
  watchman:    'Watchman',
  reception:   'Receptionist',
  student:     'Student',
};

function detectRole(email: string): string | null {
  const prefix = email.split('@')[0];
  for (const key of Object.keys(ROLE_BADGE_MAP)) {
    if (prefix.includes(key)) return ROLE_BADGE_MAP[key];
  }
  return null;
}

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail]       = useState('');
  const [password, setPassword] = useState('');
  const [showPass, setShowPass] = useState(false);
  const [loading, setLoading]   = useState(false);
  const [error, setError]       = useState('');
  const [showDemo, setShowDemo] = useState(false);

  const detectedRole = detectRole(email);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      const result = await signIn('credentials', {
        email,
        password,
        redirect: false,
      });
      if (result?.error) {
        if (result.error.includes('LOCKED')) {
          setError('Your account is locked. Please try again later.');
        } else {
          setError('Invalid email or password. Please try again.');
        }
      } else {
        // Fetch session to get role for redirect
        const sessionRes = await fetch('/api/auth/session');
        const session = await sessionRes.json() as { user?: { role?: string } };
        const role = session?.user?.role ?? '';
        const roleRedirectMap: Record<string, string> = {
          super_admin:   '/dashboard/super-admin',
          branch_admin:  '/dashboard/admin',
          principal:     '/dashboard/principal',
          hod:           '/dashboard/hod',
          warden:        '/dashboard/warden',
          security_head: '/dashboard/security',
          watchman:      '/dashboard/watchman',
          receptionist:  '/dashboard/receptionist',
          student:       '/dashboard/student',
        };
        const dest = roleRedirectMap[role] ?? '/dashboard/admin';
        router.push(dest);
        router.refresh();
      }
    } catch {
      setError('Something went wrong. Please try again.');
    } finally {
      setLoading(false);
    }
  }

  function fillDemo(demoEmail: string) {
    setEmail(demoEmail);
    setPassword('Vgms@1234');
    setShowDemo(false);
    setError('');
  }

  return (
    <div className="min-h-screen flex">
      {/* ── LEFT PANEL — Branding ── */}
      <div className="hidden md:flex md:w-1/2 bg-slate-900 flex-col justify-between p-12">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-blue-600 rounded-xl flex items-center justify-center">
            <Shield className="w-6 h-6 text-white" />
          </div>
          <span className="text-white font-bold text-xl tracking-tight">VGMS</span>
        </div>

        <div className="space-y-6">
          <div>
            <h1 className="text-4xl font-bold text-white leading-tight">
              Visitor &amp; Gate Pass<br />Management System
            </h1>
            <p className="mt-4 text-slate-400 text-lg leading-relaxed">
              Enterprise-grade campus security and visitor
              management for educational institutions.
            </p>
          </div>
          <div className="space-y-3">
            <div className="flex items-center gap-3 bg-slate-800 rounded-xl px-4 py-3">
              <Users className="w-5 h-5 text-blue-400 flex-shrink-0" />
              <span className="text-slate-300 text-sm">Role-based access for 9 user types</span>
            </div>
            <div className="flex items-center gap-3 bg-slate-800 rounded-xl px-4 py-3">
              <QrCode className="w-5 h-5 text-blue-400 flex-shrink-0" />
              <span className="text-slate-300 text-sm">AES-256 encrypted QR gate passes</span>
            </div>
            <div className="flex items-center gap-3 bg-slate-800 rounded-xl px-4 py-3">
              <Building2 className="w-5 h-5 text-blue-400 flex-shrink-0" />
              <span className="text-slate-300 text-sm">Real-time hostel &amp; campus tracking</span>
            </div>
          </div>
        </div>

        <p className="text-slate-600 text-xs">
          Protected with AES-256 encryption · Multi-branch isolation · Full audit logging
        </p>
      </div>

      {/* ── RIGHT PANEL — Form ── */}
      <div className="w-full md:w-1/2 flex flex-col justify-center px-8 md:px-16 bg-white">
        {/* Mobile logo */}
        <div className="flex md:hidden items-center gap-2 mb-8">
          <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center">
            <Shield className="w-5 h-5 text-white" />
          </div>
          <span className="font-bold text-slate-900">VGMS</span>
        </div>

        <div className="w-full max-w-sm mx-auto" style={{ animation: 'fadeIn 0.4s ease-out' }}>
          <div className="mb-8">
            <h2 className="text-2xl font-semibold text-slate-900">Welcome back</h2>
            <p className="mt-1 text-slate-500 text-sm">Sign in to access your dashboard</p>
          </div>

          {/* Error */}
          {error && (
            <div className="mb-5 flex items-start gap-3 bg-red-50 border-l-4 border-red-500 rounded-lg px-4 py-3">
              <AlertCircle className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
              <p className="text-red-700 text-sm">{error}</p>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Email */}
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">
                Email address
              </label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <input
                  type="email"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  placeholder="you@vgms.com"
                  required
                  className="w-full pl-10 pr-4 py-2.5 border border-slate-200 rounded-lg text-sm
                    text-slate-900 placeholder-slate-400 bg-white
                    focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent
                    transition"
                />
              </div>
              {detectedRole && (
                <div className="mt-1.5 flex items-center gap-1.5">
                  <span className="text-xs text-slate-400">Signing in as</span>
                  <span className="text-xs font-medium bg-blue-50 text-blue-700 px-2 py-0.5 rounded-full">
                    {detectedRole}
                  </span>
                </div>
              )}
            </div>

            {/* Password */}
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">
                Password
              </label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <input
                  type={showPass ? 'text' : 'password'}
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  placeholder="••••••••"
                  required
                  className="w-full pl-10 pr-10 py-2.5 border border-slate-200 rounded-lg text-sm
                    text-slate-900 placeholder-slate-400 bg-white
                    focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent
                    transition"
                />
                <button
                  type="button"
                  onClick={() => setShowPass(!showPass)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                >
                  {showPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {/* Submit */}
            <button
              type="submit"
              disabled={loading}
              className="w-full flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700
                disabled:bg-blue-400 text-white font-medium py-2.5 rounded-lg text-sm
                transition-colors duration-150 mt-2"
            >
              {loading && <Loader2 className="w-4 h-4 animate-spin" />}
              {loading ? 'Signing in...' : 'Sign in'}
            </button>
          </form>

          {/* Demo accounts */}
          <div className="mt-6 border border-slate-100 rounded-xl overflow-hidden">
            <button
              type="button"
              onClick={() => setShowDemo(!showDemo)}
              className="w-full flex items-center justify-between px-4 py-3 bg-slate-50
                hover:bg-slate-100 transition text-sm text-slate-600 font-medium"
            >
              <span>Demo accounts</span>
              {showDemo ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
            </button>
            {showDemo && (
              <div className="divide-y divide-slate-100">
                {DEMO_ACCOUNTS.map(acc => (
                  <button
                    key={acc.email}
                    type="button"
                    onClick={() => fillDemo(acc.email)}
                    className="w-full flex items-center justify-between px-4 py-2.5
                      hover:bg-blue-50 transition text-left group"
                  >
                    <div>
                      <p className="text-xs font-medium text-slate-700 group-hover:text-blue-700">
                        {acc.role}
                      </p>
                      <p className="text-xs text-slate-400">{acc.email}</p>
                    </div>
                    <span className="text-xs text-slate-300 group-hover:text-blue-400">
                      click to fill →
                    </span>
                  </button>
                ))}
                <div className="px-4 py-2.5 bg-slate-50">
                  <p className="text-xs text-slate-400">
                    Password for all:{' '}
                    <span className="font-mono font-medium text-slate-600">Vgms@1234</span>
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
