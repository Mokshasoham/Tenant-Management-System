import Counter from '../../models/Counter.js';

/**
 * Reusable Sequence Generator.
 * Uses atomic counter increments to prevent race conditions and duplicate keys.
 * 
 * @param {string} prefix - Custom string prefix (e.g. 'LRN')
 * @param {string} sequenceKey - Uniqueness string key for counter indexing
 * @returns {Promise<string>} Dynamic non-overlapping serial string (e.g. 'LRN-2026-000001')
 */
export const generateSequenceNumber = async (prefix, sequenceKey) => {
  const year = new Date().getFullYear();
  const counterId = `${sequenceKey}-${year}`;
  
  const counter = await Counter.findByIdAndUpdate(
    counterId,
    { $inc: { seq: 1 } },
    { new: true, upsert: true }
  );

  const sequenceStr = String(counter.seq).padStart(6, '0');
  return `${prefix}-${year}-${sequenceStr}`;
};
