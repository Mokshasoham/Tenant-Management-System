import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.join(__dirname, '..', '.env') });

const mongoUri = process.env.MONGODB_URI || 'mongodb://localhost:27017/tenant-management-system';

import Payment from '../src/models/Payment.js';
import Message from '../src/models/Message.js';

async function listUnmigrated() {
  try {
    await mongoose.connect(mongoUri);
    console.log('Connected.');

    const allPayments = await Payment.find({});
    console.log(`Total payments in database: ${allPayments.length}`);
    allPayments.forEach(p => {
      console.log(`- ID: ${p._id} | invoiceUrl: ${p.invoiceUrl} | status: ${p.status}`);
    });

    const allMessages = await Message.find({});
    console.log(`Total messages in database: ${allMessages.length}`);
    allMessages.forEach(m => {
      if (m.attachments && m.attachments.length > 0) {
        console.log(`- Msg ID: ${m._id} | attachments:`, JSON.stringify(m.attachments));
      }
    });

  } catch (err) {
    console.error(err);
  } finally {
    await mongoose.disconnect();
  }
}

listUnmigrated();
