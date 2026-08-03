import mongoose from 'mongoose';
import Payment from '../../../../server/src/models/Payment.js';
import Tenant from '../../../../server/src/models/Tenant.js';
import User from '../../../../server/src/models/User.js';
import Property from '../../../../server/src/models/Property.js';
import Lease from '../../../../server/src/models/Lease.js';
import 'dotenv/config';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.resolve(__dirname, '../../../../server/.env') });

async function run() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log("Connected to MongoDB database!");

    // Search for payment with reference 'pay_IKXcm7sFJuvie7'
    const payment = await Payment.findOne({
      $or: [
        { reference: 'pay_IKXcm7sFJuvie7' },
        { razorpayPaymentId: 'pay_IKXcm7sFJuvie7' },
        { stripePaymentIntentId: 'pay_IKXcm7sFJuvie7' }
      ]
    }).populate('lease').populate('tenant').populate('property');

    if (!payment) {
      console.log("Payment not found by reference 'pay_IKXcm7sFJuvie7'. Listing all payments without bill:");
      const allLegacy = await Payment.find({ bill: { $exists: false } })
        .populate('tenant')
        .populate('property');
      for (const p of allLegacy) {
        console.log(`ID: ${p._id}, Ref: ${p.reference}, RazorpayId: ${p.razorpayPaymentId}, Tenant: ${p.tenant?._id} (${p.tenant?.email}), Property: ${p.property?._id}, Lease: ${p.lease}`);
      }
    } else {
      console.log("Found Payment document:");
      console.log(JSON.stringify(payment, null, 2));

      // Also let's find the tenant and user by email to see if ownership check matches
      if (payment.tenant) {
        const user = await User.findOne({ email: payment.tenant.email });
        console.log("Corresponding User profile:");
        console.log(JSON.stringify(user, null, 2));
      }
    }
  } catch (err) {
    console.error("Error:", err);
  } finally {
    await mongoose.disconnect();
  }
}

run();
