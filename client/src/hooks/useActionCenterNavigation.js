import { useNavigate } from 'react-router-dom';
import useAuthStore from '../context/authStore';
import { resolveNavigation } from '../navigation/navigationResolver';
import { executeNavigation } from '../navigation/navigationExecutor';

/**
 * Reusable Custom Hook for Enterprise Action Center Navigation & Workflow dispatches.
 */
export const useActionCenterNavigation = () => {
  const navigate = useNavigate();
  const user = useAuthStore((state) => state.user);
  const role = (user?.role || '').toLowerCase();

  /**
   * Dispatches and routes action elements.
   * 
   * @param {object} item - Action event or notification activity
   * @param {function} [openDrawerCallback] - Optional callback to trigger sidebar drawers
   */
  const handleAction = async (item, openDrawerCallback) => {
    console.log('[Navigation] handleAction invoked with item:', {
      _id: item?._id,
      category: item?.category,
      event: item?.event,
      entityType: item?.entityType,
      entityId: item?.entityId,
      redirectUrl: item?.redirectUrl,
      action: item?.action,
      metadata: item?.metadata,
      relatedId: item?.relatedId,
      relatedModel: item?.relatedModel,
      link: item?.link,
      type: item?.type
    });

    if (openDrawerCallback) {
      openDrawerCallback(item);
      return;
    }

    const resolution = resolveNavigation(item, role);
    await executeNavigation(navigate, item, resolution, role);
  };

  return { handleAction };
};
