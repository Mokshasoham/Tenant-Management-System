/**
 * Document ID Standard (A.3)
 * Format: {TYPE}-{YEAR}-{6-digit sequence}
 * Sequence is per-type, per-year.
 */
import { DocumentType, DocumentId } from '../types';
export declare function generateDocumentId(type: DocumentType, year?: number, sequence?: number): DocumentId;
export declare function parseDocumentId(id: string): DocumentId | null;
/** For testing / seeding */
export declare function resetSequences(): void;
export declare function setSequence(type: DocumentType, year: number, seq: number): void;
