/**
 * server/src/modules/reporting/services/PaymentReportService.js
 *
 * Dedicated Report Service for Detailed Payment Audits and Collection Performance.
 */

import Payment from '../../../models/Payment.js';
import ReportResponseBuilder from '../builders/ReportResponseBuilder.js';
import { getManagerPropertyIds } from '../../../utils/managerHelper.js';

export class PaymentReportService {
  async generate(filters = {}, userId = null, role = null) {
    const builder = new ReportResponseBuilder('payment');
    let queryFilter = {};

    if (role === 'manager' && userId) {
      const propIds = await getManagerPropertyIds(userId);
      if (propIds.length === 0) {
        builder
          .setSummary({ totalPayments: 0, paidPayments: 0, overduePayments: 0, pendingPayments: 0, collectionRate: 0 })
          .addKPI('payment_collection_rate', 'Collection Rate', 0, '%', 'neutral')
          .addKPI('paid_payments_count', 'Paid Transactions', 0, '', 'positive')
          .addKPI('overdue_payments_count', 'Overdue Payments', 0, '', 'neutral')
          .addChart('bar', 'Revenue by Payment Method', [], { x: 'method', y: 'totalAmount' })
          .setTable(['Payment ID', 'Amount (₹)', 'Method', 'Status', 'Date'], [])
          .setMeta({ filters });
        return builder.build();
      }
      queryFilter.property = { $in: propIds };
    }

    const matchPaid = { ...queryFilter, status: 'paid' };

    const [totalPayments, paidPayments, overduePayments, pendingPayments, methodBreakdown, recentPayments] = await Promise.all([
      Payment.countDocuments(queryFilter),
      Payment.countDocuments({ ...queryFilter, status: 'paid' }),
      Payment.countDocuments({ ...queryFilter, status: 'overdue' }),
      Payment.countDocuments({ ...queryFilter, status: 'pending' }),
      Payment.aggregate([
        { $match: matchPaid },
        { $group: { _id: '$paymentMethod', count: { $sum: 1 }, total: { $sum: '$amountPaid' } } }
      ]),
      Payment.find(queryFilter).sort({ createdAt: -1 }).limit(50).lean()
    ]);

    const collectionRate = totalPayments > 0 ? Math.round((paidPayments / totalPayments) * 100) : 0;

    const chartData = methodBreakdown.map(item => ({
      method: (item._id || 'Standard/Online').toUpperCase(),
      count: item.count,
      totalAmount: item.total
    }));

    builder
      .setSummary({ totalPayments, paidPayments, overduePayments, pendingPayments, collectionRate })
      .addKPI('payment_collection_rate', 'Collection Rate', collectionRate, '%', collectionRate >= 90 ? 'positive' : 'negative')
      .addKPI('paid_payments_count', 'Paid Transactions', paidPayments, '', 'positive')
      .addKPI('overdue_payments_count', 'Overdue Payments', overduePayments, '', 'negative')
      .addChart('bar', 'Revenue by Payment Method', chartData, { x: 'method', y: 'totalAmount' })
      .setTable(
        ['Payment ID', 'Amount (₹)', 'Method', 'Status', 'Date'],
        recentPayments.map(p => [
          String(p._id).substring(0, 8),
          `₹${(p.amountPaid || p.amount || 0).toLocaleString('en-IN')}`,
          (p.paymentMethod || 'Online').toUpperCase(),
          (p.status || 'unknown').toUpperCase(),
          p.paymentDate ? new Date(p.paymentDate).toISOString().split('T')[0] : 'N/A'
        ])
      )
      .setMeta({ filters });

    return builder.build();
  }
}

const paymentReportServiceSingleton = new PaymentReportService();
export default paymentReportServiceSingleton;
