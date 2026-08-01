import { ROUTES } from './navigationRegistry';

/**
 * Resolves destination path and location state for any notification or activity item.
 * Automatically performs runtime conversion for legacy notification objects.
 * 
 * @param {object} item - Notification or Activity object
 * @param {string} userRole - Logged in user role ('tenant' | 'manager' | 'admin')
 * @returns {{ path: string, state: object }} Resolution payload
 */
export const resolveNavigation = (item, userRole) => {
  if (!item) {
    return ROUTES.dashboard();
  }

  // 1. Extract modern metadata or fallback to legacy properties (runtime conversion)
  const category = item.category || item.type;
  const event = item.event;
  const entityType = item.entityType || item.relatedModel;
  const entityId = item.entityId || item.relatedId || item.relatedModelId;
  const redirectUrl = item.redirectUrl || item.link;

  const lowerTitle = (item.title || '').toLowerCase();
  const lowerMsg = (item.message || item.description || '').toLowerCase();

  // 2. Direct redirectUrl processing (if explicitly set)
  if (redirectUrl) {
    if (redirectUrl.startsWith('/bills')) {
      return ROUTES.bills(entityId);
    }
    if (redirectUrl.startsWith('/maintenance')) {
      return ROUTES.maintenance(entityId);
    }
    if (redirectUrl.startsWith('/bookings') && entityId) {
      return ROUTES.booking(entityId);
    }
    if (redirectUrl.startsWith('/my-lease') || redirectUrl.startsWith('/leases')) {
      return ROUTES.lease(userRole);
    }
    if (redirectUrl.startsWith('/messages')) {
      const recipientId = item.createdBy || item.metadata?.senderId || (item.createdBy && item.createdBy._id ? item.createdBy._id : item.createdBy);
      return ROUTES.messages(recipientId || entityId);
    }
    return { path: redirectUrl, state: { targetEntityId: entityId } };
  }

  // 3. Matrix Resolution by Category / EntityType
  if (category === 'booking' || entityType === 'Booking') {
    return ROUTES.booking(entityId);
  }

  if (category === 'payments' || category === 'billing' || entityType === 'Payment' || entityType === 'Bill') {
    if (event === 'failed' || lowerTitle.includes('failed') || lowerMsg.includes('failed')) {
      return ROUTES.payNow(entityId);
    }
    return ROUTES.bills(entityId);
  }

  if (category === 'lease' || entityType === 'Lease') {
    return ROUTES.lease(userRole);
  }

  if (category === 'renewal' || category === 'lease_renewal') {
    return ROUTES.renewal(event);
  }

  if (category === 'move-out' || category === 'move_out') {
    return ROUTES.moveOut();
  }

  if (category === 'inspection' || entityType === 'Inspection') {
    return ROUTES.inspection(entityId);
  }

  if (category === 'deposit_settlement' || category === 'refund') {
    return ROUTES.depositSettlement(entityId);
  }

  if (category === 'maintenance' || entityType === 'Maintenance') {
    return ROUTES.maintenance(entityId);
  }

  if (category === 'visit' || entityType === 'PropertyVisit' || lowerTitle.includes('visit') || lowerMsg.includes('visit')) {
    if (userRole === 'manager' || userRole === 'admin') {
      return ROUTES.dashboard();
    }
    return ROUTES.booking(entityId);
  }

  if (category === 'documents' || category === 'document') {
    return ROUTES.lease(userRole);
  }

  if (category === 'security') {
    return ROUTES.settings();
  }

  if (category === 'profile') {
    return ROUTES.profile();
  }

  if (category === 'message' || category === 'messages' || entityType === 'Message') {
    const recipientId = item.createdBy || item.metadata?.senderId || (item.createdBy && item.createdBy._id ? item.createdBy._id : item.createdBy);
    return ROUTES.messages(recipientId || entityId);
  }

  // 4. Default module-specific fallback or dashboard
  return ROUTES.dashboard();
};
