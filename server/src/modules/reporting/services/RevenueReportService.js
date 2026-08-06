/**
 * server/src/modules/reporting/services/RevenueReportService.js
 *
 * Dedicated Report Service for Financial Revenue Analysis.
 */

import Payment from '../../../models/Payment.js';
import ReportResponseBuilder from '../builders/ReportResponseBuilder.js';

export class RevenueReportService {
  async generate(filters = {}) {
    const builder = new ReportResponseBuilder('revenue');
    const months = parseInt(filters.months || '12', 10);

    const since = new Date();
    since.setMonth(since.getMonth() - months);

    const matchQuery = { status: 'paid', paymentDate: { $gte: since } };
    if (filters.propertyId) matchQuery.property = filters.propertyId;

    const [revenueData, totalStats] = await Promise.all([
      Payment.aggregate([
        { $match: matchQuery },
        {
          $group: {
            _id: {
              year: { $year: '$paymentDate' },
              month: { $month: '$paymentDate' }
            },
            total: { $sum: '$amountPaid' },
            count: { $sum: 1 }
          }
        },
        { $sort: { '_id.year': 1, '_id.month': 1 } }
      ]),
      Payment.aggregate([
        { $match: matchQuery },
        {
          $group: {
            _id: null,
            totalRevenue: { $sum: '$amountPaid' },
            totalTransactions: { $sum: 1 }
          }
        }
      ])
    ]);

    const totalRev = totalStats[0]?.totalRevenue || 0;
    const totalCount = totalStats[0]?.totalTransactions || 0;

    builder
      .setSummary({ totalRevenue: totalRev, transactionCount: totalCount, monthsAnalyzed: months })
      .addKPI('total_revenue', 'Total Collected Revenue', totalRev, '$', 'positive')
      .addKPI('transaction_count', 'Total Payments Processed', totalCount, '', 'neutral')
      .addChart('area', 'Revenue Over Time', revenueData.map(r => ({
        month: `${r._id.year}-${String(r._id.month).padStart(2, '0')}`,
        revenue: r.total,
        count: r.count
      })), { x: 'month', y: 'revenue' })
      .setTrends(revenueData)
      .setMeta({ filters });

    return builder.build();
  }
}

const revenueReportServiceSingleton = new RevenueReportService();
export default revenueReportServiceSingleton;
