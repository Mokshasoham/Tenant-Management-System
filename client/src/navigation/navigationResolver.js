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
  const category = (item.category || item.type || '').toLowerCase();
  const event = (item.event || '').toLowerCase();
  const entityType = (item.entityType || item.relatedModel || '').toLowerCase();
  let entityId = item.entityId || item.relatedId || item.relatedModelId;
  const redirectUrl = item.redirectUrl || item.link;

  const lowerTitle = (item.title || '').toLowerCase();
  const lowerMsg = (item.message || item.description || '').toLowerCase();

  // Extract Mongo ObjectId from redirectUrl/link if entityId is missing
  if (!entityId && redirectUrl) {
    const idMatch = redirectUrl.match(/([a-fA-F0-9]{24})/);
    if (idMatch) {
      entityId = idMatch[1];
    }
  }

  // Wrap return value with logging
  const res = (() => {
    // 2. Direct redirectUrl processing (if explicitly set)
    if (redirectUrl) {
      if (redirectUrl.startsWith('/bills') || redirectUrl.includes('bill')) {
        return ROUTES.bills(entityId);
      }
      if (redirectUrl.startsWith('/maintenance') || redirectUrl.includes('maintenance')) {
        return ROUTES.maintenance(entityId);
      }
      if (redirectUrl.startsWith('/bookings') || redirectUrl.includes('booking')) {
        return ROUTES.booking(entityId);
      }
      if (redirectUrl.startsWith('/my-lease') || redirectUrl.startsWith('/leases') || redirectUrl.includes('lease')) {
        return ROUTES.lease(userRole);
      }
      if (redirectUrl.startsWith('/messages') || redirectUrl.includes('message')) {
        const recipientId = item.createdBy || item.metadata?.senderId || (item.createdBy && item.createdBy._id ? item.createdBy._id : item.createdBy);
        return ROUTES.messages(recipientId || entityId);
      }
      if (redirectUrl.startsWith('/pay-now')) {
        return ROUTES.payNow(entityId);
      }
      if (redirectUrl.startsWith('/inspection')) {
        return ROUTES.inspection(entityId);
      }
      if (redirectUrl.startsWith('/deposit-settlement')) {
        return ROUTES.depositSettlement(entityId);
      }
      if (redirectUrl.startsWith('/lease-renewal') || redirectUrl.startsWith('/lease-history')) {
        return ROUTES.renewal(event);
      }
      if (redirectUrl.startsWith('/move-out')) {
        return ROUTES.moveOut();
      }
      if (redirectUrl.startsWith('/settings')) {
        return ROUTES.settings();
      }
      if (redirectUrl.startsWith('/profile')) {
        return ROUTES.profile();
      }
      return { path: redirectUrl, state: { targetEntityId: entityId } };
    }

    // 3. Matrix Resolution by Category / EntityType / Type String Matching
    const cat = category;
    const eType = entityType;

    // Booking (booking_created, booking_approved, booking_rejected, booking_cancelled, etc.)
    if (cat.includes('booking') || eType.includes('booking')) {
      return ROUTES.booking(entityId);
    }

    // Payments / Bills (payment_due, payment_received, payment_failed, bill_generated, invoice_created, etc.)
    if (cat.includes('payment') || cat.includes('bill') || cat.includes('invoice') || eType.includes('payment') || eType.includes('bill')) {
      if (event === 'failed' || cat.includes('failed') || lowerTitle.includes('failed') || lowerMsg.includes('failed')) {
        return ROUTES.payNow(entityId);
      }
      return ROUTES.bills(entityId);
    }

    // Lease / Agreement (lease_expiring, lease_active, lease_terminated, etc.)
    if (cat.includes('lease') || eType.includes('lease')) {
      if (cat.includes('renewal') || lowerTitle.includes('renewal')) {
        return ROUTES.renewal(event);
      }
      return ROUTES.lease(userRole);
    }

    // Renewal
    if (cat.includes('renewal')) {
      return ROUTES.renewal(event);
    }

    // Move out
    if (cat.includes('move')) {
      return ROUTES.moveOut();
    }

    // Inspection
    if (cat.includes('inspection') || eType.includes('inspection')) {
      return ROUTES.inspection(entityId);
    }

    // Deposit Settlement / Refund
    if (cat.includes('deposit') || cat.includes('refund') || eType.includes('deposit')) {
      return ROUTES.depositSettlement(entityId);
    }

    // Maintenance (maintenance_created, maintenance_update, maintenance_resolved)
    if (cat.includes('maintenance') || eType.includes('maintenance')) {
      return ROUTES.maintenance(entityId);
    }

    // Site / Property Visit
    if (cat.includes('visit') || eType.includes('visit') || lowerTitle.includes('visit') || lowerMsg.includes('visit')) {
      if (userRole === 'manager' || userRole === 'admin') {
        return ROUTES.dashboard();
      }
      return ROUTES.booking(entityId);
    }

    // Documents
    if (cat.includes('doc')) {
      return ROUTES.lease(userRole);
    }

    // Security / Settings
    if (cat.includes('security') || cat.includes('password') || cat.includes('setting')) {
      return ROUTES.settings();
    }

    // Profile
    if (cat.includes('profile') || cat.includes('user')) {
      return ROUTES.profile();
    }

    // Messages (message_received, chat_message, etc.)
    if (cat.includes('message') || cat.includes('chat') || eType.includes('message')) {
      const recipientId = item.createdBy || item.metadata?.senderId || (item.createdBy && item.createdBy._id ? item.createdBy._id : item.createdBy);
      return ROUTES.messages(recipientId || entityId);
    }

    // 4. Default module-specific fallback or dashboard
    return ROUTES.dashboard();
  })();

  console.log('[NavigationResolver] Output:', { resolvedPath: res.path, state: res.state, notification: item });
  return res;
};
