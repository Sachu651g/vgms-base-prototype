'use client';

/**
 * components/forms/GatePassRequestForm.tsx
 *
 * Task 21.2 — Gate pass request form
 * Submits to POST /api/gate-passes
 */

import { useState } from 'react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

interface GatePassRequestFormProps {
  /** Optional callback invoked after a successful submission */
  onSuccess?: (passId: string, escalationDueAt: string) => void;
}

interface SuccessResult {
  passId: string;
  escalationDueAt: string;
}

interface ErrorResult {
  message: string;
}

export default function GatePassRequestForm({ onSuccess }: GatePassRequestFormProps) {
  // ── Form fields ──────────────────────────────────────────────────────────
  const [reason, setReason]                     = useState('');
  const [destination, setDestination]           = useState('');
  const [requestedTimeOut, setRequestedTimeOut] = useState('');
  const [requestedTimeIn, setRequestedTimeIn]   = useState('');

  // ── UI state ─────────────────────────────────────────────────────────────
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState<SuccessResult | null>(null);
  const [error, setError]     = useState<ErrorResult | null>(null);

  // ── Submit handler ────────────────────────────────────────────────────────
  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();

    // Clear previous feedback on every new attempt
    setSuccess(null);
    setError(null);
    setLoading(true);

    try {
      const res = await fetch('/api/gate-passes', {
        method:      'POST',
        headers:     { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          reason,
          destination,
          requestedTimeOut: new Date(requestedTimeOut).toISOString(),
          requestedTimeIn:  new Date(requestedTimeIn).toISOString(),
        }),
      });

      const data = await res.json();

      if (res.status === 409) {
        const passId = data.existingPassId ?? data.existing_pass_id ?? 'unknown';
        const status = data.existingPassStatus ?? data.existing_pass_status ?? 'unknown';
        setError({
          message: `You already have an active pass (ID: ${passId}, Status: ${status})`,
        });
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

      const result: SuccessResult = {
        passId:          data.passId,
        escalationDueAt: data.escalationDueAt,
      };
      setSuccess(result);
      onSuccess?.(result.passId, result.escalationDueAt);
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
      <h2 className="text-xl font-semibold text-gray-800">Request Gate Pass</h2>

      {/* Success banner */}
      {success && (
        <Alert variant="success">
          <AlertDescription>
            Gate pass created. Escalation due: {success.escalationDueAt}
          </AlertDescription>
        </Alert>
      )}

      {/* Error banner */}
      {error && (
        <Alert variant="destructive">
          <AlertDescription>{error.message}</AlertDescription>
        </Alert>
      )}

      {/* Reason */}
      <div className="space-y-1">
        <Label htmlFor="gpf-reason">
          Reason <span className="text-red-500">*</span>
        </Label>
        <Input
          id="gpf-reason"
          type="text"
          required
          value={reason}
          onChange={(e) => setReason(e.target.value)}
        />
      </div>

      {/* Destination */}
      <div className="space-y-1">
        <Label htmlFor="gpf-destination">
          Destination <span className="text-red-500">*</span>
        </Label>
        <Input
          id="gpf-destination"
          type="text"
          required
          value={destination}
          onChange={(e) => setDestination(e.target.value)}
        />
      </div>

      {/* Requested Time Out */}
      <div className="space-y-1">
        <Label htmlFor="gpf-timeOut">
          Requested Time Out <span className="text-red-500">*</span>
        </Label>
        <Input
          id="gpf-timeOut"
          type="datetime-local"
          required
          value={requestedTimeOut}
          onChange={(e) => setRequestedTimeOut(e.target.value)}
        />
      </div>

      {/* Requested Time In */}
      <div className="space-y-1">
        <Label htmlFor="gpf-timeIn">
          Requested Time In <span className="text-red-500">*</span>
        </Label>
        <Input
          id="gpf-timeIn"
          type="datetime-local"
          required
          value={requestedTimeIn}
          onChange={(e) => setRequestedTimeIn(e.target.value)}
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
            Submitting…
          </span>
        ) : (
          'Request Gate Pass'
        )}
      </Button>
    </form>
  );
}
