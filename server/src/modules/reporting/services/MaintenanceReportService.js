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

    const [totalTickets, openTickets, resolvedTickets, categoryBreakdown] = await Promise.all([
      Maintenance.countDocuments(),
      Maintenance.countDocuments({ status: { $in: ['open', 'in_progress'] } }),
      Maintenance.countDocuments({ status: 'resolved' }),
      Maintenance.aggregate([
        { $group: { _id: '$category', count: { $sum: 1 } } }
      ])
    ]);

    const chartData = categoryBreakdown.map(item => ({
      category: item._id || 'general',
      count: item.count
    }));

    builder
      .setSummary({ totalTickets, openTickets, resolvedTickets })
      .addKPI('open_maintenance_tickets', 'Open Tickets', openTickets, '', openTickets > 5 ? 'warning' : 'positive')
      .addKPI('resolved_maintenance_tickets', 'Resolved Tickets', resolvedTickets, '', 'positive')
      .addChart('bar', 'Work Orders by Category', chartData, { x: 'category', y: 'count' })
      .setMeta({ filters });

    return builder.build();
  }
}

const maintenanceReportServiceSingleton = new MaintenanceReportService();
export default maintenanceReportServiceSingleton;
