import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.join(__dirname, '../.env') });

import User from '../src/models/User.js';
import Property from '../src/models/Property.js';
import Payment from '../src/models/Payment.js';
import { getManagerPropertyIds } from '../src/utils/managerHelper.js';

async function check() {
  await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/tenant_management');
  console.log('Connected to DB');

  // Find all managers
  const managers = await User.find({ role: 'manager' }).lean();
  console.log(`Found ${managers.length} managers:`);

  for (const m of managers) {
    console.log(`\nManager: ${m.firstName} ${m.lastName} (${m.email}) [ID: ${m._id}]`);
    const propIds = await getManagerPropertyIds(m._id);
    console.log(`  Managed Property IDs (${propIds.length}):`, propIds);

    const properties = await Property.find({ _id: { $in: propIds } }).select('name status rentAmount').lean();
    console.log('  Properties:', properties.map(p => p.name));

    // Find all payments on these properties
    const payments = await Payment.find({ property: { $in: propIds } }).lean();
    console.log(`  Total Payments on managed properties: ${payments.length}`);

    const paidPayments = payments.filter(p => p.status === 'paid');
    console.log(`  Paid Payments: ${paidPayments.length}`);

    let totalAmount = 0;
    let totalAmountPaid = 0;

    for (const p of paidPayments) {
      totalAmount += (p.amount || 0);
      totalAmountPaid += (p.amountPaid || p.amount || 0);
      console.log(`    - ID: ${p._id}, status: ${p.status}, amount: ${p.amount}, amountPaid: ${p.amountPaid}, paymentDate: ${p.paymentDate}, paidAt: ${p.paidAt}, createdAt: ${p.createdAt}`);
    }

    console.log(`  Sum of amount for paid: ₹${totalAmount.toLocaleString('en-IN')}`);
    console.log(`  Sum of amountPaid for paid: ₹${totalAmountPaid.toLocaleString('en-IN')}`);

    // Check what getRevenueOverTime aggregation returns
    const months = 12;
    const since = new Date();
    since.setMonth(since.getMonth() - months);
    const matchFilter = { property: { $in: propIds }, status: 'paid' };

    const MONTH_NAMES = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const currentYear = new Date().getFullYear();

    const revenueAgg = await Payment.aggregate([
      { $match: matchFilter },
      {
        $project: {
          effectiveDate: {
            $ifNull: ['$paymentDate', { $ifNull: ['$paidAt', '$createdAt'] }]
          },
          effectiveAmount: {
            $ifNull: ['$amountPaid', '$amount']
          }
        }
      },
      {
        $project: {
          year: { $year: '$effectiveDate' },
          month: { $month: '$effectiveDate' },
          effectiveAmount: 1
        }
      },
      {
        $group: {
          _id: {
            year: '$year',
            month: '$month',
          },
          total: { $sum: '$effectiveAmount' },
          count: { $sum: 1 },
        },
      },
      { $sort: { '_id.year': 1, '_id.month': 1 } },
    ]);

    const monthlyMap = new Map();
    revenueAgg.forEach(item => {
      if (item._id && item._id.month >= 1 && item._id.month <= 12) {
        const currentTotal = monthlyMap.get(item._id.month) || 0;
        monthlyMap.set(item._id.month, currentTotal + (item.total || 0));
      }
    });

    const monthlyCollections = MONTH_NAMES.map((name, index) => {
      const monthNum = index + 1;
      const amount = monthlyMap.get(monthNum) || 0;
      return {
        _id: { year: currentYear, month: monthNum },
        month: name,
        amount,
        total: amount,
        count: revenueAgg.find(r => r._id?.month === monthNum)?.count || 0
      };
    });

    const monthlyCollectionsTotal = monthlyCollections.reduce((sum, item) => sum + item.amount, 0);

    console.log('  Calculated Monthly Collections:', monthlyCollections);
    console.log(`  Monthly Collections Total: ₹${monthlyCollectionsTotal.toLocaleString('en-IN')}`);
  }

  await mongoose.disconnect();
}

check();
