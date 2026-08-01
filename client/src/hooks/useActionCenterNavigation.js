import { useNavigate } from 'react-router-dom';
import { bookingService, propertyService, leaseService, visitService, notificationService } from '../services/api';
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

    const entityId = item.entityId || item.relatedId || item.relatedModelId;
    const entityType = item.entityType || item.relatedModel;
    const category = item.category || item.type;
    const event = item.event;

    // 1. Instantly mark the notification/message as read in the background (no refresh)
    if (!item.isRead && !item.read) {
      try {
        if (item.eventId) {
          // V1 event structure
          await notificationService.markV1Read(item._id);
        } else {
          // Legacy structure
          await notificationService.markRead(item._id);
        }
        // Emit a decoupled CustomEvent to update states across all visible list controls instantly
        window.dispatchEvent(new CustomEvent('notificationMarkedRead', { detail: { id: item._id } }));
      } catch (err) {
        console.error('[ActionCenterNavigation] Failed to mark event as read:', err);
      }
    }

    let redirectPath = '/dashboard';
    let navigationState = {};
    const lowerTitle = (item.title || '').toLowerCase();
    const lowerMsg = (item.message || item.description || '').toLowerCase();

    try {
      // 2. Perform validation checks and resolve path according to category + event metadata
      if (item.redirectUrl) {
        redirectPath = item.redirectUrl;
        // Inject scrolling context if going to list screens
        if (redirectPath.startsWith('/bills')) {
          redirectPath = `/bills?billId=${entityId}`;
          navigationState = { targetEntityId: entityId, openDetails: true, highlight: true };
        } else if (redirectPath.startsWith('/maintenance')) {
          redirectPath = `/maintenance?maintenanceId=${entityId}`;
          navigationState = { targetEntityId: entityId, highlight: true };
        }
      } else {
        // Fallback or explicit mapping matrix
        if (category === 'booking' || entityType === 'Booking') {
          if (!entityId) {
            redirectPath = '/browse';
          } else {
            // Check if booking exists
            const bookingRes = await bookingService.getBookingById(entityId);
            const booking = bookingRes.data || bookingRes;
            
            if (event === 'approved') {
              // If booking is approved and lease is already created, navigate to lease history or my-lease
              if (booking.lease || booking.leaseId) {
                redirectPath = role === 'tenant' ? '/my-lease' : '/leases';
              } else {
                redirectPath = `/bookings/${entityId}`;
              }
            } else {
              // Booking submitted / rejected
              redirectPath = `/bookings/${entityId}`;
            }
          }
        } else if (category === 'payments' || category === 'billing' || entityType === 'Payment' || entityType === 'Bill') {
          if (event === 'failed' || lowerTitle.includes('failed') || lowerMsg.includes('failed')) {
            redirectPath = '/pay-now';
            navigationState = { paymentId: entityId };
          } else {
            // payment successful / rent due / invoice generated
            redirectPath = `/bills?billId=${entityId}`;
            navigationState = { targetEntityId: entityId, openDetails: true, highlight: true };
          }
        } else if (category === 'lease' || entityType === 'Lease') {
          if (entityId) {
            await leaseService.getLeaseById(entityId);
          }
          redirectPath = role === 'tenant' ? '/my-lease' : '/leases';
        } else if (category === 'renewal' || category === 'lease_renewal') {
          if (event === 'approved') {
            redirectPath = '/lease-history';
          } else {
            redirectPath = '/lease-renewal';
          }
        } else if (category === 'move-out' || category === 'move_out') {
          redirectPath = '/move-out';
        } else if (category === 'inspection' || entityType === 'Inspection') {
          if (entityId) {
            redirectPath = `/inspection/${entityId}`;
          } else {
            redirectPath = '/dashboard';
          }
        } else if (category === 'deposit_settlement' || category === 'refund') {
          if (entityId) {
            redirectPath = `/deposit-settlement/${entityId}`;
          } else {
            redirectPath = '/dashboard';
          }
        } else if (category === 'maintenance' || entityType === 'Maintenance') {
          redirectPath = `/maintenance?maintenanceId=${entityId}`;
          navigationState = { targetEntityId: entityId, highlight: true };
        } else if (category === 'visit' || entityType === 'PropertyVisit' || lowerTitle.includes('visit') || lowerMsg.includes('visit')) {
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
        } else if (category === 'documents' || category === 'document') {
          redirectPath = role === 'tenant' ? '/my-lease' : '/leases';
        } else if (category === 'security' || category === 'profile') {
          redirectPath = category === 'security' ? '/settings' : '/profile';
        } else if (category === 'message' || entityType === 'Message') {
          redirectPath = '/messages';
          if (entityId) {
            navigationState = { recipientId: entityId };
          }
        }
      }

      // Execute internal react-router redirection
      navigate(redirectPath, { state: navigationState });
    } catch (err) {
      console.error('[ActionCenterNavigation] Error resolving resource:', err);
      if (err.response?.status === 403) {
        alert("You don't have permission to access this resource.");
      } else {
        alert('This item is no longer available.');
      }
    }
  };

  return { handleAction };
};
