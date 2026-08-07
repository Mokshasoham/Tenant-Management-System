/**
 * MERN Tenant Management System - Verification & Trust Platform Feature Flags
 * Governs Demo vs Production behavior and feature toggles across UI components.
 */

export const FEATURE_FLAGS = {
  DEMO_MODE: true,
  VERIFICATION: true,
  TRUST_SCORE: true,
  PROPERTY_VERIFICATION: true,
  TECHNICIAN_VERIFICATION: true,
  MANAGER_VERIFICATION: true,
  TENANT_VERIFICATION: true,
  FACE_VERIFICATION: false,
  DIGILOCKER: false,
  AADHAAR: false,
  PAN: false,
  BUSINESS_VERIFICATION: false,
  AUTO_REVIEW: true,
  MULTI_LEVEL_REVIEW: true,
  SLA_TRACKING: true,
};

export default FEATURE_FLAGS;
