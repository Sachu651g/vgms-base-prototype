'use client';

import * as React from 'react';
import { useRouter } from 'next/navigation';
import { signIn, useSession } from 'next-auth/react';
import { z } from 'zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';

const loginSchema = z.object({
  email: z.string().email('Please enter a valid email address'),
  password: z.string().min(8, 'Password must be at least 8 characters'),
});

type LoginFormData = z.infer<typeof loginSchema>;

type FieldErrors = Partial<Record<keyof LoginFormData, string>>;

function getRoleDashboard(role: string): string {
  switch (role) {
    case 'super_admin':
    case 'branch_admin':
      return '/dashboard/admin';
    case 'principal':
      return '/dashboard/principal';
    case 'hod':
    case 'faculty':
      return '/dashboard/hod';
    case 'warden':
      return '/dashboard/warden';
    case 'receptionist':
      return '/dashboard/receptionist';
    case 'security_head':
    case 'watchman':
      return '/dashboard/security';
    case 'student':
      return '/dashboard/student';
    default:
      return '/dashboard';
  }
}

export function LoginForm() {
  const router = useRouter();
  const { update: updateSession } = useSession();

  const [email, setEmail] = React.useState('');
  const [password, setPassword] = React.useState('');
  const [fieldErrors, setFieldErrors] = React.useState<FieldErrors>({});
  const [serverError, setServerError] = React.useState<string | null>(null);
  const [isLoading, setIsLoading] = React.useState(false);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setServerError(null);
    setFieldErrors({});

    // Client-side validation
    const result = loginSchema.safeParse({ email, password });
    if (!result.success) {
      const errors: FieldErrors = {};
      for (const issue of result.error.issues) {
        const field = issue.path[0] as keyof LoginFormData;
        errors[field] = issue.message;
      }
      setFieldErrors(errors);
      return;
    }

    setIsLoading(true);

    try {
      const response = await signIn('credentials', {
        email: result.data.email,
        password: result.data.password,
        redirect: false,
      });

      if (response?.error) {
        if (response.error.includes('LOCKED')) {
          setServerError('Your account is locked. Please try again later.');
        } else {
          setServerError('Invalid email or password.');
        }
        return;
      }

      if (response?.ok) {
        // Refresh session to get the latest role data
        const updated = await updateSession();
        const role = (updated?.user as { role?: string } | undefined)?.role ?? '';
        router.push(getRoleDashboard(role));
        router.refresh();
      }
    } catch {
      setServerError('An unexpected error occurred. Please try again.');
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} noValidate className="space-y-5">
      {serverError && (
        <Alert variant="destructive">
          <AlertDescription>{serverError}</AlertDescription>
        </Alert>
      )}

      <div className="space-y-1.5">
        <Label htmlFor="email">Email address</Label>
        <Input
          id="email"
          type="email"
          autoComplete="email"
          placeholder="you@example.com"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          aria-describedby={fieldErrors.email ? 'email-error' : undefined}
          aria-invalid={!!fieldErrors.email}
          disabled={isLoading}
        />
        {fieldErrors.email && (
          <p id="email-error" className="text-xs text-red-600" role="alert">
            {fieldErrors.email}
          </p>
        )}
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="password">Password</Label>
        <Input
          id="password"
          type="password"
          autoComplete="current-password"
          placeholder="••••••••"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          aria-describedby={fieldErrors.password ? 'password-error' : undefined}
          aria-invalid={!!fieldErrors.password}
          disabled={isLoading}
        />
        {fieldErrors.password && (
          <p id="password-error" className="text-xs text-red-600" role="alert">
            {fieldErrors.password}
          </p>
        )}
      </div>

      <Button type="submit" className="w-full" disabled={isLoading}>
        {isLoading ? (
          <span className="flex items-center gap-2">
            <svg
              className="h-4 w-4 animate-spin"
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
              aria-hidden="true"
            >
              <circle
                className="opacity-25"
                cx="12"
                cy="12"
                r="10"
                stroke="currentColor"
                strokeWidth="4"
              />
              <path
                className="opacity-75"
                fill="currentColor"
                d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
              />
            </svg>
            Signing in…
          </span>
        ) : (
          'Sign in'
        )}
      </Button>
    </form>
  );
}
