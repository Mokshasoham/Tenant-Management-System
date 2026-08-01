import { useNavigate } from 'react-router-dom';
import { bookingService, propertyService, leaseService, visitService } from '../services/api';
import useAuthStore from '../context/authStore';

/**
 * Reusable Custom Hook for Enterprise Action Center Navigation & Workflow dispatches
 */
export const useActionCenterNavigation = () => {
  const navigate = useNavigate();
  const user = useAuthStore((state) => state.user);
  const role = user?.role;

  /**
   * Dispatches and routes action elements, performing permissions/existence verification
   * @param {object} item - Action event activity
   * @param {function} [openDrawerCallback] - Optional callback to trigger sidebar drawers
   */
  const handleAction = async (item, openDrawerCallback) => {
    if (openDrawerCallback) {
      openDrawerCallback(item);
      return;
    }

    let redirectPath = '/dashboard';
    let navigationState = {};
    const lowerTitle = (item.title || '').toLowerCase();
    const lowerMsg = (item.message || item.description || '').toLowerCase();
    const entityId = item.entityId || item.relatedId;
    const entityType = item.entityType || item.relatedModel;

    try {
      // 1. Check if event specifies direct redirectUrl
      if (item.redirectUrl) {
        redirectPath = item.redirectUrl;
      } else {
        // 2. Backward-compatible mapping fallback based on titles and types
        if (lowerTitle.includes('visit') || lowerMsg.includes('visit') || entityType === 'PropertyVisit') {
          if (role === 'manager' || role === 'admin') {
            redirectPath = '/dashboard';
          } else {
            let propertyId = entityId;
            try {
              const myVisitsRes = await visitService.getMyVisits();
              const matchedVisit = myVisitsRes.data?.find(v => v._id === entityId || v.property?._id === entityId);
              if (matchedVisit) {
                propertyId = matchedVisit.property?._id || matchedVisit.property;
              }
            } catch (_) {}

            if (propertyId) {
              await propertyService.getPropertyById(propertyId);
              redirectPath = `/properties/${propertyId}`;
              navigationState = { activeBookingTab: 'visit' };
            }
          }
        } else if (item.type === 'message' || entityType === 'Message') {
          redirectPath = '/messages';
          if (entityId) {
            navigationState = { recipientId: entityId };
          }
        } else if (item.type === 'booking' || entityType === 'Booking') {
          if (role === 'manager' || role === 'admin') {
            redirectPath = '/dashboard';
          } else if (entityId) {
            await bookingService.getBookingById(entityId);
            redirectPath = `/bookings/${entityId}`;
          } else {
            redirectPath = '/browse';
          }
        } else if (item.type?.startsWith('lease') || entityType === 'Lease') {
          if (role === 'manager' || role === 'admin') {
            redirectPath = '/leases';
          } else {
            if (entityId) {
              await leaseService.getLeaseById(entityId);
            }
            redirectPath = '/my-lease';
          }
        } else if (item.type?.startsWith('payment') || entityType === 'Payment') {
          if (role === 'manager' || role === 'admin') {
            redirectPath = '/payments';
          } else {
            if (item.type.includes('due') || item.type.includes('overdue')) {
              redirectPath = '/pay-now';
              if (entityId) navigationState = { paymentId: entityId };
            } else {
              redirectPath = '/bills';
            }
          }
        } else if (item.type?.startsWith('maintenance') || entityType === 'Maintenance') {
          redirectPath = '/maintenance';
        } else if (item.type === 'property_created' || entityType === 'Property') {
          if (entityId) {
            await propertyService.getPropertyById(entityId);
            redirectPath = `/properties/${entityId}`;
          } else {
            redirectPath = '/browse';
          }
        }
      }

      // Execute internal react-router redirection
      navigate(redirectPath, { state: navigationState });
    } catch (err) {
      console.error('[ActionCenterNavigation] Error resolving resource:', err);
      if (err.response?.status === 403) {
        alert('Access Denied: You do not have permissions to view this resource.');
      } else {
        alert('Item No Longer Available: The resource was removed or is not available.');
      }
    }
  };

  return { handleAction };
};
