/**
 * server/src/modules/reporting/services/PaymentReportService.js
 *
 * Dedicated Report Service for Detailed Payment Audits and Collection Performance.
 */

import Payment from '../../../models/Payment.js';
import ReportResponseBuilder from '../builders/ReportResponseBuilder.js';

export class PaymentReportService {
  async generate(filters = {}) {
    const builder = new ReportResponseBuilder('payment');

    const [totalPayments, paidPayments, overduePayments, pendingPayments, methodBreakdown] = await Promise.all([
      Payment.countDocuments(),
      Payment.countDocuments({ status: 'paid' }),
      Payment.countDocuments({ status: 'overdue' }),
      Payment.countDocuments({ status: 'pending' }),
      Payment.aggregate([
        { $match: { status: 'paid' } },
        { $group: { _id: '$paymentMethod', count: { $sum: 1 }, total: { $sum: '$amountPaid' } } }
      ])
    ]);

    const collectionRate = totalPayments > 0 ? Math.round((paidPayments / totalPayments) * 100) : 0;

    const chartData = methodBreakdown.map(item => ({
      method: item._id || 'Standard/Online',
      count: item.count,
      totalAmount: item.total
    }));

    builder
      .setSummary({ totalPayments, paidPayments, overduePayments, pendingPayments, collectionRate })
      .addKPI('payment_collection_rate', 'Collection Rate', collectionRate, '%', collectionRate >= 90 ? 'positive' : 'negative')
      .addKPI('paid_payments_count', 'Paid Transactions', paidPayments, '', 'positive')
      .addKPI('overdue_payments_count', 'Overdue Payments', overduePayments, '', 'negative')
      .addChart('bar', 'Revenue by Payment Method', chartData, { x: 'method', y: 'totalAmount' })
      .setMeta({ filters });

    return builder.build();
  }
}

const paymentReportServiceSingleton = new PaymentReportService();
export default paymentReportServiceSingleton;
