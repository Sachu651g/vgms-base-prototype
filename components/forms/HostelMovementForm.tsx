'use client';

/**
 * components/forms/HostelMovementForm.tsx
 *
 * Task 21.3 — Hostel movement request form
 * Submits to POST /api/hostel/movements
 */

import { useState } from 'react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

interface HostelMovementFormProps {
  /** Optional callback invoked after a successful submission */
  onSuccess?: (movementId: string) => void;
}

interface SuccessResult {
  movementId: string;
}

interface ErrorResult {
  message: string;
}

export default function HostelMovementForm({ onSuccess }: HostelMovementFormProps) {
  // ── Form fields ──────────────────────────────────────────────────────────
  const [destination, setDestination]           = useState('');
  const [reason, setReason]                     = useState('');
  const [expectedDeparture, setExpectedDeparture] = useState('');
  const [expectedReturn, setExpectedReturn]     = useState('');

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
      const res = await fetch('/api/hostel/movements', {
        method:      'POST',
        headers:     { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          destination,
          reason,
          expectedDeparture: new Date(expectedDeparture).toISOString(),
          expectedReturn:    new Date(expectedReturn).toISOString(),
        }),
      });

      const data = await res.json();

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

      const result: SuccessResult = { movementId: data.movementId };
      setSuccess(result);
      onSuccess?.(result.movementId);
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
      <h2 className="text-xl font-semibold text-gray-800">Hostel Movement Request</h2>

      {/* Success banner */}
      {success && (
        <Alert variant="success">
          <AlertDescription>
            Hostel movement request submitted successfully.
          </AlertDescription>
        </Alert>
      )}

      {/* Error banner */}
      {error && (
        <Alert variant="destructive">
          <AlertDescription>{error.message}</AlertDescription>
        </Alert>
      )}

      {/* Destination */}
      <div className="space-y-1">
        <Label htmlFor="hmf-destination">
          Destination <span className="text-red-500">*</span>
        </Label>
        <Input
          id="hmf-destination"
          type="text"
          required
          value={destination}
          onChange={(e) => setDestination(e.target.value)}
        />
      </div>

      {/* Reason */}
      <div className="space-y-1">
        <Label htmlFor="hmf-reason">
          Reason <span className="text-red-500">*</span>
        </Label>
        <Input
          id="hmf-reason"
          type="text"
          required
          value={reason}
          onChange={(e) => setReason(e.target.value)}
        />
      </div>

      {/* Expected Departure */}
      <div className="space-y-1">
        <Label htmlFor="hmf-departure">
          Expected Departure <span className="text-red-500">*</span>
        </Label>
        <Input
          id="hmf-departure"
          type="datetime-local"
          required
          value={expectedDeparture}
          onChange={(e) => setExpectedDeparture(e.target.value)}
        />
      </div>

      {/* Expected Return */}
      <div className="space-y-1">
        <Label htmlFor="hmf-return">
          Expected Return <span className="text-red-500">*</span>
        </Label>
        <Input
          id="hmf-return"
          type="datetime-local"
          required
          value={expectedReturn}
          onChange={(e) => setExpectedReturn(e.target.value)}
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
          'Submit Movement Request'
        )}
      </Button>
    </form>
  );
}
