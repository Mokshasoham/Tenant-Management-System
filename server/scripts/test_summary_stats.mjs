import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.join(__dirname, '../.env') });

import { getSummaryStats } from '../src/controllers/analyticsController.js';
import User from '../src/models/User.js';

async function testController() {
  await mongoose.connect(process.env.MONGODB_URI);

  const manager = await User.findOne({ email: 'manager01@gmail.com' });
  console.log('Testing with manager:', manager?.email, manager?._id);

  const req = {
    user: {
      userId: manager._id.toString(),
      _id: manager._id,
      role: 'manager'
    }
  };

  let responseData = null;
  let responseStatus = null;
  const res = {
    status: (code) => {
      responseStatus = code;
      return {
        json: (data) => {
          responseData = data;
          return data;
        }
      };
    }
  };

  await getSummaryStats(req, res);

  console.log('Status:', responseStatus);
  console.log('Response JSON:\n', JSON.stringify(responseData, null, 2));

  await mongoose.disconnect();
}

testController().catch(err => {
  console.error(err);
  process.exit(1);
});
