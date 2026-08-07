/**
 * Technician Verification Centralized Mock Data Module
 * Single source of truth for all Technician Verification demo data across Dashboard, Wizard, Documents, Timeline, and Trust Score pages.
 */

export const MOCK_TECHNICIAN_VERIFICATION = {
  _id: 'vrf_tech_demo_001',
  verificationNumber: 'VRF-2026-T00712',
  status: 'APPROVED', // UNVERIFIED, DRAFT, SUBMITTED, AUTO_REVIEW, MANAGER_REVIEW, ADMIN_REVIEW, APPROVED, REJECTED, EXPIRED, RENEWAL_REQUIRED
  entityType: 'TECHNICIAN',
  entityId: 'technician_marcus_vance',
  currentReviewLevel: 3,
  trustScore: 91,
  verificationBadge: 'GOLD_TECHNICIAN',
  technicianLevel: 'Professional Technician', // Registered Technician, Verified Technician, Professional Technician, Elite Technician
  createdAt: new Date(Date.now() - 86400000 * 45).toISOString(),
  submittedAt: new Date(Date.now() - 86400000 * 20).toISOString(),
  updatedAt: new Date().toISOString(),
  verificationRemarks: null,
};

export const MOCK_REQUIRED_DOCUMENTS = [
  { type: 'GOVT_ID', name: 'Government Photo ID (Passport / Drivers License)', category: 'IDENTITY' },
  { type: 'TRADE_LICENSE', name: 'National / State Trade License', category: 'LICENSE' },
  { type: 'ITI_CERTIFICATE', name: 'ITI / NSDC Skill Certification Diploma', category: 'CERTIFICATES' },
  { type: 'EXPERIENCE_LETTER', name: 'Prior Employer / Agency Experience Letter', category: 'EXPERIENCE' },
  { type: 'INSURANCE_CERT', name: 'Third-Party Liability Insurance Policy', category: 'INSURANCE' },
  { type: 'POLICE_VERIFICATION', name: 'Police Background Verification Certificate', category: 'OTHER' },
];

export const MOCK_DOCUMENT_CATEGORIES = [
  { key: 'ALL', label: 'All Documents' },
  { key: 'IDENTITY', label: 'Identity' },
  { key: 'CERTIFICATES', label: 'Certificates' },
  { key: 'LICENSE', label: 'Trade License' },
  { key: 'EXPERIENCE', label: 'Experience' },
  { key: 'PORTFOLIO', label: 'Portfolio' },
  { key: 'INSURANCE', label: 'Insurance' },
  { key: 'OTHER', label: 'Other' },
];

export const MOCK_TECHNICIAN_DOCUMENTS = [
  {
    _id: 'doc_tech_01',
    documentType: 'GOVT_ID',
    filename: 'govt_photo_id_passport.pdf',
    category: 'IDENTITY',
    status: 'VERIFIED',
    uploadedAt: new Date(Date.now() - 86400000 * 30).toISOString(),
    expiresAt: null,
  },
  {
    _id: 'doc_tech_02',
    documentType: 'TRADE_LICENSE',
    filename: 'master_hvac_trade_license.pdf',
    category: 'LICENSE',
    status: 'VERIFIED',
    uploadedAt: new Date(Date.now() - 86400000 * 25).toISOString(),
    expiresAt: new Date(Date.now() + 86400000 * 365).toISOString(),
  },
  {
    _id: 'doc_tech_03',
    documentType: 'ITI_CERTIFICATE',
    filename: 'iti_electrical_hvac_diploma.pdf',
    category: 'CERTIFICATES',
    status: 'VERIFIED',
    uploadedAt: new Date(Date.now() - 86400000 * 22).toISOString(),
    expiresAt: null,
  },
  {
    _id: 'doc_tech_04',
    documentType: 'INSURANCE_CERT',
    filename: 'liability_insurance_2026.pdf',
    category: 'INSURANCE',
    status: 'VERIFIED',
    uploadedAt: new Date(Date.now() - 86400000 * 20).toISOString(),
    expiresAt: new Date(Date.now() + 86400000 * 180).toISOString(),
  },
  {
    _id: 'doc_tech_05',
    documentType: 'POLICE_VERIFICATION',
    filename: 'police_clearance_certificate.pdf',
    category: 'OTHER',
    status: 'PENDING',
    uploadedAt: new Date(Date.now() - 86400000 * 2).toISOString(),
    expiresAt: new Date(Date.now() + 86400000 * 365).toISOString(),
  },
];

export const MOCK_TECHNICIAN_SKILLS = [
  { id: 's1', name: 'HVAC & Climate Control', level: 'Expert', years: 8, certified: true },
  { id: 's2', name: 'Electrical & Circuitry', level: 'Advanced', years: 6, certified: true },
  { id: 's3', name: 'Plumbing & Pipefitting', level: 'Intermediate', years: 4, certified: true },
  { id: 's4', name: 'Appliance Repair & Servicing', level: 'Advanced', years: 5, certified: false },
  { id: 's5', name: 'Carpentry & Fixtures', level: 'Beginner', years: 2, certified: false },
];

export const MOCK_TECHNICIAN_PORTFOLIO = [
  { id: 'pf1', title: 'Central HVAC Compressor Overhaul', url: '/placeholder_hvac.jpg', category: 'PORTFOLIO', status: 'VERIFIED' },
  { id: 'pf2', title: 'Smart Circuit Breaker Panel Installation', url: '/placeholder_panel.jpg', category: 'PORTFOLIO', status: 'VERIFIED' },
  { id: 'pf3', title: 'Commercial Hydronic Pipe Replacement', url: '/placeholder_plumbing.jpg', category: 'PORTFOLIO', status: 'VERIFIED' },
  { id: 'pf4', title: 'Water Heater Heat Pump Setup', url: '/placeholder_heater.jpg', category: 'PORTFOLIO', status: 'VERIFIED' },
];

export const MOCK_TECHNICIAN_TIMELINE = [
  {
    action: 'Technician Profile Created',
    timestamp: new Date(Date.now() - 86400000 * 45).toISOString(),
    remarks: 'Marcus Vance registered in Workforce module',
    colorType: 'info',
  },
  {
    action: 'Primary Skill Added',
    timestamp: new Date(Date.now() - 86400000 * 40).toISOString(),
    remarks: 'HVAC & Climate Control set as primary domain',
    colorType: 'info',
  },
  {
    action: 'Trade License Uploaded',
    timestamp: new Date(Date.now() - 86400000 * 30).toISOString(),
    remarks: 'Master HVAC Trade License attached',
    colorType: 'info',
  },
  {
    action: 'ITI Diploma Certificate Uploaded',
    timestamp: new Date(Date.now() - 86400000 * 25).toISOString(),
    remarks: 'NSDC Skill Certificate validated',
    colorType: 'info',
  },
  {
    action: 'Liability Insurance Uploaded',
    timestamp: new Date(Date.now() - 86400000 * 22).toISOString(),
    remarks: '$1M Liability Coverage verified',
    colorType: 'info',
  },
  {
    action: 'Background Check Initiated',
    timestamp: new Date(Date.now() - 86400000 * 15).toISOString(),
    remarks: 'National identity & police clearance check started',
    colorType: 'pending',
  },
  {
    action: 'Background Audit Approved',
    timestamp: new Date(Date.now() - 86400000 * 10).toISOString(),
    remarks: 'Zero criminal record & clean police clearance',
    colorType: 'success',
  },
  {
    action: 'Dispatch Supervisor Approval',
    timestamp: new Date(Date.now() - 86400000 * 5).toISOString(),
    remarks: 'Workforce Supervisor granted dispatch rights',
    colorType: 'success',
  },
  {
    action: 'Trust Score Updated',
    timestamp: new Date(Date.now() - 86400000 * 3).toISOString(),
    remarks: 'Technician Trust Score calculated at 91/100',
    colorType: 'success',
  },
  {
    action: 'Technician Verification Approved',
    timestamp: new Date(Date.now() - 86400000 * 2).toISOString(),
    remarks: 'VRF-2026-T00712 sequence certified for dispatch',
    colorType: 'success',
  },
];

export const MOCK_TECHNICIAN_TRUST = {
  score: 91,
  percentileText: 'Top Rated Technician',
  statusTitle: 'Professional Technician',
  badge: 'GOLD_TECHNICIAN',
  breakdown: [
    { label: 'Identity Verification', score: 20, max: 20, status: 'complete' },
    { label: 'Skills & Trade Competency', score: 20, max: 20, status: 'complete' },
    { label: 'Trade License & ITI Certs', score: 20, max: 20, status: 'complete' },
    { label: 'Work Experience (8+ Yrs)', score: 15, max: 15, status: 'complete' },
    { label: 'Job Ratings & Feedback (4.9★)', score: 10, max: 10, status: 'complete' },
    { label: 'Dispatch Availability (On-Call)', score: 6, max: 10, status: 'partial' },
    { label: 'Insurance & Police Clearance', score: 0, max: 5, status: 'missing' },
  ],
  penalties: [],
  netScore: 91,
  tips: [
    { id: 'tt1', text: 'Upload Police Clearance Certificate', points: 5, completed: false },
    { id: 'tt2', text: 'Upload Updated Liability Insurance', points: 5, completed: true },
    { id: 'tt3', text: 'Add 2 More Job Portfolio Images', points: 2, completed: false },
    { id: 'tt4', text: 'Complete NSDC Skill Verification', points: 2, completed: true },
  ],
};

export const MOCK_TECHNICIAN_SUMMARY = {
  employeeId: 'TECH-2026-9042',
  technicianName: 'Marcus Vance',
  primarySkill: 'HVAC & Refrigeration',
  yearsExperience: '8 Years',
  completedJobs: 142,
  averageRating: '4.9 / 5.0 (118 Reviews)',
  responseTime: '< 15 Mins',
  serviceArea: 'North & Central Metro Zone',
  workingHours: '08:00 AM - 08:00 PM',
  availabilityStatus: 'Active & Available',
  employmentType: 'Full-time Certified Specialist',
};

export const MOCK_TECHNICIAN_RENEWAL = {
  expiresOn: '20 Dec 2027',
  daysRemaining: 683,
  renewalRequired: false,
  statusLabel: 'Not Required (Valid)',
  lastRenewal: '20 Dec 2025',
  renewalHistory: [
    {
      renewedAt: '20 Dec 2025',
      previousExpiry: '20 Dec 2025',
      newExpiry: '20 Dec 2027',
      renewedBy: 'Workforce Supervisor',
      remarks: 'Annual trade license and insurance policy renewed',
    },
  ],
};

export const MOCK_TECHNICIAN_LEVELS = {
  currentLevel: 'Professional Technician',
  nextLevel: 'Elite Technician',
  documentsRemaining: 1,
  requirementsToNextLevel: [
    'Upload Police Verification Certificate',
    'Maintain 4.9+ Rating across 150 Jobs',
  ],
  levelsList: [
    { name: 'Registered Technician', minDocs: 1, color: 'slate' },
    { name: 'Verified Technician', minDocs: 3, color: 'blue' },
    { name: 'Professional Technician', minDocs: 5, color: 'violet' },
    { name: 'Elite Technician', minDocs: 6, color: 'emerald' },
  ],
};

export default {
  MOCK_TECHNICIAN_VERIFICATION,
  MOCK_REQUIRED_DOCUMENTS,
  MOCK_DOCUMENT_CATEGORIES,
  MOCK_TECHNICIAN_DOCUMENTS,
  MOCK_TECHNICIAN_SKILLS,
  MOCK_TECHNICIAN_PORTFOLIO,
  MOCK_TECHNICIAN_TIMELINE,
  MOCK_TECHNICIAN_TRUST,
  MOCK_TECHNICIAN_SUMMARY,
  MOCK_TECHNICIAN_RENEWAL,
  MOCK_TECHNICIAN_LEVELS,
};
