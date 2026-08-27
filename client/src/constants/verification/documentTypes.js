/**
 * Canonical Verification Document Categories and Required Document Definitions
 */

export const REQUIRED_DOC_TYPES = [
  { type: 'GOVT_ID', name: 'Government Photo ID (Passport / Drivers License)', category: 'IDENTITY' },
  { type: 'ADDRESS_PROOF', name: 'Utility Bill / Bank Statement / Rental Lease', category: 'ADDRESS' },
  { type: 'EMPLOYMENT_LETTER', name: 'Employment Verification Letter / Offer Letter', category: 'EMPLOYMENT' },
  { type: 'INCOME_PROOF', name: 'Recent Pay Slip / Tax Returns', category: 'INCOME' },
];

export const DOCUMENT_CATEGORIES = [
  { key: 'ALL', label: 'All Documents' },
  { key: 'IDENTITY', label: 'Identity' },
  { key: 'ADDRESS', label: 'Address' },
  { key: 'EMPLOYMENT', label: 'Employment' },
  { key: 'INCOME', label: 'Income' },
  { key: 'FINANCIAL', label: 'Financial' },
  { key: 'REFERENCES', label: 'References' },
  { key: 'OTHER', label: 'Other' },
];

export default {
  REQUIRED_DOC_TYPES,
  DOCUMENT_CATEGORIES,
};
