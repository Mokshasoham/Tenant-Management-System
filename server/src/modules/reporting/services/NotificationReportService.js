/**
 * server/src/modules/reporting/services/NotificationReportService.js
 *
 * Dedicated Report Service for System Notification Volumes and Engagement.
 */

import mongoose from 'mongoose';
import ReportResponseBuilder from '../builders/ReportResponseBuilder.js';

export class NotificationReportService {
  async generate(filters = {}) {
    const builder = new ReportResponseBuilder('notification');
    const Notification = mongoose.models.Notification;

    if (!Notification) {
      builder.setSummary({ message: 'Notification collection inactive' }).setMeta({ filters });
      return builder.build();
    }

    const [totalNotifications, unreadCount, readCount] = await Promise.all([
      Notification.countDocuments(),
      Notification.countDocuments({ isRead: false }),
      Notification.countDocuments({ isRead: true })
    ]);

    const readRate = totalNotifications > 0 ? Math.round((readCount / totalNotifications) * 100) : 0;

    builder
      .setSummary({ totalNotifications, unreadCount, readCount, readRate })
      .addKPI('notification_read_rate', 'Notification Read Rate', readRate, '%', readRate >= 70 ? 'positive' : 'neutral')
      .addKPI('unread_notifications', 'Unread Backlog', unreadCount, '', 'neutral')
      .setMeta({ filters });

    return builder.build();
  }
}

const notificationReportServiceSingleton = new NotificationReportService();
export default notificationReportServiceSingleton;
