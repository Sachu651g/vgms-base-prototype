'use client';

/**
 * components/forms/NightOutRequestForm.tsx
 *
 * Task 21.4 — Night-out request form
 * Submits to POST /api/hostel/night-out
 */

import { useState } from 'react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

interface NightOutRequestFormProps {
  /** Optional callback invoked after a successful submission */
  onSuccess?: (requestId: string) => void;
}

interface SuccessResult {
  requestId: string;
}

interface ErrorResult {
  message: string;
}

export default function NightOutRequestForm({ onSuccess }: NightOutRequestFormProps) {
  // ── Form fields ──────────────────────────────────────────────────────────
  const [departureDatetime, setDepartureDatetime]           = useState('');
  const [expectedReturnDatetime, setExpectedReturnDatetime] = useState('');
  const [destinationAddress, setDestinationAddress]         = useState('');
  const [reason, setReason]                                 = useState('');
  const [parentConsentUrl, setParentConsentUrl]             = useState('');

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
      const res = await fetch('/api/hostel/night-out', {
        method:      'POST',
        headers:     { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          departureDatetime:      new Date(departureDatetime).toISOString(),
          expectedReturnDatetime: new Date(expectedReturnDatetime).toISOString(),
          destinationAddress,
          reason,
          parentConsentUrl,
        }),
      });

      const data = await res.json();

      if (res.status === 422) {
        // Check if the error is specifically about parentConsentUrl
        const hasParentConsentError =
          data?.field === 'parentConsentUrl' ||
          (Array.isArray(data?.issues) &&
            data.issues.some(
              (i: { path?: string[]; message?: string }) =>
                i.path?.includes('parentConsentUrl') ||
                i.message?.toLowerCase().includes('parent consent')
            ));

        if (hasParentConsentError) {
          setError({ message: 'Parent consent URL is required.' });
        } else {
          const msg =
            data?.message ??
            (Array.isArray(data?.issues)
              ? data.issues.map((i: { message: string }) => i.message).join(', ')
              : null) ??
            'Validation error.';
          setError({ message: msg });
        }
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

      const result: SuccessResult = { requestId: data.requestId ?? data.nightOutId ?? data.id };
      setSuccess(result);
      onSuccess?.(result.requestId);
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
      <h2 className="text-xl font-semibold text-gray-800">Night-Out Request</h2>

      {/* Success banner */}
      {success && (
        <Alert variant="success">
          <AlertDescription>
            Night-out request submitted successfully.
          </AlertDescription>
        </Alert>
      )}

      {/* Error banner */}
      {error && (
        <Alert variant="destructive">
          <AlertDescription>{error.message}</AlertDescription>
        </Alert>
      )}

      {/* Departure Datetime */}
      <div className="space-y-1">
        <Label htmlFor="nof-departure">
          Departure Date &amp; Time <span className="text-red-500">*</span>
        </Label>
        <Input
          id="nof-departure"
          type="datetime-local"
          required
          value={departureDatetime}
          onChange={(e) => setDepartureDatetime(e.target.value)}
        />
      </div>

      {/* Expected Return Datetime */}
      <div className="space-y-1">
        <Label htmlFor="nof-return">
          Expected Return Date &amp; Time <span className="text-red-500">*</span>
        </Label>
        <Input
          id="nof-return"
          type="datetime-local"
          required
          value={expectedReturnDatetime}
          onChange={(e) => setExpectedReturnDatetime(e.target.value)}
        />
      </div>

      {/* Destination Address */}
      <div className="space-y-1">
        <Label htmlFor="nof-destination">
          Destination Address <span className="text-red-500">*</span>
        </Label>
        <Input
          id="nof-destination"
          type="text"
          required
          value={destinationAddress}
          onChange={(e) => setDestinationAddress(e.target.value)}
        />
      </div>

      {/* Reason */}
      <div className="space-y-1">
        <Label htmlFor="nof-reason">
          Reason <span className="text-red-500">*</span>
        </Label>
        <Input
          id="nof-reason"
          type="text"
          required
          value={reason}
          onChange={(e) => setReason(e.target.value)}
        />
      </div>

      {/* Parent Consent URL */}
      <div className="space-y-1">
        <Label htmlFor="nof-parentConsentUrl">
          Parent Consent URL <span className="text-red-500">*</span>
        </Label>
        <Input
          id="nof-parentConsentUrl"
          type="url"
          required
          placeholder="https://…"
          value={parentConsentUrl}
          onChange={(e) => setParentConsentUrl(e.target.value)}
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
          'Submit Night-Out Request'
        )}
      </Button>
    </form>
  );
}
