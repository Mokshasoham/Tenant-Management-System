import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.join(__dirname, '../.env') });

import User from '../src/models/User.js';
import { saveBankAccount } from '../src/controllers/payoutController.js';

async function testController() {
  await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/tenant_db');
  console.log('Connected to DB');

  const manager = await User.findOne({ role: { $in: ['manager', 'owner', 'admin'] } });
  console.log('Manager:', manager._id);

  const req = {
    user: { userId: manager._id, id: manager._id, role: manager.role },
    body: {
      accountHolderName: 'Mokshagna Sankabattula',
      accountNumber: '046812010001363',
      confirmAccountNumber: '046812010001363',
      ifsc: 'UBIN0804681'
    }
  };

  let statusCode = 200;
  let responseData = null;

  const res = {
    status(code) {
      statusCode = code;
      return this;
    },
    json(data) {
      responseData = data;
      return this;
    }
  };

  await saveBankAccount(req, res, (err) => {
    console.error('Middleware next error:', err);
  });

  console.log('Status Code:', statusCode);
  console.log('Response Data:', JSON.stringify(responseData, null, 2));

  await mongoose.disconnect();
}

testController().catch(console.error);
