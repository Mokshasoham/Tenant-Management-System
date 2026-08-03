/**
 * Document ID Standard (A.3)
 * Format: {TYPE}-{YEAR}-{6-digit sequence}
 * Sequence is per-type, per-year.
 */
const sequences = {};
function key(type, year) {
    return `${type}-${year}`;
}
export function generateDocumentId(type, year = new Date().getFullYear(), sequence) {
    const k = key(type, year);
    if (sequence === undefined) {
        sequences[k] = (sequences[k] || 0) + 1;
        sequence = sequences[k];
    }
    else {
        sequences[k] = Math.max(sequences[k] || 0, sequence);
    }
    const formatted = `${type}-${year}-${String(sequence).padStart(6, '0')}`;
    return { type, year, sequence, formatted };
}
export function parseDocumentId(id) {
    const match = id.match(/^(LEASE|INV|REN|INSP|EXIT|DEP)-(\d{4})-(\d{6})$/);
    if (!match)
        return null;
    return {
        type: match[1],
        year: parseInt(match[2], 10),
        sequence: parseInt(match[3], 10),
        formatted: id,
    };
}
/** For testing / seeding */
export function resetSequences() {
    Object.keys(sequences).forEach((k) => delete sequences[k]);
}
export function setSequence(type, year, seq) {
    sequences[key(type, year)] = seq;
}
