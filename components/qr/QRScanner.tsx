'use client';

/**
 * components/qr/QRScanner.tsx
 *
 * Task 20.2 — Client component that accepts a QR payload (via file upload or
 * manual text entry) and POSTs it to the unified /api/scan endpoint.
 *
 * react-qr-reader and jsqr are not installed; this component uses:
 *   1. A file-input that reads a QR image and attempts canvas-based decode
 *      (only works if jsqr is available at runtime via dynamic import).
 *   2. A text-area fallback for manual QR payload entry.
 *
 * Requirements: 6.3, 6.4, 6.5
 */

import { useRef, useState } from 'react';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface ScanResult {
  holderName: string;
  passType: string;
  status: string;
}

interface QRScannerProps {
  passType: 'gate_pass' | 'visitor' | 'hostel';
  gateLocation?: string;
  onSuccess?: (result: ScanResult) => void;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

// Type for the jsqr decode function
type JsQRFn = (data: Uint8ClampedArray, width: number, height: number) => { data: string } | null;

/**
 * Attempts to decode a QR code from a File using canvas + jsqr.
 * Returns the decoded string, or null if jsqr is unavailable or no code found.
 */
async function tryDecodeQRFromImage(file: File): Promise<string | null> {
  let jsQR: JsQRFn | null = null;

  try {
    // Dynamic import — only succeeds if jsqr is installed
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const mod = await import('jsqr' as any) as { default: JsQRFn };
    jsQR = mod.default ?? null;
  } catch {
    // jsqr not available — caller will fall back to manual entry
    return null;
  }

  if (!jsQR) return null;

  const decode = jsQR;

  return new Promise((resolve, reject) => {
    const img = new Image();
    const url = URL.createObjectURL(file);

    img.onload = () => {
      URL.revokeObjectURL(url);

      const canvas = document.createElement('canvas');
      canvas.width  = img.naturalWidth;
      canvas.height = img.naturalHeight;

      const ctx = canvas.getContext('2d');
      if (!ctx) {
        reject(new Error('Could not get canvas 2D context.'));
        return;
      }

      ctx.drawImage(img, 0, 0);
      const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
      const code = decode(imageData.data, imageData.width, imageData.height);
      resolve(code ? code.data : null);
    };

    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error('Failed to load the selected image.'));
    };

    img.src = url;
  });
}

// ---------------------------------------------------------------------------
// Status badge helper
// ---------------------------------------------------------------------------

function statusColor(status: string): string {
  switch (status) {
    case 'approved':
    case 'checked_in':
    case 'exited':
    case 'returned':
    case 'used':
      return 'bg-green-100 text-green-800';
    case 'pending':
      return 'bg-yellow-100 text-yellow-800';
    case 'rejected':
    case 'expired':
    case 'cancelled':
    case 'no_show':
      return 'bg-red-100 text-red-800';
    default:
      return 'bg-gray-100 text-gray-800';
  }
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function QRScanner({ passType, gateLocation, onSuccess }: QRScannerProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [scanning, setScanning]       = useState(false);
  const [result, setResult]           = useState<ScanResult | null>(null);
  const [error, setError]             = useState<string | null>(null);
  const [previewUrl, setPreviewUrl]   = useState<string | null>(null);
  const [manualPayload, setManualPayload] = useState('');
  const [showManual, setShowManual]   = useState(false);

  const reset = () => {
    setResult(null);
    setError(null);
    setPreviewUrl(null);
    setManualPayload('');
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  /** POST the decoded/entered payload to /api/scan */
  const submitPayload = async (qrPayload: string) => {
    setScanning(true);
    setResult(null);
    setError(null);

    try {
      const response = await fetch('/api/scan', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ qrPayload, passType, gateLocation }),
      });

      const data = (await response.json()) as Record<string, unknown>;

      if (!response.ok) {
        if (response.status === 422) {
          setError(
            typeof data.message === 'string'
              ? data.message
              : typeof data.error === 'string'
                ? data.error
                : 'Invalid QR code, expired pass, or incorrect pass status.',
          );
        } else if (response.status === 404) {
          setError('Pass not found. The QR code may be invalid or belong to a different branch.');
        } else if (response.status === 403) {
          setError('Access denied. You do not have permission to scan this pass.');
        } else {
          setError(
            typeof data.error === 'string'
              ? data.error
              : `Scan failed (HTTP ${response.status}).`,
          );
        }
        return;
      }

      const scanResult: ScanResult = {
        holderName: typeof data.holderName === 'string' ? data.holderName : 'Unknown',
        passType,
        status:
          typeof data.status === 'string'
            ? data.status
            : typeof data.outcome === 'string'
              ? data.outcome
              : 'success',
      };

      setResult(scanResult);
      onSuccess?.(scanResult);
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : 'An unexpected error occurred while scanning.',
      );
    } finally {
      setScanning(false);
    }
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const objectUrl = URL.createObjectURL(file);
    setPreviewUrl(objectUrl);
    setResult(null);
    setError(null);
    setScanning(true);

    try {
      const decoded = await tryDecodeQRFromImage(file);

      if (decoded === null) {
        // jsqr unavailable or no code found — prompt manual entry
        setShowManual(true);
        setError('Could not auto-decode the QR image. Please paste the QR payload below.');
        setScanning(false);
        return;
      }

      await submitPayload(decoded);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : 'An unexpected error occurred while scanning.',
      );
      setScanning(false);
    }
  };

  const handleManualSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const payload = manualPayload.trim();
    if (!payload) {
      setError('Please enter the QR payload.');
      return;
    }
    await submitPayload(payload);
  };

  const passTypeLabel: Record<QRScannerProps['passType'], string> = {
    gate_pass: 'Gate Pass',
    visitor:   'Visitor Pass',
    hostel:    'Hostel Movement',
  };

  return (
    <div className="w-full max-w-md rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
      {/* Header */}
      <div className="mb-4">
        <h2 className="text-lg font-semibold text-gray-900">
          Scan {passTypeLabel[passType]}
        </h2>
        {gateLocation && (
          <p className="mt-0.5 text-sm text-gray-500">Gate: {gateLocation}</p>
        )}
      </div>

      {/* File input area */}
      <div
        className="flex cursor-pointer flex-col items-center justify-center rounded-lg border-2 border-dashed border-gray-300 bg-gray-50 p-6 transition hover:border-blue-400 hover:bg-blue-50"
        onClick={() => fileInputRef.current?.click()}
        onKeyDown={(e) => e.key === 'Enter' && fileInputRef.current?.click()}
        role="button"
        tabIndex={0}
        aria-label="Upload QR code image"
      >
        <svg
          className="mb-2 h-10 w-10 text-gray-400"
          xmlns="http://www.w3.org/2000/svg"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          aria-hidden="true"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={1.5}
            d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z"
          />
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={1.5}
            d="M15 13a3 3 0 11-6 0 3 3 0 016 0z"
          />
        </svg>
        <p className="text-sm font-medium text-gray-600">
          {scanning ? 'Processing…' : 'Upload QR code image'}
        </p>
        <p className="mt-1 text-xs text-gray-400">PNG, JPG, WEBP accepted</p>
      </div>

      <input
        ref={fileInputRef}
        type="file"
        accept="image/png,image/jpeg,image/webp,image/*"
        className="sr-only"
        aria-label="QR code image file input"
        onChange={handleFileChange}
        disabled={scanning}
      />

      {/* Divider + manual entry toggle */}
      <div className="mt-4 flex items-center gap-2">
        <div className="h-px flex-1 bg-gray-200" />
        <button
          type="button"
          className="text-xs text-gray-400 hover:text-gray-600"
          onClick={() => setShowManual((v) => !v)}
        >
          {showManual ? 'Hide manual entry' : 'Enter payload manually'}
        </button>
        <div className="h-px flex-1 bg-gray-200" />
      </div>

      {/* Manual payload entry */}
      {showManual && (
        <form onSubmit={handleManualSubmit} className="mt-3 space-y-2">
          <label htmlFor="qr-payload-input" className="block text-sm font-medium text-gray-700">
            QR Payload
          </label>
          <textarea
            id="qr-payload-input"
            value={manualPayload}
            onChange={(e) => setManualPayload(e.target.value)}
            rows={3}
            placeholder="Paste the encrypted QR payload here…"
            className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm font-mono focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
            disabled={scanning}
          />
          <button
            type="submit"
            disabled={scanning || !manualPayload.trim()}
            className="w-full rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
          >
            {scanning ? 'Scanning…' : 'Submit'}
          </button>
        </form>
      )}

      {/* Image preview */}
      {previewUrl && (
        <div className="mt-4 flex justify-center">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={previewUrl}
            alt="Selected QR code"
            className="h-40 w-40 rounded-lg border border-gray-200 object-contain"
          />
        </div>
      )}

      {/* Scanning spinner */}
      {scanning && (
        <div
          className="mt-4 flex items-center justify-center gap-2 text-blue-600"
          role="status"
          aria-live="polite"
        >
          <svg
            className="h-5 w-5 animate-spin"
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 24 24"
            aria-hidden="true"
          >
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
          </svg>
          <span className="text-sm font-medium">Scanning QR code…</span>
        </div>
      )}

      {/* Success result */}
      {result && !scanning && (
        <div
          className="mt-4 rounded-lg border border-green-200 bg-green-50 p-4"
          role="status"
          aria-live="polite"
        >
          <div className="flex items-start gap-3">
            <svg
              className="mt-0.5 h-5 w-5 flex-shrink-0 text-green-600"
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 20 20"
              fill="currentColor"
              aria-hidden="true"
            >
              <path
                fillRule="evenodd"
                d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                clipRule="evenodd"
              />
            </svg>
            <div className="flex-1">
              <p className="text-sm font-semibold text-green-800">Scan successful</p>
              <dl className="mt-2 space-y-1 text-sm text-green-700">
                <div className="flex gap-2">
                  <dt className="font-medium">Holder:</dt>
                  <dd>{result.holderName}</dd>
                </div>
                <div className="flex gap-2">
                  <dt className="font-medium">Pass type:</dt>
                  <dd>{passTypeLabel[passType]}</dd>
                </div>
                <div className="flex items-center gap-2">
                  <dt className="font-medium">Status:</dt>
                  <dd>
                    <span
                      className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${statusColor(result.status)}`}
                    >
                      {result.status}
                    </span>
                  </dd>
                </div>
              </dl>
            </div>
          </div>
        </div>
      )}

      {/* Error message */}
      {error && !scanning && (
        <div
          className="mt-4 rounded-lg border border-red-200 bg-red-50 p-4"
          role="alert"
          aria-live="assertive"
        >
          <div className="flex items-start gap-3">
            <svg
              className="mt-0.5 h-5 w-5 flex-shrink-0 text-red-600"
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 20 20"
              fill="currentColor"
              aria-hidden="true"
            >
              <path
                fillRule="evenodd"
                d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z"
                clipRule="evenodd"
              />
            </svg>
            <p className="text-sm text-red-700">{error}</p>
          </div>
        </div>
      )}

      {/* Reset button */}
      {(result || (error && !showManual)) && !scanning && (
        <button
          type="button"
          onClick={reset}
          className="mt-4 w-full rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 transition hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
        >
          Scan another
        </button>
      )}
    </div>
  );
}
