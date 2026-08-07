/**
 * Tenant Verification Centralized Mock Data Module
 * Single source of truth for all Tenant Verification demo data across Dashboard, Wizard, Documents, Timeline, and Trust Score pages.
 */

export const MOCK_TENANT_VERIFICATION = {
  _id: 'vrf_tenant_demo_001',
  verificationNumber: 'VRF-2026-000842',
  status: 'UNVERIFIED', // UNVERIFIED, DRAFT, SUBMITTED, AUTO_REVIEW, MANAGER_REVIEW, ADMIN_REVIEW, APPROVED, REJECTED, EXPIRED, RENEWAL_REQUIRED
  entityType: 'TENANT',
  entityId: 'tenant_demo_user',
  currentReviewLevel: 1,
  trustScore: 72,
  verificationBadge: 'GOLD_VERIFIED',
  tenantLevel: 'Trusted Tenant', // Basic Verified, Trusted Tenant, Premium Tenant, Elite Tenant
  createdAt: new Date(Date.now() - 86400000 * 14).toISOString(),
  submittedAt: new Date(Date.now() - 86400000 * 2).toISOString(),
  updatedAt: new Date().toISOString(),
  verificationRemarks: null,
};

export const MOCK_REQUIRED_DOC_TYPES = [
  { type: 'GOVT_ID', name: 'Government Photo ID (Passport / Drivers License)', category: 'IDENTITY' },
  { type: 'ADDRESS_PROOF', name: 'Utility Bill / Bank Statement / Rental Lease', category: 'ADDRESS' },
  { type: 'EMPLOYMENT_LETTER', name: 'Employment Verification Letter / Offer Letter', category: 'EMPLOYMENT' },
  { type: 'INCOME_PROOF', name: 'Recent Pay Slip / Tax Returns', category: 'INCOME' },
];

export const MOCK_DOCUMENT_CATEGORIES = [
  { key: 'ALL', label: 'All Documents' },
  { key: 'IDENTITY', label: 'Identity' },
  { key: 'ADDRESS', label: 'Address' },
  { key: 'EMPLOYMENT', label: 'Employment' },
  { key: 'INCOME', label: 'Income' },
  { key: 'FINANCIAL', label: 'Financial' },
  { key: 'REFERENCES', label: 'References' },
  { key: 'OTHER', label: 'Other' },
];

export const MOCK_DOCUMENTS = [
  {
    _id: 'doc_tenant_01',
    documentType: 'GOVT_ID',
    filename: 'passport_scan_verified.pdf',
    category: 'IDENTITY',
    status: 'VERIFIED',
    uploadedAt: new Date(Date.now() - 86400000 * 5).toISOString(),
    expiresAt: new Date(Date.now() + 86400000 * 365 * 3).toISOString(),
  },
  {
    _id: 'doc_tenant_02',
    documentType: 'ADDRESS_PROOF',
    filename: 'utility_bill_jan2026.pdf',
    category: 'ADDRESS',
    status: 'VERIFIED',
    uploadedAt: new Date(Date.now() - 86400000 * 4).toISOString(),
    expiresAt: new Date(Date.now() + 86400000 * 180).toISOString(),
  },
  {
    _id: 'doc_tenant_03',
    documentType: 'EMPLOYMENT_LETTER',
    filename: 'employment_verification_letter.pdf',
    category: 'EMPLOYMENT',
    status: 'VERIFIED',
    uploadedAt: new Date(Date.now() - 86400000 * 3).toISOString(),
    expiresAt: new Date(Date.now() + 86400000 * 365).toISOString(),
  },
  {
    _id: 'doc_tenant_04',
    documentType: 'INCOME_PROOF',
    filename: 'salary_slip_dec2025.pdf',
    category: 'INCOME',
    status: 'VERIFIED',
    uploadedAt: new Date(Date.now() - 86400000 * 2).toISOString(),
    expiresAt: new Date(Date.now() + 86400000 * 90).toISOString(),
  },
  {
    _id: 'doc_tenant_05',
    documentType: 'FINANCIAL',
    filename: 'bank_statement_q4_2025.pdf',
    category: 'FINANCIAL',
    status: 'VERIFIED',
    uploadedAt: new Date(Date.now() - 86400000 * 1).toISOString(),
    expiresAt: new Date(Date.now() + 86400000 * 120).toISOString(),
  },
];

export const MOCK_TIMELINE_EVENTS = [
  {
    action: 'Account Registered',
    timestamp: new Date(Date.now() - 86400000 * 14).toISOString(),
    remarks: 'Tenant account created successfully',
    colorType: 'info',
  },
  {
    action: 'Email Verified',
    timestamp: new Date(Date.now() - 86400000 * 13).toISOString(),
    remarks: 'Email confirmed via OTP verification',
    colorType: 'success',
  },
  {
    action: 'Phone Verified',
    timestamp: new Date(Date.now() - 86400000 * 12).toISOString(),
    remarks: 'Mobile number verified successfully',
    colorType: 'success',
  },
  {
    action: 'Draft Created',
    timestamp: new Date(Date.now() - 86400000 * 10).toISOString(),
    remarks: 'Initial verification draft initiated',
    colorType: 'info',
  },
  {
    action: 'Identity Document Uploaded',
    timestamp: new Date(Date.now() - 86400000 * 5).toISOString(),
    remarks: 'Passport photo ID attached',
    colorType: 'info',
  },
  {
    action: 'Address Proof Uploaded',
    timestamp: new Date(Date.now() - 86400000 * 4).toISOString(),
    remarks: 'Utility bill attached as address proof',
    colorType: 'info',
  },
  {
    action: 'Reference Added',
    timestamp: new Date(Date.now() - 86400000 * 3.5).toISOString(),
    remarks: 'Previous landlord reference added',
    colorType: 'info',
  },
  {
    action: 'Draft Auto-Saved',
    timestamp: new Date(Date.now() - 86400000 * 3).toISOString(),
    remarks: 'System automatically backed up form progress',
    colorType: 'pending',
  },
  {
    action: 'Submitted for Review',
    timestamp: new Date(Date.now() - 86400000 * 2).toISOString(),
    remarks: 'Assigned sequence number VRF-2026-000842',
    colorType: 'pending',
  },
  {
    action: 'Level 1 Automated Check Passed',
    timestamp: new Date(Date.now() - 86400000 * 1.5).toISOString(),
    remarks: 'Document format, resolution, and malware checks cleared',
    colorType: 'success',
  },
  {
    action: 'Manager Review Completed',
    timestamp: new Date(Date.now() - 86400000 * 1).toISOString(),
    remarks: 'Property manager verified employment & identity',
    colorType: 'success',
  },
  {
    action: 'Trust Score Updated',
    timestamp: new Date(Date.now() - 3600000 * 12).toISOString(),
    remarks: 'Trust score calculated at 72/100 (+27 points delta)',
    colorType: 'success',
  },
];

export const MOCK_TRUST_SCORE = {
  score: 72,
  percentileText: 'Top 18%',
  statusTitle: 'Excellent Tenant',
  badge: 'GOLD_VERIFIED',
  breakdown: [
    { label: 'Identity Verification', score: 25, max: 25, status: 'complete' },
    { label: 'Phone & Email Verification', score: 10, max: 15, status: 'complete' },
    { label: 'Address Proof Verification', score: 15, max: 15, status: 'complete' },
    { label: 'Employment Verification', score: 10, max: 15, status: 'partial' },
    { label: 'Rental History Track Record', score: 5, max: 15, status: 'partial' },
    { label: 'Payment Record (On-Time)', score: 10, max: 10, status: 'complete' },
    { label: 'Conduct & Compliance', score: 0, max: 5, status: 'missing' },
  ],
  penalties: [
    { reason: 'Minor late fee on past utility bill', deduction: -3 },
  ],
  netScore: 72,
  tips: [
    { id: 't1', text: 'Verify Email Address', points: 5, completed: true },
    { id: 't2', text: 'Verify Phone Number', points: 5, completed: true },
    { id: 't3', text: 'Upload Address Proof', points: 10, completed: true },
    { id: 't4', text: 'Upload Employment Letter', points: 10, completed: true },
    { id: 't5', text: 'Complete Govt Photo ID Check', points: 15, completed: true },
    { id: 't6', text: 'Add Previous Landlord Reference', points: 5, completed: false },
    { id: 't7', text: 'Maintain 6 Months On-Time Rent Payments', points: 10, completed: false },
  ],
};

export const MOCK_RENTAL_HISTORY = {
  currentResidence: 'Oakwood Residency, Apt 4B',
  yearsRenting: 2,
  previousLandlords: 2,
  completedLeases: 3,
  latePayments: 0,
  evictions: 0,
  statusLabel: 'Excellent',
  onTimeRate: '100%',
};

export const MOCK_REFERENCES = [
  {
    id: 'ref_01',
    name: 'Robert Vance',
    relationship: 'Previous Landlord',
    phone: '+1 (555) 234-5678',
    email: 'robert.vance@propertygroup.com',
    status: 'UNVERIFIED_DEMO',
  },
  {
    id: 'ref_02',
    name: 'Sarah Jenkins',
    relationship: 'Employer / HR Manager',
    phone: '+1 (555) 876-5432',
    email: 'sjenkins@techcorp.io',
    status: 'UNVERIFIED_DEMO',
  },
];

export const MOCK_RENEWAL_STATUS = {
  expiresOn: '12 Dec 2027',
  daysRemaining: 673,
  renewalRequired: false,
  statusLabel: 'Not Required (Valid)',
  lastRenewal: 'No previous renewals',
  historyCount: 0,
};

export const MOCK_VERIFICATION_LEVELS = {
  BASIC: { name: 'Basic Verified', minDocs: 1, color: 'slate' },
  TRUSTED: { name: 'Trusted Tenant', minDocs: 3, color: 'blue' },
  PREMIUM: { name: 'Premium Tenant', minDocs: 4, color: 'violet' },
  ELITE: { name: 'Elite Tenant', minDocs: 5, color: 'emerald' },
};

export default {
  MOCK_TENANT_VERIFICATION,
  MOCK_REQUIRED_DOC_TYPES,
  MOCK_DOCUMENT_CATEGORIES,
  MOCK_DOCUMENTS,
  MOCK_TIMELINE_EVENTS,
  MOCK_TRUST_SCORE,
  MOCK_RENTAL_HISTORY,
  MOCK_REFERENCES,
  MOCK_RENEWAL_STATUS,
  MOCK_VERIFICATION_LEVELS,
};
