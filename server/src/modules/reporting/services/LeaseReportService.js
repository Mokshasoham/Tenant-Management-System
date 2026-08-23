/**
 * server/src/modules/reporting/services/LeaseReportService.js
 *
 * Dedicated Report Service for Lease Expirations, Renewals, and Portfolio Churn.
 */

import Lease from '../../../models/Lease.js';
import ReportResponseBuilder from '../builders/ReportResponseBuilder.js';
import { getManagerPropertyIds } from '../../../utils/managerHelper.js';

export class LeaseReportService {
  async generate(filters = {}, userId = null, role = null) {
    const builder = new ReportResponseBuilder('lease');
    const daysWindow = parseInt(filters.daysWindow || '60', 10);

    const now = new Date();
    const futureDate = new Date();
    futureDate.setDate(futureDate.getDate() + daysWindow);

    let queryFilter = {};
    if (role === 'manager' && userId) {
      const propIds = await getManagerPropertyIds(userId);
      if (propIds.length === 0) {
        builder
          .setSummary({ activeLeases: 0, expiringLeases: 0, daysWindow })
          .addKPI('active_leases', 'Active Leases', 0, '', 'positive')
          .addKPI('expiring_leases', `Expiring in ${daysWindow} Days`, 0, '', 'neutral')
          .addChart('bar', 'Leases by Status', [], { x: 'status', y: 'count' })
          .setTable(['Lease ID', 'Rent (₹)', 'End Date', 'Status'], [])
          .setMeta({ filters });
        return builder.build();
      }
      queryFilter.property = { $in: propIds };
    }

    const matchStage = Object.keys(queryFilter).length > 0 ? [{ $match: queryFilter }] : [];

    const [activeLeases, expiringLeasesCount, leaseStatusCounts, expiringLeasesList] = await Promise.all([
      Lease.countDocuments({ ...queryFilter, status: 'active' }),
      Lease.countDocuments({
        ...queryFilter,
        status: 'active',
        endDate: { $gte: now, $lte: futureDate }
      }),
      Lease.aggregate([
        ...matchStage,
        { $group: { _id: '$status', count: { $sum: 1 } } }
      ]),
      Lease.find({
        ...queryFilter,
        status: 'active',
        endDate: { $gte: now, $lte: futureDate }
      }).limit(50).lean()
    ]);

    const chartData = leaseStatusCounts.map(item => ({
      status: (item._id || 'unknown').toUpperCase(),
      count: item.count
    }));

    builder
      .setSummary({ activeLeases, expiringLeases: expiringLeasesCount, daysWindow })
      .addKPI('active_leases', 'Active Leases', activeLeases, '', 'positive')
      .addKPI('expiring_leases', `Expiring in ${daysWindow} Days`, expiringLeasesCount, '', expiringLeasesCount > 5 ? 'warning' : 'neutral')
      .addChart('bar', 'Leases by Status', chartData, { x: 'status', y: 'count' })
      .setTable(
        ['Lease ID', 'Rent (₹)', 'End Date', 'Status'],
        expiringLeasesList.map(l => [
          String(l._id).substring(0, 8),
          `₹${(l.rentAmount || 0).toLocaleString('en-IN')}`,
          l.endDate ? new Date(l.endDate).toISOString().split('T')[0] : 'N/A',
          (l.status || 'unknown').toUpperCase()
        ])
      )
      .setMeta({ filters });

    return builder.build();
  }
}

const leaseReportServiceSingleton = new LeaseReportService();
export default leaseReportServiceSingleton;
