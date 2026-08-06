/**
 * server/src/modules/reporting/services/MaintenanceReportService.js
 *
 * Dedicated Report Service for Maintenance Work Orders and Resolution Velocity.
 */

import Maintenance from '../../../models/Maintenance.js';
import ReportResponseBuilder from '../builders/ReportResponseBuilder.js';

export class MaintenanceReportService {
  async generate(filters = {}) {
    const builder = new ReportResponseBuilder('maintenance');

    const [totalTickets, openTickets, resolvedTickets, categoryBreakdown, recentWorkOrders] = await Promise.all([
      Maintenance.countDocuments(),
      Maintenance.countDocuments({ status: { $in: ['open', 'in_progress'] } }),
      Maintenance.countDocuments({ status: 'resolved' }),
      Maintenance.aggregate([
        { $group: { _id: '$category', count: { $sum: 1 } } }
      ]),
      Maintenance.find().sort({ createdAt: -1 }).limit(50).lean()
    ]);

    const chartData = categoryBreakdown.map(item => ({
      category: (item._id || 'general').toUpperCase(),
      count: item.count
    }));

    builder
      .setSummary({ totalTickets, openTickets, resolvedTickets })
      .addKPI('open_maintenance_tickets', 'Open Tickets', openTickets, '', openTickets > 5 ? 'warning' : 'positive')
      .addKPI('resolved_maintenance_tickets', 'Resolved Tickets', resolvedTickets, '', 'positive')
      .addChart('bar', 'Work Orders by Category', chartData, { x: 'category', y: 'count' })
      .setTable(
        ['Title', 'Category', 'Priority', 'Status', 'Created At'],
        recentWorkOrders.map(m => [
          m.title || 'Untitled Ticket',
          (m.category || 'General').toUpperCase(),
          (m.priority || 'Medium').toUpperCase(),
          (m.status || 'Open').toUpperCase(),
          m.createdAt ? new Date(m.createdAt).toISOString().split('T')[0] : 'N/A'
        ])
      )
      .setMeta({ filters });

    return builder.build();
  }
}

const maintenanceReportServiceSingleton = new MaintenanceReportService();
export default maintenanceReportServiceSingleton;
