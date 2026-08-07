/**
 * Enterprise Property Workspace Centralized Mock Data Module
 * Single source of truth for Admin Property Workspace, Triple Metrics, Grouped Documents, Communications, and Audits.
 */

export const MOCK_PROPERTY_DETAILS = {
  id: 'prop_dir_001',
  propertyId: 'PRP-HYD-101',
  verificationNumber: 'VRF-2026-P00914',
  name: 'Skyline Luxury Towers - Apt 402',
  address: 'Banjara Hills, Road No. 12, Hyderabad, Telangana 500034',
  city: 'Hyderabad',
  type: 'apartment',
  price: 45000,
  deposit: 135000,
  bedrooms: 3,
  bathrooms: 3,
  areaSqFt: 2250,
  lat: 17.4156,
  lng: 78.4347,
  createdDate: '2026-01-10',
  lastInspectionDate: '2026-07-15',
  images: [
    'https://images.unsplash.com/photo-1545324418-cc1a3fa10c00?auto=format&fit=crop&w=800&q=80',
    'https://images.unsplash.com/photo-1613977257363-707ba9348227?auto=format&fit=crop&w=800&q=80',
    'https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?auto=format&fit=crop&w=800&q=80',
  ],

  // Enterprise Status & Review Queue
  status: 'VERIFIED', // VERIFIED | PENDING_VERIFICATION | HIGH_RISK | SUSPENDED | ARCHIVED | MAINTENANCE | OCCUPIED
  reviewQueueStatus: 'COMPLETED',
  verificationLevel: 3,
  verificationPriority: 'HIGH',
  slaStatus: 'ON_TRACK',
  slaRemainingHours: 36,

  // Triple Metrics System
  trustScore: 92,
  healthScore: 88,
  complianceScore: 94,

  // Activity Ribbon Chips
  ribbonChips: [
    { label: 'Created', value: '10 Jan 2026', color: 'indigo' },
    { label: 'Verified', value: 'Level 3 ✓', color: 'emerald' },
    { label: 'Occupied', value: 'Lease Active', color: 'blue' },
    { label: 'Inspection', value: '15 Jul 2026', color: 'purple' },
    { label: 'Documents', value: '8 Files', color: 'amber' },
    { label: 'Health', value: '88 / 100', color: 'emerald' },
    { label: 'Compliance', value: '94%', color: 'emerald' },
  ],

  // Profiles
  owner: {
    name: 'Rajesh Sharma',
    phone: '+91 98765 43210',
    email: 'rajesh.sharma@propertyowner.com',
  },
  manager: {
    name: 'Apex Property Management Corp',
    contactPerson: 'David Sterling',
    phone: '+91 91234 56789',
    email: 'contact@apexprop.com',
    rating: 4.9,
    trustScore: 95,
    propertiesManaged: 24,
    pendingReviews: 4,
    avgResponseTime: '1.2 Hours',
    sinceDate: '2024-03-15',
  },
  currentTenant: {
    name: 'Aarav Patel',
    phone: '+91 99887 76655',
    email: 'aarav.patel@techcorp.com',
    leaseStart: '2026-02-01',
    leaseEnd: '2027-01-31',
    monthlyRent: 45000,
  },

  // Stats
  occupancyRate: 100,
  annualMaintenanceCost: 24000,
  openMaintenanceTickets: 1,
  totalLeasesCount: 4,
  previousTenantsCount: 3,

  // Tags & Amenities
  tags: ['Luxury', 'Verified', 'Premium', 'Investment', 'Gated Community'],
  amenities: ['24/7 Security', 'Swimming Pool', 'Gymnasium', 'Power Backup', 'Covered Parking', 'Clubhouse'],
  nearbyPlaces: [
    { name: 'KIMS Hospital', distance: '1.2 KM' },
    { name: 'City Center Mall', distance: '0.8 KM' },
    { name: 'Metro Station', distance: '0.4 KM' },
  ],
};

export const MOCK_GROUPED_DOCUMENTS = {
  OWNERSHIP: [
    { id: 'doc_1', title: 'Registered Sale Deed', filename: 'sale_deed_registered.pdf', version: 'v2.1', uploadedBy: 'Rajesh Sharma', uploadedDate: '2026-01-12', verifiedBy: 'Alex Mercer', status: 'VERIFIED', expiry: 'N/A' },
  ],
  TAX: [
    { id: 'doc_2', title: 'Municipal Property Tax Receipt 2025-26', filename: 'property_tax_receipt.pdf', version: 'v1.0', uploadedBy: 'David Sterling', uploadedDate: '2026-02-01', verifiedBy: 'Sarah Jenkins', status: 'VERIFIED', expiry: '2026-12-31' },
  ],
  INSURANCE: [
    { id: 'doc_3', title: 'Comprehensive Property Insurance Policy', filename: 'insurance_policy_2026.pdf', version: 'v1.0', uploadedBy: 'David Sterling', uploadedDate: '2026-01-15', verifiedBy: 'David Kim', status: 'VERIFIED', expiry: '2027-01-14' },
  ],
  SAFETY: [
    { id: 'doc_4', title: 'Fire NOC Certificate', filename: 'fire_noc_cert.pdf', version: 'v1.0', uploadedBy: 'David Sterling', uploadedDate: '2026-03-10', verifiedBy: 'Alex Mercer', status: 'VERIFIED', expiry: '2027-03-09' },
  ],
  UTILITIES: [
    { id: 'doc_5', title: 'Electricity & Water Clearance Receipt', filename: 'utility_clearance.pdf', version: 'v1.0', uploadedBy: 'David Sterling', uploadedDate: '2026-01-10', verifiedBy: 'Automated Engine', status: 'VERIFIED', expiry: '2026-08-31' },
  ],
  INSPECTION: [
    { id: 'doc_6', title: 'Annual Structural Health Inspection Report', filename: 'structural_health_audit.pdf', version: 'v1.0', uploadedBy: 'David Kim', uploadedDate: '2026-07-15', verifiedBy: 'David Kim', status: 'VERIFIED', expiry: '2027-07-14' },
  ],
};

export const MOCK_PROPERTY_TIMELINE = [
  { id: 't1', title: 'Property Directory Entry Created', timestamp: '2026-01-10T10:00:00Z', category: 'Property', author: 'System' },
  { id: 't2', title: 'Verification Submitted', timestamp: '2026-01-12T14:30:00Z', category: 'Verification', author: 'Rajesh Sharma' },
  { id: 't3', title: 'Documents Verified & Format Checks Passed', timestamp: '2026-01-15T09:15:00Z', category: 'Documents', author: 'OCR Engine' },
  { id: 't4', title: 'Level 3 Compliance Approved', timestamp: '2026-01-20T16:00:00Z', category: 'Verification', author: 'Alex Mercer' },
  { id: 't5', title: 'Tenant Aarav Patel Moved In', timestamp: '2026-02-01T08:00:00Z', category: 'Lease', author: 'David Sterling' },
  { id: 't6', title: 'Annual Inspection Completed', timestamp: '2026-07-15T11:45:00Z', category: 'Inspection', author: 'David Kim' },
];

export const MOCK_PROPERTY_AUDIT_LOG = [
  { id: 'a1', timestamp: '2026-07-15T11:45:00Z', reviewer: 'David Kim', action: 'VERIFICATION_APPROVED', remarks: 'Annual inspection completed. All fire NOC and structural safety standards verified.', ip: '192.168.1.105', session: 'sess_90412a' },
  { id: 'a2', timestamp: '2026-01-20T16:00:00Z', reviewer: 'Alex Mercer', action: 'LEVEL_3_APPROVAL', remarks: 'Level 3 compliance sign-off granted.', ip: '192.168.1.104', session: 'sess_88192b' },
];

export const MOCK_COMMUNICATIONS = [
  { id: 'c1', sender: 'David Sterling', role: 'Property Manager', timestamp: '2026-07-14T15:20:00Z', text: 'Uploaded renewed fire NOC and municipal tax receipt for review.' },
  { id: 'c2', sender: 'Alex Mercer', role: 'Compliance Lead', timestamp: '2026-07-15T09:00:00Z', text: 'Confirmed document validity. Annual inspection scheduled with David Kim.' },
];

export const MOCK_PROPERTY_REPORTS = [
  { id: 'rep_1', title: 'Verification Compliance Audit Report', type: 'Verification', lastGenerated: '2026-07-20' },
  { id: 'rep_2', title: 'Annual Property Health & Safety Inspection', type: 'Inspection', lastGenerated: '2026-07-15' },
  { id: 'rep_3', title: 'Financial & Lease Yield Summary', type: 'Financial', lastGenerated: '2026-06-30' },
  { id: 'rep_4', title: 'Maintenance & Repairs Audit Trail', type: 'Maintenance', lastGenerated: '2026-07-01' },
];

export default {
  MOCK_PROPERTY_DETAILS,
  MOCK_GROUPED_DOCUMENTS,
  MOCK_PROPERTY_TIMELINE,
  MOCK_PROPERTY_AUDIT_LOG,
  MOCK_COMMUNICATIONS,
  MOCK_PROPERTY_REPORTS,
};
