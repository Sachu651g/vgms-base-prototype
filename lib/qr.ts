import crypto from 'crypto';

/**
 * QRPayload — the data embedded in every encrypted QR code.
 * Requirement 6.1: pass ID, holder ID, branch ID, pass type, expiry timestamp.
 */
export interface QRPayload {
  passId: string;       // UUID of the gate pass or visit
  holderId: string;     // UUID of the student / visitor
  branchId: string;     // UUID of the branch
  passType: 'gate_pass' | 'visitor' | 'hostel';
  expiresAt: string;    // ISO 8601 date string
}

/**
 * Derives a 32-byte AES-256 key from NEXTAUTH_SECRET using scrypt.
 * Salt is fixed so the same secret always produces the same key.
 */
export function deriveKey(): Buffer {
  return crypto.scryptSync(process.env.NEXTAUTH_SECRET!, 'vgms-qr-salt', 32);
}

/**
 * Encrypts a QRPayload using AES-256-CBC.
 * Returns a string in the format `<iv_hex>:<ciphertext_hex>`.
 *
 * Requirement 6.1 / 6.6: AES-256 encryption; round-trip property must hold.
 */
export function encryptQRPayload(payload: QRPayload): string {
  const key = deriveKey();
  const iv = crypto.randomBytes(16);
  const cipher = crypto.createCipheriv('aes-256-cbc', key, iv);

  const plaintext = JSON.stringify(payload);
  const encrypted = Buffer.concat([
    cipher.update(plaintext, 'utf8'),
    cipher.final(),
  ]);

  return `${iv.toString('hex')}:${encrypted.toString('hex')}`;
}

/**
 * Decrypts an AES-256-CBC ciphertext produced by `encryptQRPayload`.
 * Expects the format `<iv_hex>:<ciphertext_hex>`.
 *
 * Throws if the format is invalid or decryption fails (tampered payload).
 *
 * Requirement 6.4 / 6.6: invalid/tampered payloads must surface as errors.
 */
export function decryptQRPayload(ciphertext: string): QRPayload {
  const colonIndex = ciphertext.indexOf(':');
  if (colonIndex === -1) {
    throw new Error('Invalid QR payload format: missing separator');
  }

  const ivHex = ciphertext.slice(0, colonIndex);
  const ctHex = ciphertext.slice(colonIndex + 1);

  if (ivHex.length !== 32) {
    throw new Error('Invalid QR payload format: IV must be 16 bytes (32 hex chars)');
  }

  const iv = Buffer.from(ivHex, 'hex');
  const ct = Buffer.from(ctHex, 'hex');

  const key = deriveKey();
  const decipher = crypto.createDecipheriv('aes-256-cbc', key, iv);

  const decrypted = Buffer.concat([decipher.update(ct), decipher.final()]);

  return JSON.parse(decrypted.toString('utf8')) as QRPayload;
}
