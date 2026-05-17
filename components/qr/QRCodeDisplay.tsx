'use client';

/**
 * components/qr/QRCodeDisplay.tsx
 *
 * Task 20.1 — Client component that renders an AES-256 encrypted QR payload
 * as a scannable QR code image.
 *
 * Requirements: 6.1, 6.2
 */

import { useEffect, useState } from 'react';
import QRCode from 'qrcode';

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

interface QRCodeDisplayProps {
  /** The AES-256 encrypted QR payload string to encode as a QR image. */
  encryptedPayload: string;
  /** Accessible alt text for the rendered image. Defaults to "QR Code for pass". */
  alt?: string;
  /** Width and height of the rendered QR image in pixels. Defaults to 256. */
  size?: number;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function QRCodeDisplay({ encryptedPayload, alt, size }: QRCodeDisplayProps) {
  const resolvedSize = size ?? 256;

  const [dataUrl, setDataUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!encryptedPayload) {
      setError('No QR payload provided.');
      return;
    }

    let cancelled = false;

    QRCode.toDataURL(encryptedPayload, {
      errorCorrectionLevel: 'M',
      margin: 2,
      width: resolvedSize,
    })
      .then((url) => {
        if (!cancelled) {
          setDataUrl(url);
          setError(null);
        }
      })
      .catch((err: unknown) => {
        if (!cancelled) {
          setError(
            err instanceof Error
              ? `Failed to generate QR code: ${err.message}`
              : 'Failed to generate QR code',
          );
        }
      });

    return () => {
      cancelled = true;
    };
  }, [encryptedPayload, resolvedSize]);

  // Loading state
  if (!dataUrl && !error) {
    return (
      <div
        className="flex items-center justify-center rounded-lg border border-gray-200 bg-gray-50"
        style={{ width: resolvedSize, height: resolvedSize }}
        role="status"
        aria-label="Generating QR code"
      >
        <div className="flex flex-col items-center gap-2 text-gray-500">
          <svg
            className="h-8 w-8 animate-spin"
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
          <span className="text-sm">Generating QR code...</span>
        </div>
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div
        className="flex items-center justify-center rounded-lg border border-red-200 bg-red-50 p-4"
        style={{ width: resolvedSize, height: resolvedSize }}
        role="alert"
        aria-live="assertive"
      >
        <p className="text-center text-sm text-red-600">Failed to generate QR code</p>
      </div>
    );
  }

  // Rendered QR code
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={dataUrl!}
      alt={alt ?? 'QR Code for pass'}
      width={resolvedSize}
      height={resolvedSize}
      role="img"
      className="rounded-lg border border-gray-200"
    />
  );
}
