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
import { getPaymentStats, getAllPayments } from '../src/controllers/paymentController.js';

function mockReqRes(user, query = {}) {
  const req = {
    user,
    query,
    headers: {},
    protocol: 'http',
    get: () => 'localhost:5000'
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
  console.log('=== TEST SUITE: Manager Payments & Revenue Center Summary E2E ===\n');
  await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/tenant_management');

  // Find manager who manages properties with payments
  const allManagers = await User.find({ role: 'manager' }).lean();
  let targetManager = null;
  let isolatedManager = null;

  for (const m of allManagers) {
    const props = await Property.find({ $or: [{ owner: m._id }, { manager: m._id }] }).select('_id').lean();
    const propIds = props.map(p => p._id);
    const count = await Payment.countDocuments({ property: { $in: propIds }, status: 'paid' });
    if (count > 0 && !targetManager) {
      targetManager = m;
    } else if (count === 0 && !isolatedManager) {
      isolatedManager = m;
    }
  }

  console.log(`Target Manager: ${targetManager?.email} [ID: ${targetManager?._id}]`);
  console.log(`Isolated Manager: ${isolatedManager?.email} [ID: ${isolatedManager?._id}]\n`);

  // TEST 1: Table records & Summary Stats Consistency
  console.log('TEST 1: Verify Table records & Summary Stats match directly from dataset');
  {
    const { req: getReq, res: getRes } = mockReqRes(targetManager, { limit: '100' });
    await getAllPayments(getReq, getRes);
    const tableData = getRes.getJson()?.data || [];

    const { req: statReq, res: statRes } = mockReqRes(targetManager);
    await getPaymentStats(statReq, statRes);
    const statData = statRes.getJson()?.data || {};

    console.log(`  Table records count: ${tableData.length}`);
    console.log(`  Summary stats:`, statData);

    let calculatedCollected = 0;
    let calculatedPaid = 0;
    let calculatedPending = 0;
    let calculatedOverdue = 0;
    const now = new Date();

    tableData.forEach(p => {
      const st = (p.status || '').toLowerCase().trim();
      const amount = Number(p.amount) || 0;
      const amountPaid = Number(p.amountPaid) || 0;
      const isPastDue = p.dueDate && new Date(p.dueDate) < now;

      if (st === 'paid') {
        calculatedPaid++;
        calculatedCollected += (amountPaid > 0 ? amountPaid : amount);
      } else if (st === 'pending') {
        if (isPastDue) calculatedOverdue++;
        else calculatedPending++;
      } else if (st === 'overdue') {
        calculatedOverdue++;
      }
    });

    if (calculatedPaid !== statData.paidPayments) {
      throw new Error(`Test 1 Failed: calculatedPaid (${calculatedPaid}) !== statData.paidPayments (${statData.paidPayments})`);
    }
    if (calculatedCollected !== statData.totalCollected) {
      throw new Error(`Test 1 Failed: calculatedCollected (${calculatedCollected}) !== statData.totalCollected (${statData.totalCollected})`);
    }
    if (calculatedPending !== statData.pendingPayments) {
      throw new Error(`Test 1 Failed: calculatedPending (${calculatedPending}) !== statData.pendingPayments (${statData.pendingPayments})`);
    }
    if (calculatedOverdue !== statData.overduePayments) {
      throw new Error(`Test 1 Failed: calculatedOverdue (${calculatedOverdue}) !== statData.overduePayments (${statData.overduePayments})`);
    }

    console.log(`  ✓ Table Paid count (${calculatedPaid}) === Summary Paid (${statData.paidPayments})`);
    console.log(`  ✓ Table Collected sum (₹${calculatedCollected.toLocaleString('en-IN')}) === Summary Total Collected (₹${statData.totalCollected.toLocaleString('en-IN')})`);
  }

  // TEST 2: Strict Manager Isolation
  console.log('\nTEST 2: Strict Manager Isolation');
  {
    if (isolatedManager) {
      const { req: statReq, res: statRes } = mockReqRes(isolatedManager);
      await getPaymentStats(statReq, statRes);
      const statData = statRes.getJson()?.data || {};

      if (statData.totalCollected !== 0 || statData.paidPayments !== 0) {
        throw new Error('Test 2 Failed: Isolated manager received non-zero stats');
      }
      console.log(`  ✓ Isolated manager stats: Total Collected ₹${statData.totalCollected}, Paid: ${statData.paidPayments} (no data leak)`);
    }
  }

  console.log('\n✅ ALL PAYMENT REVENUE CENTER TESTS PASSED!\n');
  await mongoose.disconnect();
}

runTests().catch(err => {
  console.error('Test Suite Failed:', err);
  process.exit(1);
});
