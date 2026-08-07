/**
 * Enterprise Property Directory Centralized Mock Module
 * Single source of truth for Admin Property Directory, GIS markers, Triple Metrics, Risk Summaries, and Inspection Workflows.
 */

export const MOCK_DIRECTORY_STATS = {
  total: 18,
  verified: 12,
  pending: 4,
  highRisk: 2,
  slaBreached: 1,
};

export const MOCK_RISK_SUMMARY = {
  critical: 2,
  high: 6,
  medium: 8,
  low: 22,
};

export const MOCK_REVIEWER_WORKLOAD = [
  { id: 'rev_01', name: 'Alex Mercer', role: 'Senior Compliance Lead', pendingCount: 32, avatar: 'AM' },
  { id: 'rev_02', name: 'Sarah Jenkins', role: 'Verification Auditor', pendingCount: 18, avatar: 'SJ' },
  { id: 'rev_03', name: 'David Kim', role: 'Risk & Legal Analyst', pendingCount: 12, avatar: 'DK' },
];

export const MOCK_SMART_ALERTS = [
  { id: 'sa_1', title: '3 SLA Breached Verification Requests', type: 'danger', count: 3, filterKey: 'SLA_BREACHED' },
  { id: 'sa_2', title: '2 Duplicate Property Coordinates Flagged', type: 'warning', count: 2, filterKey: 'DUPLICATES' },
  { id: 'sa_3', title: '5 Documents Expiring in 14 Days', type: 'amber', count: 5, filterKey: 'EXPIRING_DOCS' },
  { id: 'sa_4', title: '1 Annual Fire NOC Inspection Missed', type: 'danger', count: 1, filterKey: 'MISSED_INSPECTION' },
  { id: 'sa_5', title: '4 Requests Ready for Final Approval', type: 'info', count: 4, filterKey: 'READY_APPROVAL' },
];

export const MOCK_SAVED_SEARCHES = [
  { id: 'ss_1', name: 'Daily High Risk Review', city: 'Hyderabad', risk: 'HIGH', pinned: true },
  { id: 'ss_2', name: 'Pending Commercial Audits', type: 'commercial', status: 'PENDING_VERIFICATION', pinned: true },
  { id: 'ss_3', name: 'Elite Hyderabad Apartments', city: 'Hyderabad', type: 'apartment', pinned: false },
  { id: 'ss_4', name: 'Visakhapatnam Managed', city: 'Visakhapatnam', pinned: false },
];

export const MOCK_DIRECTORY_PROPERTIES = [
  {
    id: 'prop_dir_001',
    propertyId: 'PRP-HYD-101',
    name: 'Skyline Luxury Towers - Apt 402',
    address: 'Banjara Hills, Road No. 12, Hyderabad',
    city: 'Hyderabad',
    type: 'apartment',
    price: 45000,
    bedrooms: 3,
    bathrooms: 3,
    areaSqFt: 2250,
    lat: 17.4156,
    lng: 78.4347,
    images: ['https://images.unsplash.com/photo-1545324418-cc1a3fa10c00?auto=format&fit=crop&w=800&q=80'],
    
    // Enterprise Status Lifecycle
    status: 'VERIFIED', // DRAFT | PENDING_VERIFICATION | VERIFIED | PUBLISHED | OCCUPIED | MAINTENANCE | SUSPENDED | ARCHIVED
    reviewQueueStatus: 'COMPLETED', // UNASSIGNED | ASSIGNED | IN_REVIEW | WAITING_FOR_DOCUMENTS | WAITING_FOR_MANAGER | READY_FOR_APPROVAL | COMPLETED
    verificationPriority: 'HIGH', // CRITICAL | HIGH | MEDIUM | LOW
    slaStatus: 'ON_TRACK',
    slaRemainingHours: 36,

    // Triple Metrics System
    trustScore: 92,
    healthScore: 88,
    complianceScore: 94,
    
    // Flags & Tags
    isDuplicate: false,
    duplicateReason: '',
    tags: ['Luxury', 'Verified', 'Premium', 'Investment'],

    // Manager & Owner Profile
    managerName: 'Apex Property Management Corp',
    managerRating: 4.9,
    managerTrust: 95,
    managerResponseTimeHours: 1.1,
    managerPropertiesCount: 24,
    ownerName: 'Rajesh Sharma',

    // Compliance Checklist
    compliance: {
      ownershipDeed: 'PASSED',
      taxReceipt: 'PASSED',
      fireNoc: 'PASSED',
      propertyInsurance: 'PASSED',
      utilitiesPaid: 'PASSED',
      geoVerified: 'PASSED',
    },

    // Inspections
    inspection: {
      lastInspectionDate: '2026-07-15',
      inspector: 'David Kim',
      result: 'PASSED',
      score: 95,
      remarks: 'All safety standards met. Fire extinguishers renewed.',
      nextInspectionDate: '2027-07-15',
      status: 'COMPLETED', // UPCOMING | TODAY | MISSED | COMPLETED
    },

    // Lease & Financial Stats
    totalLeasesCount: 4,
    currentTenant: 'Aarav Patel',
    occupancyRate: 100,
    annualMaintenanceCost: 24000,
    documentsCount: 6,
    lastAuditTimestamp: new Date(Date.now() - 86400000 * 2).toISOString(),
  },
  {
    id: 'prop_dir_002',
    propertyId: 'PRP-HYD-102',
    name: 'Jubilee Hills Executive Villa 12',
    address: 'Jubilee Hills, Block A, Hyderabad',
    city: 'Hyderabad',
    type: 'house',
    price: 95000,
    bedrooms: 4,
    bathrooms: 4,
    areaSqFt: 3800,
    lat: 17.4319,
    lng: 78.4071,
    images: ['https://images.unsplash.com/photo-1613977257363-707ba9348227?auto=format&fit=crop&w=800&q=80'],

    status: 'PENDING_VERIFICATION',
    reviewQueueStatus: 'IN_REVIEW',
    verificationPriority: 'CRITICAL',
    slaStatus: 'WARNING',
    slaRemainingHours: 8,

    trustScore: 78,
    healthScore: 72,
    complianceScore: 82,

    isDuplicate: true,
    duplicateReason: 'Matching GPS coordinates with Villa 12B record',
    tags: ['Luxury', 'High Risk', 'Investment'],

    managerName: 'Horizon Realty LLC',
    managerRating: 4.6,
    managerTrust: 88,
    managerResponseTimeHours: 2.4,
    managerPropertiesCount: 16,
    ownerName: 'Vikramaditya Rao',

    compliance: {
      ownershipDeed: 'PASSED',
      taxReceipt: 'PENDING',
      fireNoc: 'PASSED',
      propertyInsurance: 'EXPIRED',
      utilitiesPaid: 'PASSED',
      geoVerified: 'PASSED',
    },

    inspection: {
      lastInspectionDate: '2026-05-10',
      inspector: 'Sarah Jenkins',
      result: 'PENDING_RENEWAL',
      score: 82,
      remarks: 'Insurance renewal document pending submission.',
      nextInspectionDate: '2026-08-15',
      status: 'UPCOMING',
    },

    totalLeasesCount: 2,
    currentTenant: 'Unoccupied (Vacant)',
    occupancyRate: 0,
    annualMaintenanceCost: 48000,
    documentsCount: 4,
    lastAuditTimestamp: new Date(Date.now() - 86400000 * 0.5).toISOString(),
  },
  {
    id: 'prop_dir_003',
    propertyId: 'PRP-VSKP-201',
    name: 'Beach Road Commercial Complex',
    address: 'RK Beach Road, Visakhapatnam',
    city: 'Visakhapatnam',
    type: 'commercial',
    price: 120000,
    bedrooms: 0,
    bathrooms: 6,
    areaSqFt: 5400,
    lat: 17.7126,
    lng: 83.3175,
    images: ['https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?auto=format&fit=crop&w=800&q=80'],

    status: 'SUSPENDED',
    reviewQueueStatus: 'WAITING_FOR_DOCUMENTS',
    verificationPriority: 'HIGH',
    slaStatus: 'BREACHED',
    slaRemainingHours: -12,

    trustScore: 42,
    healthScore: 55,
    complianceScore: 50,

    isDuplicate: false,
    duplicateReason: '',
    tags: ['Commercial', 'High Risk', 'Government Audit'],

    managerName: 'Oceanic Estate Management',
    managerRating: 4.1,
    managerTrust: 75,
    managerResponseTimeHours: 4.8,
    managerPropertiesCount: 8,
    ownerName: 'Kiran Vizag Properties',

    compliance: {
      ownershipDeed: 'PASSED',
      taxReceipt: 'EXPIRED',
      fireNoc: 'REJECTED',
      propertyInsurance: 'EXPIRED',
      utilitiesPaid: 'PENDING',
      geoVerified: 'PASSED',
    },

    inspection: {
      lastInspectionDate: '2026-04-01',
      inspector: 'Alex Mercer',
      result: 'FAILED',
      score: 55,
      remarks: 'Fire NOC expired & emergency exit obstructed.',
      nextInspectionDate: '2026-08-01',
      status: 'MISSED',
    },

    totalLeasesCount: 5,
    currentTenant: 'Tech Hub Commercial Ltd',
    occupancyRate: 80,
    annualMaintenanceCost: 96000,
    documentsCount: 5,
    lastAuditTimestamp: new Date(Date.now() - 86400000 * 5).toISOString(),
  },
];

export const MOCK_INTERNAL_NOTES = [
  { id: 'in_1', author: 'Alex Mercer', timestamp: new Date(Date.now() - 86400000 * 1.5).toISOString(), text: 'Cross-checked title deed with land registry records. Valid.' },
  { id: 'in_2', author: 'Sarah Jenkins', timestamp: new Date(Date.now() - 86400000 * 0.8).toISOString(), text: 'Requested updated municipal tax receipt from property manager.' },
];

export default {
  MOCK_DIRECTORY_STATS,
  MOCK_RISK_SUMMARY,
  MOCK_REVIEWER_WORKLOAD,
  MOCK_SMART_ALERTS,
  MOCK_SAVED_SEARCHES,
  MOCK_DIRECTORY_PROPERTIES,
  MOCK_INTERNAL_NOTES,
};
