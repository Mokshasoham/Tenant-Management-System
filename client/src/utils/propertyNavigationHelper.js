/**
 * Future-Proof Property Navigation Helper
 * Role-agnostic navigation handler resolving proper workspace destination.
 */

import useAuthStore from '../context/authStore';

export function handleViewPropertyNavigation({ navigate, property, role, mode = 'default' }) {
  if (!navigate || !property) return;
  const propertyId = property._id || property.id || property;

  // Resolve role from parameters or fallback to active authStore state
  const activeRole = role || useAuthStore.getState()?.user?.role || 'tenant';

  switch (activeRole) {
    case 'admin':
    case 'super_admin':
    case 'compliance_officer':
    case 'auditor':
      navigate(`/admin/property/${propertyId}`);
      break;

    case 'manager':
    case 'regional_manager':
      navigate(`/manager/properties/${propertyId}`);
      break;

    case 'tenant':
    default:
      navigate(`/properties/${propertyId}`);
      break;
  }
}

export default handleViewPropertyNavigation;
