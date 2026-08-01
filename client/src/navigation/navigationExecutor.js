import { notificationService } from '../services/api';

/**
 * Executes navigation, performs post-navigation read marking, and handles development diagnostics.
 * 
 * @param {function} navigate - React Router navigate function
 * @param {object} item - Notification/Activity object
 * @param {object} resolution - Resolution object { path, state }
 * @param {string} role - User role
 */
export const executeNavigation = async (navigate, item, resolution, role) => {
  const startTime = performance.now();
  const { path, state } = resolution;

  let navResult = 'SUCCESS';

  try {
    // 1. Execute React Router Navigation First
    navigate(path, { state });

    // 2. Post-Navigation Background Mark-As-Read
    if (item && (!item.isRead && !item.read)) {
      try {
        if (item.eventId) {
          await notificationService.markV1Read(item._id);
        } else if (item._id) {
          await notificationService.markRead(item._id);
        }

        // Emit CustomEvent for instant badge state sync across visible views
        window.dispatchEvent(new CustomEvent('notificationMarkedRead', { detail: { id: item._id } }));
      } catch (err) {
        console.error('[NavigationExecutor] Failed background read update:', err);
      }
    }
  } catch (err) {
    navResult = 'NAVIGATION_FAILED';
    console.error('[NavigationExecutor] Navigation Error:', err);
  } finally {
    // 3. Development-Only Diagnostics Logging (Zero production overhead)
    if (import.meta.env.DEV) {
      const duration = Math.round(performance.now() - startTime);
      console.log(
        `%c[Navigation Diagnostics]\n` +
        `Event ID:      ${item?.eventId || 'N/A'}\n` +
        `Category:      ${item?.category || item?.type || 'unknown'}\n` +
        `Entity Type:   ${item?.entityType || item?.relatedModel || 'N/A'}\n` +
        `Entity ID:     ${item?.entityId || item?.relatedId || 'N/A'}\n` +
        `Target Route:  ${path}\n` +
        `Role:          ${role || 'guest'}\n` +
        `Result:        ${navResult}\n` +
        `Duration:      ${duration}ms`,
        'color: #10b981; font-weight: bold;'
      );
    }
  }
};
