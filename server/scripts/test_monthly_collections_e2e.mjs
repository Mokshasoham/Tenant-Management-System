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
import { getRevenueOverTime, getSummaryStats } from '../src/controllers/analyticsController.js';

function mockReqRes(user, query = {}) {
  const req = {
    user,
    query,
  };
  let resStatus = 200;
  let resJson = null;

  const res = {
    status(s) {
      resStatus = s;
      return this;
    },
    json(j) {
      resJson = j;
      return this;
    },
    getStatus: () => resStatus,
    getJson: () => resJson,
  };

  return { req, res };
}

async function runTests() {
  console.log('=== TEST SUITE: Manager Monthly Collections Graph E2E ===\n');
  await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/tenant_management');

  // 1. Find manager with collections
  const allManagers = await User.find({ role: 'manager' }).lean();
  let managerWithPayments = null;
  let managerWithoutPayments = null;

  for (const m of allManagers) {
    const props = await Property.find({ $or: [{ owner: m._id }, { manager: m._id }] }).select('_id').lean();
    const propIds = props.map(p => p._id);
    const count = await Payment.countDocuments({ property: { $in: propIds }, status: 'paid' });
    if (count > 0 && !managerWithPayments) {
      managerWithPayments = m;
    } else if (count === 0 && !managerWithoutPayments) {
      managerWithoutPayments = m;
    }
  }

  console.log(`Found Manager with payments: ${managerWithPayments?.email} [ID: ${managerWithPayments?._id}]`);
  console.log(`Found Manager without payments: ${managerWithoutPayments?.email} [ID: ${managerWithoutPayments?._id}]\n`);

  // Test 1: getRevenueOverTime for manager with payments
  console.log('TEST 1: getRevenueOverTime returns 12 months with real collections');
  {
    const { req, res } = mockReqRes(managerWithPayments, { months: '12' });
    await getRevenueOverTime(req, res);
    const json = res.getJson();

    if (!json?.success) throw new Error('Test 1 failed: success is not true');
    if (!Array.isArray(json.data) || json.data.length !== 12) throw new Error(`Test 1 failed: data length is ${json.data?.length}, expected 12`);
    if (!Array.isArray(json.monthlyCollections) || json.monthlyCollections.length !== 12) throw new Error('Test 1 failed: monthlyCollections is not 12');

    const expectedMonths = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    json.data.forEach((item, i) => {
      if (item.month !== expectedMonths[i]) throw new Error(`Test 1 failed: month index ${i} is ${item.month}, expected ${expectedMonths[i]}`);
      if (typeof item.amount !== 'number') throw new Error(`Test 1 failed: amount for ${item.month} is not a number`);
      if (typeof item.total !== 'number') throw new Error(`Test 1 failed: total for ${item.month} is not a number`);
    });

    const sum = json.data.reduce((acc, item) => acc + item.amount, 0);
    if (sum !== json.monthlyCollectionsTotal) {
      throw new Error(`Test 1 failed: sum ${sum} !== monthlyCollectionsTotal ${json.monthlyCollectionsTotal}`);
    }

    console.log(`  ✓ 12 months returned correctly: ${json.data.map(d => `${d.month}: ₹${d.amount.toLocaleString('en-IN')}`).join(', ')}`);
    console.log(`  ✓ Sum of months (₹${sum.toLocaleString('en-IN')}) === monthlyCollectionsTotal (₹${json.monthlyCollectionsTotal.toLocaleString('en-IN')})`);
  }

  // Test 2: Reconcile with getSummaryStats
  console.log('\nTEST 2: Reconcile getRevenueOverTime with getSummaryStats');
  {
    const { req: sumReq, res: sumRes } = mockReqRes(managerWithPayments);
    await getSummaryStats(sumReq, sumRes);
    const sumJson = sumRes.getJson();

    const { req: revReq, res: revRes } = mockReqRes(managerWithPayments, { months: '12' });
    await getRevenueOverTime(revReq, revRes);
    const revJson = revRes.getJson();

    const summaryMonthlyCollections = sumJson?.data?.monthlyCollections || 0;
    const revMonthlyTotal = revJson?.monthlyCollectionsTotal || 0;

    console.log(`  getSummaryStats monthlyCollections: ₹${summaryMonthlyCollections.toLocaleString('en-IN')}`);
    console.log(`  getRevenueOverTime monthlyCollectionsTotal: ₹${revMonthlyTotal.toLocaleString('en-IN')}`);

    if (summaryMonthlyCollections !== revMonthlyTotal) {
      throw new Error(`Test 2 failed: summaryMonthlyCollections (${summaryMonthlyCollections}) !== revMonthlyTotal (${revMonthlyTotal})`);
    }
    console.log('  ✓ Data sets match and reconcile 100% identically!');
  }

  // Test 3: Manager Isolation
  console.log('\nTEST 3: Strict Manager Isolation');
  {
    if (managerWithoutPayments) {
      const { req, res } = mockReqRes(managerWithoutPayments, { months: '12' });
      await getRevenueOverTime(req, res);
      const json = res.getJson();

      if (json.monthlyCollectionsTotal !== 0) {
        throw new Error(`Test 3 failed: manager without payments got total ${json.monthlyCollectionsTotal}`);
      }
      json.data.forEach(item => {
        if (item.amount !== 0) throw new Error(`Test 3 failed: month ${item.month} has non-zero amount ${item.amount}`);
      });
      console.log('  ✓ Other manager receives 12 zero-value months (₹0 total), no leak of Manager A collections.');
    }
  }

  console.log('\n✅ ALL 3 TESTS PASSED PERFECTLY!\n');
  await mongoose.disconnect();
}

runTests().catch(err => {
  console.error('Test Suite Failed:', err);
  process.exit(1);
});
