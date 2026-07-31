import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.join(__dirname, '..', '.env') });

const mongoUri = process.env.MONGODB_URI || 'mongodb://localhost:27017/tenant-management-system';

import Message from '../src/models/Message.js';
import Payment from '../src/models/Payment.js';

async function listAllFiles() {
  try {
    await mongoose.connect(mongoUri);
    console.log('Connected to MongoDB.');

    const messages = await Message.find({ attachments: { $exists: true, $ne: [] } });
    console.log(`Found ${messages.length} messages with attachments:`);
    messages.forEach(m => {
      console.log(`- Message ID: ${m._id} | Attachments:`, JSON.stringify(m.attachments));
    });

    const payments = await Payment.find({});
    console.log(`\nFound ${payments.length} total payments:`);
    payments.forEach(p => {
      if (p.invoiceUrl || p.fileId) {
        console.log(`- Payment ID: ${p._id} | invoiceUrl: ${p.invoiceUrl} | fileId: ${p.fileId} | legacyUrl: ${p.legacyUrl}`);
      }
    });

  } catch (err) {
    console.error('Listing failed:', err);
  } finally {
    await mongoose.disconnect();
  }
}

listAllFiles();
