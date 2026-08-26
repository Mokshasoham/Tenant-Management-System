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

async function check() {
  await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/tenant_management');
  console.log('Connected to DB');

  // Find manager who manages properties
  const managers = await User.find({ role: 'manager' }).lean();
  for (const m of managers) {
    const props = await Property.find({ $or: [{ owner: m._id }, { manager: m._id }] }).lean();
    if (props.length > 0) {
      console.log(`\nManager: ${m.firstName} ${m.lastName} (${m.email}) [ID: ${m._id}]`);
      console.log('Managed Properties:', props.map(p => ({ id: p._id, name: p.name })));

      // 1. Check getAllPayments
      const { req: getReq, res: getRes } = mockReqRes(m, { limit: '50' });
      await getAllPayments(getReq, getRes);
      const getJson = getRes.getJson();
      console.log(`getAllPayments returned count: ${getJson?.data?.length}`);
      if (getJson?.data?.length > 0) {
        console.log('Sample payment:', {
          id: getJson.data[0]._id,
          amount: getJson.data[0].amount,
          amountPaid: getJson.data[0].amountPaid,
          status: getJson.data[0].status,
          property: getJson.data[0].property?.name,
          tenant: getJson.data[0].tenant?.firstName,
          dueDate: getJson.data[0].dueDate
        });
      }

      // 2. Check getPaymentStats
      const { req: statReq, res: statRes } = mockReqRes(m);
      await getPaymentStats(statReq, statRes);
      const statJson = statRes.getJson();
      console.log('getPaymentStats returned:', statJson);
    }
  }

  await mongoose.disconnect();
}

check();
