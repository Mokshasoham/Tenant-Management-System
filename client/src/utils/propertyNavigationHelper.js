/**
 * Future-Proof Property Navigation Helper
 * Role-agnostic navigation handler resolving proper workspace destination.
 */

export function handleViewPropertyNavigation({ navigate, property, role = 'tenant', mode = 'default' }) {
  if (!navigate || !property) return;
  const propertyId = property._id || property.id || property;

  switch (role) {
    case 'admin':
    case 'super_admin':
    case 'compliance_officer':
    case 'auditor':
      navigate(`/admin/property/${propertyId}`);
      break;

    case 'manager':
    case 'regional_manager':
      navigate(`/properties/${propertyId}`);
      break;

    case 'tenant':
    default:
      navigate(`/properties/${propertyId}`);
      break;
  }
}

export default handleViewPropertyNavigation;
