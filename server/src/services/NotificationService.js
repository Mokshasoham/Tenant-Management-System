import mongoose from 'mongoose';
import Notification from '../models/Notification.js';
import logger from '../platform/logging/logger.js';
import { emitToUser } from '../socket/socketEmitter.js';
import { toNotificationDTO } from '../modules/lease-renewal/notifications/notificationMapper.js';

/**
 * Centralized NotificationService for Backend Application.
 * Guarantees schema consistency, default fallbacks, and standard field mappings
 * across all system notifications, with real-time socket emission.
 */
export class NotificationService {
  /**
   * Centralized method to create a Notification document.
   * 
   * @param {Object} params
   * @returns {Promise<Object>} Created Notification document or DTO
   */
  static async notify(params = {}) {
    const {
      recipient,
      title,
      message,
      description,
      category,
      priority = 'medium',
      severity = 'information',
      type = 'info',
      actionUrl,
      redirectUrl,
      link,
      sourceModule,
      source = 'SYSTEM',
      entityType = 'Lease',
      entityId,
      eventId,
      idempotencyKey,
      metadata = {},
      createdBy
    } = params;

    if (!recipient || !title || (!message && !description)) {
      logger.warn('[NotificationService.notify] Missing required fields (recipient, title, or message). Aborting.');
      return null;
    }

    const msgText = message || description;

    // Infer category if missing or generic 'system'
    let resolvedCategory = category;
    if (!resolvedCategory || resolvedCategory === 'system') {
      const lowerTitle = title.toLowerCase();
      const lowerMsg = msgText.toLowerCase();

      if (lowerTitle.includes('payment') || lowerMsg.includes('payment') || lowerTitle.includes('rent')) {
        resolvedCategory = 'payments';
      } else if (lowerTitle.includes('renewal') || lowerMsg.includes('renewal')) {
        resolvedCategory = 'renewal';
      } else if (lowerTitle.includes('lease') || lowerMsg.includes('lease')) {
        resolvedCategory = 'lease';
      } else if (lowerTitle.includes('maintenance') || lowerMsg.includes('maintenance')) {
        resolvedCategory = 'maintenance';
      } else if (lowerTitle.includes('booking') || lowerMsg.includes('booking')) {
        resolvedCategory = 'booking';
      } else if (lowerTitle.includes('message') || lowerMsg.includes('message')) {
        resolvedCategory = 'messages';
      } else {
        resolvedCategory = 'system';
      }
    }

    const resolvedUrl = actionUrl || redirectUrl || link || '/notifications';
    const resolvedModule = sourceModule || resolvedCategory || 'system';

    try {
      // Create Notification directly via Notification.create
      const notificationDoc = await Notification.create({
        recipient,
        title,
        message: msgText,
        description: msgText,
        type,
        category: resolvedCategory,
        priority,
        severity,
        actionUrl: resolvedUrl,
        redirectUrl: resolvedUrl,
        link: resolvedUrl,
        sourceModule: resolvedModule,
        source,
        entityType,
        entityId,
        eventId,
        idempotencyKey,
        metadata,
        createdBy,
        isRead: false,
        read: false,
        isArchived: false,
        isDeleted: false
      });

      // Emit real-time WebSocket event to active user session
      try {
        emitToUser(recipient, 'new_event', {
          recipient,
          title,
          description: msgText,
          category: resolvedCategory,
          actionUrl: resolvedUrl
        });
      } catch (wsErr) {
        // Non-blocking socket emission error
      }

      logger.info(`[NotificationService] Created notification "${title}" for recipient ${recipient} [Category: ${resolvedCategory}]`);
      return toNotificationDTO(notificationDoc);
    } catch (err) {
      if (err.code === 11000) {
        logger.warn(`[NotificationService] Duplicate notification skipped for idempotencyKey "${idempotencyKey}".`);
        return null;
      }
      logger.error(`[NotificationService] Failed to create notification "${title}":`, err.message);
      throw err;
    }
  }
}

export default NotificationService;
