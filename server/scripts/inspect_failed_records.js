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

async function inspectFailedRecords() {
  try {
    await mongoose.connect(mongoUri);
    console.log('Connected to MongoDB.');

    // 1. Search Message by attachment url or file name
    const messages = await Message.find({
      $or: [
        { 'attachments.url': /chat-1785341820904\.pdf/ },
        { 'attachments.fileName': /chat-1785341820904\.pdf/ },
        { 'attachments.url': /1785341820904/ }
      ]
    });
    console.log(`Found ${messages.length} messages for chat-1785341820904.pdf:`);
    messages.forEach(m => {
      console.log('Message ID:', m._id);
      console.log('Attachments:', JSON.stringify(m.attachments, null, 2));
    });

    // 2. Search Payment by invoiceUrl or doc ID
    const paymentId = '6a68f4b4eeb90bfc897d4014';
    let payments = [];
    if (mongoose.Types.ObjectId.isValid(paymentId)) {
      const p = await Payment.findById(paymentId);
      if (p) payments.push(p);
    }
    const paymentsByInvoice = await Payment.find({
      $or: [
        { invoiceUrl: /6a68f4b4eeb90bfc897d4014/ },
        { legacyUrl: /6a68f4b4eeb90bfc897d4014/ },
        { invoiceUrl: /invoice_6a68f4b4eeb90bfc897d4014/ }
      ]
    });
    payments.push(...paymentsByInvoice);

    console.log(`Found ${payments.length} payments for invoice_6a68f4b4eeb90bfc897d4014.pdf:`);
    payments.forEach(p => {
      console.log('Payment ID:', p._id);
      console.log('invoiceUrl:', p.invoiceUrl);
      console.log('fileId:', p.fileId);
      console.log('legacyUrl:', p.legacyUrl);
    });

  } catch (err) {
    console.error('Inspection failed:', err);
  } finally {
    await mongoose.disconnect();
  }
}

inspectFailedRecords();
