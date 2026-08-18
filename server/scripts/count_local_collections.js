import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.join(__dirname, '..', '.env') });


import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.join(__dirname, '..', '.env') });

const mongoUri = process.env.MONGODB_URI || 'mongodb://localhost:27017/tenant-management-system';

// Import Models
import FileMetadata from '../src/models/FileMetadata.js';
import FileStorage from '../src/models/FileStorage.js';
import Payment from '../src/models/Payment.js';
import Lease from '../src/models/Lease.js';
import Message from '../src/models/Message.js';
import Property from '../src/models/Property.js';
import User from '../src/models/User.js';

async function auditLocal() {
  try {
    console.log(`Connecting to Local DB: ${mongoUri}`);
    await mongoose.connect(mongoUri);
    console.log('Connected.');

    const numUsers = await User.countDocuments();
    const numProperties = await Property.countDocuments();
    const numPayments = await Payment.countDocuments();
    const numLeases = await Lease.countDocuments();
    const numMessages = await Message.countDocuments();
    const numFileMetadata = await FileMetadata.countDocuments();
    const numFileStorage = await FileStorage.countDocuments();

    console.log('\n--- LOCAL DB AUDIT COUNTS ---');
    console.log('Users:', numUsers);
    console.log('Properties:', numProperties);
    console.log('Payments:', numPayments);
    console.log('Leases:', numLeases);
    console.log('Messages:', numMessages);
    console.log('FileMetadata:', numFileMetadata);
    console.log('FileStorage:', numFileStorage);

    console.log('\nChecking for target Payment ID: 6a68f4b4eeb90bfc897d4014...');
    const payment = await Payment.findById('6a68f4b4eeb90bfc897d4014');
    if (payment) {
      console.log('FOUND PAYMENT:', payment);
    } else {
      console.log('PAYMENT NOT FOUND');
    }

    console.log('\nChecking for invoice file: invoice_6a68f4b4eeb90bfc897d4014.pdf...');
    const fileMeta = await FileMetadata.findOne({ filename: 'invoice_6a68f4b4eeb90bfc897d4014.pdf' });
    const fileStorage = await FileStorage.findOne({ filename: 'invoices-invoice_6a68f4b4eeb90bfc897d4014.pdf' });

    console.log('FileMetadata entry:', fileMeta ? 'FOUND' : 'NOT FOUND');
    console.log('FileStorage entry:', fileStorage ? 'FOUND' : 'NOT FOUND');

  } catch (err) {
    console.error('Audit failed:', err);
  } finally {
    await mongoose.disconnect();
  }
}

auditLocal();
