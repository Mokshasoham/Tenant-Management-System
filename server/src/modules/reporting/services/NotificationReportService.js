/**
 * server/src/modules/reporting/services/NotificationReportService.js
 *
 * Dedicated Report Service for System Notification Volumes and Engagement.
 */

import Notification from '../../../models/Notification.js';
import ReportResponseBuilder from '../builders/ReportResponseBuilder.js';

export class NotificationReportService {
  async generate(filters = {}) {
    const builder = new ReportResponseBuilder('notification');

    const [totalNotifications, unreadCount, readCount, recentNotifications] = await Promise.all([
      Notification.countDocuments(),
      Notification.countDocuments({ isRead: false }),
      Notification.countDocuments({ isRead: true }),
      Notification.find().sort({ createdAt: -1 }).limit(50).lean()
    ]);

    const readRate = totalNotifications > 0 ? Math.round((readCount / totalNotifications) * 100) : 0;

    builder
      .setSummary({ totalNotifications, unreadCount, readCount, readRate })
      .addKPI('notification_read_rate', 'Notification Read Rate', readRate, '%', readRate >= 70 ? 'positive' : 'neutral')
      .addKPI('unread_notifications', 'Unread Backlog', unreadCount, '', 'neutral')
      .addKPI('total_notifications', 'Total Dispatched', totalNotifications, '', 'positive')
      .setTable(
        ['Title', 'Category', 'Read Status', 'Created At'],
        recentNotifications.map(n => [
          n.title || 'System Notification',
          (n.category || 'General').toUpperCase(),
          n.isRead ? 'READ' : 'UNREAD',
          n.createdAt ? new Date(n.createdAt).toISOString().split('T')[0] : 'N/A'
        ])
      )
      .setMeta({ filters });

    return builder.build();
  }
}

const notificationReportServiceSingleton = new NotificationReportService();
export default notificationReportServiceSingleton;
