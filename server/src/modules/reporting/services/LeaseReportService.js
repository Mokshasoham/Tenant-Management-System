/**
 * server/src/modules/reporting/services/LeaseReportService.js
 *
 * Dedicated Report Service for Lease Expirations, Renewals, and Portfolio Churn.
 */

import Lease from '../../../models/Lease.js';
import ReportResponseBuilder from '../builders/ReportResponseBuilder.js';

export class LeaseReportService {
  async generate(filters = {}) {
    const builder = new ReportResponseBuilder('lease');
    const daysWindow = parseInt(filters.daysWindow || '60', 10);

    const now = new Date();
    const futureDate = new Date();
    futureDate.setDate(futureDate.getDate() + daysWindow);

    const [activeLeases, expiringLeases, leaseStatusCounts] = await Promise.all([
      Lease.countDocuments({ status: 'active' }),
      Lease.countDocuments({
        status: 'active',
        endDate: { $gte: now, $lte: futureDate }
      }),
      Lease.aggregate([
        { $group: { _id: '$status', count: { $sum: 1 } } }
      ])
    ]);

    const chartData = leaseStatusCounts.map(item => ({
      status: item._id,
      count: item.count
    }));

    builder
      .setSummary({ activeLeases, expiringLeases, daysWindow })
      .addKPI('active_leases', 'Active Leases', activeLeases, '', 'positive')
      .addKPI('expiring_leases', `Expiring in ${daysWindow} Days`, expiringLeases, '', expiringLeases > 5 ? 'warning' : 'neutral')
      .addChart('bar', 'Leases by Status', chartData, { x: 'status', y: 'count' })
      .setMeta({ filters });

    return builder.build();
  }
}

const leaseReportServiceSingleton = new LeaseReportService();
export default leaseReportServiceSingleton;
