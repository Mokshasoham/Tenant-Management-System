/**
 * SHA-256 Hash & Verification Service (A.5)
 */
export declare function computeSha256(buffer: Buffer | string): string;
export declare function formatHashShort(hash: string, head?: number, tail?: number): string;
export interface VerificationResult {
    valid: boolean;
    recordedHash: string;
    liveHash: string;
    tamperDetected: boolean;
    message: string;
}
export declare function verifyDocumentHash(buffer: Buffer, recordedHash: string): VerificationResult;
export declare function createSecurityBlock(buffer: Buffer, org?: string, digitalSignatureValid?: boolean): {
    sha256Hash: string;
    verificationTimestamp: string;
    issuingOrganization: string;
    tamperDetected: boolean;
    digitalSignatureValid: boolean | undefined;
};
