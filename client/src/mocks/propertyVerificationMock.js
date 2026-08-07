/**
 * Property Verification Centralized Mock Data Module
 * Single source of truth for all Property Verification demo data across Dashboard, Wizard, Documents, Timeline, and Trust Score pages.
 */

export const MOCK_PROPERTY_VERIFICATION = {
  _id: 'vrf_prop_demo_001',
  verificationNumber: 'VRF-2026-P00419',
  status: 'APPROVED', // UNVERIFIED, DRAFT, SUBMITTED, AUTO_REVIEW, MANAGER_REVIEW, ADMIN_REVIEW, APPROVED, REJECTED, EXPIRED, RENEWAL_REQUIRED
  entityType: 'PROPERTY',
  entityId: 'property_oakwood_4b',
  currentReviewLevel: 3,
  trustScore: 88,
  verificationBadge: 'GOLD_PROPERTY',
  propertyLevel: 'Verified Property', // Basic Property, Verified Property, Premium Property, Certified Property
  createdAt: new Date(Date.now() - 86400000 * 30).toISOString(),
  submittedAt: new Date(Date.now() - 86400000 * 15).toISOString(),
  updatedAt: new Date().toISOString(),
  verificationRemarks: null,
};

export const MOCK_REQUIRED_DOCUMENTS = [
  { type: 'SALE_DEED', name: 'Original Sale Deed / Title Deed', category: 'OWNERSHIP' },
  { type: 'PROPERTY_REGISTRATION', name: 'Property Registration Certificate', category: 'LEGAL' },
  { type: 'TAX_RECEIPT', name: 'Latest Property Tax Receipt', category: 'TAX' },
  { type: 'OCCUPANCY_CERT', name: 'Occupancy Certificate (OC)', category: 'LEGAL' },
  { type: 'BUILDING_APPROVAL', name: 'Sanctioned Building Plan Approval', category: 'LEGAL' },
  { type: 'ELECTRICITY_BILL', name: 'Recent Electricity Utility Bill', category: 'UTILITY' },
  { type: 'WATER_BILL', name: 'Recent Water Utility Bill', category: 'UTILITY' },
  { type: 'FIRE_NOC', name: 'Fire Safety NOC Certificate', category: 'SAFETY' },
  { type: 'LIFT_SAFETY', name: 'Elevator Safety Inspection Certificate', category: 'SAFETY' },
];

export const MOCK_DOCUMENT_CATEGORIES = [
  { key: 'ALL', label: 'All Documents' },
  { key: 'OWNERSHIP', label: 'Ownership' },
  { key: 'LEGAL', label: 'Legal & Approvals' },
  { key: 'TAX', label: 'Tax Compliance' },
  { key: 'UTILITY', label: 'Utilities' },
  { key: 'PHOTOS', label: 'Property Photos' },
  { key: 'SAFETY', label: 'Safety & NOC' },
  { key: 'OTHER', label: 'Other' },
];

export const MOCK_OWNERSHIP_TYPES = [
  'Individual Owner',
  'Company',
  'Builder',
  'Housing Society',
  'Property Management Company',
  'Government',
  'Trust',
  'Inherited Property',
];

export const MOCK_PROPERTY_DOCUMENTS = [
  {
    _id: 'doc_prop_01',
    documentType: 'SALE_DEED',
    filename: 'oakwood_4b_sale_deed.pdf',
    category: 'OWNERSHIP',
    status: 'VERIFIED',
    uploadedAt: new Date(Date.now() - 86400000 * 20).toISOString(),
    expiresAt: null,
  },
  {
    _id: 'doc_prop_02',
    documentType: 'PROPERTY_REGISTRATION',
    filename: 'property_registration_cert.pdf',
    category: 'LEGAL',
    status: 'VERIFIED',
    uploadedAt: new Date(Date.now() - 86400000 * 18).toISOString(),
    expiresAt: null,
  },
  {
    _id: 'doc_prop_03',
    documentType: 'TAX_RECEIPT',
    filename: 'property_tax_receipt_2025_26.pdf',
    category: 'TAX',
    status: 'VERIFIED',
    uploadedAt: new Date(Date.now() - 86400000 * 15).toISOString(),
    expiresAt: new Date(Date.now() + 86400000 * 365).toISOString(),
  },
  {
    _id: 'doc_prop_04',
    documentType: 'ELECTRICITY_BILL',
    filename: 'electric_bill_jan2026.pdf',
    category: 'UTILITY',
    status: 'VERIFIED',
    uploadedAt: new Date(Date.now() - 86400000 * 10).toISOString(),
    expiresAt: new Date(Date.now() + 86400000 * 90).toISOString(),
  },
  {
    _id: 'doc_prop_05',
    documentType: 'FIRE_NOC',
    filename: 'fire_safety_noc_draft.pdf',
    category: 'SAFETY',
    status: 'PENDING',
    uploadedAt: new Date(Date.now() - 86400000 * 2).toISOString(),
    expiresAt: new Date(Date.now() + 86400000 * 180).toISOString(),
  },
];

export const MOCK_PROPERTY_PHOTOS = [
  { id: 'p1', title: 'Front Exterior Elevation', url: '/placeholder_exterior.jpg', category: 'PHOTOS', status: 'VERIFIED' },
  { id: 'p2', title: 'Living Room Space', url: '/placeholder_living.jpg', category: 'PHOTOS', status: 'VERIFIED' },
  { id: 'p3', title: 'Master Bedroom', url: '/placeholder_bedroom.jpg', category: 'PHOTOS', status: 'VERIFIED' },
  { id: 'p4', title: 'Modular Kitchen', url: '/placeholder_kitchen.jpg', category: 'PHOTOS', status: 'VERIFIED' },
  { id: 'p5', title: 'Attached Bathroom', url: '/placeholder_bathroom.jpg', category: 'PHOTOS', status: 'VERIFIED' },
  { id: 'p6', title: 'Covered Car Parking', url: '/placeholder_parking.jpg', category: 'PHOTOS', status: 'VERIFIED' },
];

export const MOCK_PROPERTY_TIMELINE = [
  {
    action: 'Property Created',
    timestamp: new Date(Date.now() - 86400000 * 30).toISOString(),
    remarks: 'Oakwood Residency Apt 4B registered in system',
    colorType: 'info',
  },
  {
    action: 'Ownership Record Added',
    timestamp: new Date(Date.now() - 86400000 * 25).toISOString(),
    remarks: 'Individual Owner title deed details saved',
    colorType: 'info',
  },
  {
    action: 'Sale Deed Uploaded',
    timestamp: new Date(Date.now() - 86400000 * 20).toISOString(),
    remarks: 'Original Sale Deed PDF attached',
    colorType: 'info',
  },
  {
    action: 'Property Tax Receipt Uploaded',
    timestamp: new Date(Date.now() - 86400000 * 15).toISOString(),
    remarks: '2025-26 Tax receipt attached',
    colorType: 'info',
  },
  {
    action: 'Property Photos Uploaded',
    timestamp: new Date(Date.now() - 86400000 * 12).toISOString(),
    remarks: '6 high-resolution room photos verified',
    colorType: 'info',
  },
  {
    action: 'Inspection Scheduled',
    timestamp: new Date(Date.now() - 86400000 * 10).toISOString(),
    remarks: 'On-site physical inspection booked',
    colorType: 'pending',
  },
  {
    action: 'Physical Inspection Passed',
    timestamp: new Date(Date.now() - 86400000 * 7).toISOString(),
    remarks: 'Inspector rated property condition Excellent',
    colorType: 'success',
  },
  {
    action: 'Ownership Verified',
    timestamp: new Date(Date.now() - 86400000 * 5).toISOString(),
    remarks: 'Title search cleared by Legal Manager',
    colorType: 'success',
  },
  {
    action: 'Municipal Record Verified',
    timestamp: new Date(Date.now() - 86400000 * 4).toISOString(),
    remarks: 'Tax assessment ID matched with city portal',
    colorType: 'success',
  },
  {
    action: 'Trust Score Updated',
    timestamp: new Date(Date.now() - 86400000 * 3).toISOString(),
    remarks: 'Property Trust Score calculated at 88/100',
    colorType: 'success',
  },
  {
    action: 'Property Verification Approved',
    timestamp: new Date(Date.now() - 86400000 * 2).toISOString(),
    remarks: 'VRF-2026-P00419 sequence certified',
    colorType: 'success',
  },
];

export const MOCK_PROPERTY_TRUST = {
  score: 88,
  percentileText: 'Top Rated Property',
  statusTitle: 'Verified Property',
  badge: 'GOLD_PROPERTY',
  breakdown: [
    { label: 'Ownership Title Verification', score: 30, max: 30, status: 'complete' },
    { label: 'Legal & Building Approvals', score: 20, max: 20, status: 'complete' },
    { label: 'Property Tax Compliance', score: 10, max: 10, status: 'complete' },
    { label: 'Utility Verification', score: 10, max: 10, status: 'complete' },
    { label: 'Property Condition & Photos', score: 8, max: 10, status: 'partial' },
    { label: 'Physical Inspection', score: 10, max: 10, status: 'complete' },
    { label: 'Safety & NOC Certificates', score: 0, max: 10, status: 'missing' },
  ],
  penalties: [],
  netScore: 88,
  tips: [
    { id: 'pt1', text: 'Upload Fire Safety NOC', points: 5, completed: false },
    { id: 'pt2', text: 'Upload Elevator Safety Inspection', points: 5, completed: false },
    { id: 'pt3', text: 'Renew Annual Physical Inspection', points: 2, completed: true },
  ],
};

export const MOCK_PROPERTY_SUMMARY = {
  propertyName: 'Oakwood Residency, Apt 4B',
  address: '142 Palm Boulevard, Sector 15, City',
  managerName: 'Sarah Jenkins (Property Manager)',
  propertyId: 'PROP-2026-8819',
  propertyType: 'Apartment',
  areaSqFt: '1,450 sq ft',
  yearBuilt: 2019,
  bedrooms: 3,
  bathrooms: 2,
  parking: 'Covered Reserved',
  occupancyStatus: 'Vacant & Ready',
  inspectionStatus: 'Excellent (Inspected 7 days ago)',
};

// Enhancement #1: Property Verification Renewal History Array
export const MOCK_PROPERTY_RENEWAL = {
  expiresOn: '15 Nov 2027',
  daysRemaining: 648,
  renewalRequired: false,
  statusLabel: 'Not Required (Valid)',
  lastRenewal: '15 Nov 2025',
  renewalHistory: [
    {
      renewedAt: '15 Nov 2025',
      previousExpiry: '15 Nov 2025',
      newExpiry: '15 Nov 2027',
      renewedBy: 'Sarah Jenkins (Manager)',
      remarks: 'Annual property tax receipt and physical inspection renewed',
    },
    {
      renewedAt: '15 Nov 2023',
      previousExpiry: '15 Nov 2023',
      newExpiry: '15 Nov 2025',
      renewedBy: 'System Auto-Renewal',
      remarks: 'Initial 2-year property verification certificate issued',
    },
  ],
};

// Enhancement #3: Property Verification Level Progression
export const MOCK_PROPERTY_LEVELS = {
  currentLevel: 'Verified Property',
  nextLevel: 'Premium Property',
  documentsRemaining: 2,
  requirementsToNextLevel: [
    'Upload Fire Safety NOC Certificate',
    'Upload Elevator Safety Inspection Certificate',
  ],
  levelsList: [
    { name: 'Basic Property', minDocs: 2, color: 'slate' },
    { name: 'Verified Property', minDocs: 4, color: 'blue' },
    { name: 'Premium Property', minDocs: 7, color: 'violet' },
    { name: 'Certified Property', minDocs: 9, color: 'emerald' },
  ],
};

// Enhancement #4: Property Health Score
export const MOCK_PROPERTY_HEALTH = {
  healthScorePercent: 92,
  statusLabel: 'Optimal Health',
  metrics: {
    documentsUploaded: '8 / 9',
    photosUploaded: '18 / 20',
    amenitiesVerified: '12 / 12',
    inspectionsCompleted: '1 / 1',
  },
};

export default {
  MOCK_PROPERTY_VERIFICATION,
  MOCK_REQUIRED_DOCUMENTS,
  MOCK_DOCUMENT_CATEGORIES,
  MOCK_OWNERSHIP_TYPES,
  MOCK_PROPERTY_DOCUMENTS,
  MOCK_PROPERTY_PHOTOS,
  MOCK_PROPERTY_TIMELINE,
  MOCK_PROPERTY_TRUST,
  MOCK_PROPERTY_SUMMARY,
  MOCK_PROPERTY_RENEWAL,
  MOCK_PROPERTY_LEVELS,
  MOCK_PROPERTY_HEALTH,
};
