/**
 * Centralized File Categories Constants for Tenant Management System.
 * Every uploaded file category MUST be declared here to guarantee schema validation & storage path consistency.
 */
export const FILE_CATEGORIES = {
  AVATARS: 'avatars',
  CHAT: 'chat',
  KYC: 'kyc',
  PROPERTIES: 'properties',
  LEASES: 'leases',
  INVOICES: 'invoices',
  REVIEWS: 'reviews',
};

export const ALLOWED_FILE_CATEGORIES = Object.values(FILE_CATEGORIES);

export default FILE_CATEGORIES;
