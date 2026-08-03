/**
 * Document ID Standard (A.3)
 * Format: {TYPE}-{YEAR}-{6-digit sequence}
 * Sequence is per-type, per-year.
 */

import { DocumentType, DocumentId } from '../types';

const sequences: Record<string, number> = {};

function key(type: DocumentType, year: number): string {
  return `${type}-${year}`;
}

export function generateDocumentId(
  type: DocumentType,
  year: number = new Date().getFullYear(),
  sequence?: number
): DocumentId {
  const k = key(type, year);
  if (sequence === undefined) {
    sequences[k] = (sequences[k] || 0) + 1;
    sequence = sequences[k];
  } else {
    sequences[k] = Math.max(sequences[k] || 0, sequence);
  }
  const formatted = `${type}-${year}-${String(sequence).padStart(6, '0')}`;
  return { type, year, sequence, formatted };
}

export function parseDocumentId(id: string): DocumentId | null {
  const match = id.match(/^(LEASE|INV|REN|INSP|EXIT|DEP)-(\d{4})-(\d{6})$/);
  if (!match) return null;
  return {
    type: match[1] as DocumentType,
    year: parseInt(match[2], 10),
    sequence: parseInt(match[3], 10),
    formatted: id,
  };
}

/** For testing / seeding */
export function resetSequences(): void {
  Object.keys(sequences).forEach((k) => delete sequences[k]);
}

export function setSequence(type: DocumentType, year: number, seq: number): void {
  sequences[key(type, year)] = seq;
}
