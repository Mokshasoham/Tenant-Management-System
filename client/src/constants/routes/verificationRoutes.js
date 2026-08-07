/**
 * Verification & Trust Platform Centralized Route Definitions
 */

export const VERIFICATION_ROUTES = {
  TENANT_VERIFICATION: '/tenant/verification',
  MANAGER_VERIFICATION: '/manager/verification',
  TECHNICIAN_VERIFICATION: '/technician/verification',
  PROPERTY_VERIFICATION: '/property/verification',
  ADMIN_VERIFICATION_CENTER: '/admin/verification-center',
  VERIFICATION_DETAILS: (id) => `/verification/${id}`,
  VERIFICATION_HISTORY: (type, id) => `/verification/history/${type}/${id}`,
  INTERNAL_GALLERY: '/dev/verification-gallery',
};

export default VERIFICATION_ROUTES;
