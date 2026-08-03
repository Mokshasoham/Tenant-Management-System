/**
 * SHA-256 Hash & Verification Service (A.5)
 */

import { createHash } from 'crypto';

export function computeSha256(buffer: Buffer | string): string {
  return createHash('sha256').update(buffer).digest('hex');
}

export function formatHashShort(hash: string, head = 6, tail = 4): string {
  if (hash.length <= head + tail) return hash;
  return `${hash.slice(0, head)}…${hash.slice(-tail)}`;
}

export interface VerificationResult {
  valid: boolean;
  recordedHash: string;
  liveHash: string;
  tamperDetected: boolean;
  message: string;
}

export function verifyDocumentHash(
  buffer: Buffer,
  recordedHash: string
): VerificationResult {
  const liveHash = computeSha256(buffer);
  const valid = liveHash === recordedHash;
  return {
    valid,
    recordedHash,
    liveHash,
    tamperDetected: !valid,
    message: valid
      ? '✔ No modifications detected since issue'
      : '⚠ Hash mismatch — document may have been altered',
  };
}

export function createSecurityBlock(
  buffer: Buffer,
  org: string = 'Tenant Management System',
  digitalSignatureValid?: boolean
) {
  const hash = computeSha256(buffer);
  const now = new Date();
  const timestamp = now.toLocaleString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    timeZone: 'Asia/Kolkata',
    hour12: false,
  }) + ' IST';

  return {
    sha256Hash: hash,
    verificationTimestamp: timestamp,
    issuingOrganization: org,
    tamperDetected: false,
    digitalSignatureValid,
  };
}
