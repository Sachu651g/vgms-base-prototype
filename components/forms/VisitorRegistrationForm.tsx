'use client';

/**
 * components/forms/VisitorRegistrationForm.tsx
 *
 * Task 21.1 — Visitor registration form
 * Submits to POST /api/visitors
 */

import { useState } from 'react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

interface VisitorRegistrationFormProps {
  /** Optional callback invoked after a successful submission */
  onSuccess?: (visitId: string) => void;
}

interface SuccessResult {
  visitId: string;
}

interface ErrorResult {
  message: string;
}

export default function VisitorRegistrationForm({ onSuccess }: VisitorRegistrationFormProps) {
  // ── Form fields ──────────────────────────────────────────────────────────
  const [name, setName]                                       = useState('');
  const [phone, setPhone]                                     = useState('');
  const [email, setEmail]                                     = useState('');
  const [idType, setIdType]                                   = useState('');
  const [idNumber, setIdNumber]                               = useState('');
  const [purpose, setPurpose]                                 = useState('');
  const [hostUserId, setHostUserId]                           = useState('');
  const [expectedArrival, setExpectedArrival]                 = useState('');
  const [expectedDurationMinutes, setExpectedDurationMinutes] = useState('');

  // ── UI state ─────────────────────────────────────────────────────────────
  const [loading, setLoading]   = useState(false);
  const [success, setSuccess]   = useState<SuccessResult | null>(null);
  const [error, setError]       = useState<ErrorResult | null>(null);

  // ── Submit handler ────────────────────────────────────────────────────────
  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();

    // Clear previous feedback on every new attempt
    setSuccess(null);
    setError(null);
    setLoading(true);

    try {
      const body: Record<string, unknown> = {
        name,
        phone,
        purpose,
        hostUserId,
        expectedArrival: new Date(expectedArrival).toISOString(),
        expectedDurationMinutes: parseInt(expectedDurationMinutes, 10),
      };

      if (email.trim())    body.email    = email.trim();
      if (idType.trim())   body.idType   = idType.trim();
      if (idNumber.trim()) body.idNumber = idNumber.trim();

      const res = await fetch('/api/visitors', {
        method:      'POST',
        headers:     { 'Content-Type': 'application/json' },
        credentials: 'include',
        body:        JSON.stringify(body),
      });

      const data = await res.json();

      if (res.status === 409) {
        const reason = data?.reason ?? data?.message ?? 'unknown reason';
        setError({ message: `Visitor is blacklisted: ${reason}` });
        return;
      }

      if (!res.ok) {
        const msg =
          data?.message ??
          (Array.isArray(data?.issues)
            ? data.issues.map((i: { message: string }) => i.message).join(', ')
            : null) ??
          'An unexpected error occurred.';
        setError({ message: msg });
        return;
      }

      const result: SuccessResult = { visitId: data.visitId };
      setSuccess(result);
      onSuccess?.(result.visitId);
    } catch {
      setError({ message: 'Network error. Please try again.' });
    } finally {
      setLoading(false);
    }
  }

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <form
      onSubmit={handleSubmit}
      className="space-y-4 rounded-lg border border-gray-200 bg-white p-6 shadow-sm"
    >
      <h2 className="text-xl font-semibold text-gray-800">Register Visitor</h2>

      {/* Success banner */}
      {success && (
        <Alert variant="success">
          <AlertDescription>
            Visitor registered successfully. Visit ID: {success.visitId}
          </AlertDescription>
        </Alert>
      )}

      {/* Error banner */}
      {error && (
        <Alert variant="destructive">
          <AlertDescription>{error.message}</AlertDescription>
        </Alert>
      )}

      {/* Name */}
      <div className="space-y-1">
        <Label htmlFor="vrf-name">
          Full Name <span className="text-red-500">*</span>
        </Label>
        <Input
          id="vrf-name"
          type="text"
          required
          value={name}
          onChange={(e) => setName(e.target.value)}
        />
      </div>

      {/* Phone */}
      <div className="space-y-1">
        <Label htmlFor="vrf-phone">
          Phone <span className="text-red-500">*</span>
        </Label>
        <Input
          id="vrf-phone"
          type="text"
          required
          value={phone}
          onChange={(e) => setPhone(e.target.value)}
        />
      </div>

      {/* Email (optional) */}
      <div className="space-y-1">
        <Label htmlFor="vrf-email">
          Email <span className="text-gray-400 text-xs">(optional)</span>
        </Label>
        <Input
          id="vrf-email"
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />
      </div>

      {/* ID Type */}
      <div className="space-y-1">
        <Label htmlFor="vrf-idType">ID Type</Label>
        <select
          id="vrf-idType"
          value={idType}
          onChange={(e) => setIdType(e.target.value)}
          className="flex h-10 w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2"
        >
          <option value="">— Select —</option>
          <option value="Aadhar">Aadhar</option>
          <option value="PAN">PAN</option>
          <option value="Passport">Passport</option>
          <option value="Other">Other</option>
        </select>
      </div>

      {/* ID Number */}
      <div className="space-y-1">
        <Label htmlFor="vrf-idNumber">ID Number</Label>
        <Input
          id="vrf-idNumber"
          type="text"
          value={idNumber}
          onChange={(e) => setIdNumber(e.target.value)}
        />
      </div>

      {/* Purpose */}
      <div className="space-y-1">
        <Label htmlFor="vrf-purpose">
          Purpose of Visit <span className="text-red-500">*</span>
        </Label>
        <Input
          id="vrf-purpose"
          type="text"
          required
          value={purpose}
          onChange={(e) => setPurpose(e.target.value)}
        />
      </div>

      {/* Host User ID */}
      <div className="space-y-1">
        <Label htmlFor="vrf-hostUserId">
          Host User ID (UUID) <span className="text-red-500">*</span>
        </Label>
        <Input
          id="vrf-hostUserId"
          type="text"
          required
          placeholder="xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx"
          value={hostUserId}
          onChange={(e) => setHostUserId(e.target.value)}
          className="font-mono"
        />
      </div>

      {/* Expected Arrival */}
      <div className="space-y-1">
        <Label htmlFor="vrf-expectedArrival">
          Expected Arrival <span className="text-red-500">*</span>
        </Label>
        <Input
          id="vrf-expectedArrival"
          type="datetime-local"
          required
          value={expectedArrival}
          onChange={(e) => setExpectedArrival(e.target.value)}
        />
      </div>

      {/* Expected Duration */}
      <div className="space-y-1">
        <Label htmlFor="vrf-duration">
          Expected Duration (minutes) <span className="text-red-500">*</span>
        </Label>
        <Input
          id="vrf-duration"
          type="number"
          required
          min={15}
          value={expectedDurationMinutes}
          onChange={(e) => setExpectedDurationMinutes(e.target.value)}
        />
      </div>

      {/* Submit */}
      <Button type="submit" disabled={loading} className="w-full">
        {loading ? (
          <span className="flex items-center gap-2">
            <svg
              className="h-4 w-4 animate-spin"
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
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
                d="M4 12a8 8 0 018-8v8H4z"
              />
            </svg>
            Registering…
          </span>
        ) : (
          'Register Visitor'
        )}
      </Button>
    </form>
  );
}
