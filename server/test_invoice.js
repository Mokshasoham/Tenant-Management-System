import mongoose from 'mongoose';
import Payment from './src/models/Payment.js';
import User from './src/models/User.js';
import Property from './src/models/Property.js';
import { processPostPayment } from './src/services/paymentAutomation.js';
import 'dotenv/config';

async function testInvoice() {
    try {
        await mongoose.connect(process.env.MONGODB_URI);
        
        // Find a pending payment or create a dummy one
        let payment = await Payment.findOne({ status: 'pending' });
        
        if (!payment) {
            console.log("No pending payment found. Looking for any payment to test with...");
            payment = await Payment.findOne({});
            if (!payment) {
                 console.log("No payments in DB. Exiting test.");
                 return;
            }
        }

        console.log(`Found payment: ${payment._id}. Current status: ${payment.status}. Forcing to 'paid' for test.`);
        
        // Mark as paid
        payment.status = 'paid';
        payment.amountPaid = payment.amount;
        payment.paymentDate = new Date();
        await payment.save();

        console.log("Payment marked as paid. Triggering processPostPayment...");
        
        // Run automation
        await processPostPayment(payment);

        console.log("processPostPayment completed.");
        
        // Reload payment to check invoice URL
        const updatedPayment = await Payment.findById(payment._id);
        console.log("Updated Payment Invoice URL:", updatedPayment.invoiceUrl);

    } catch (err) {
        console.error("Test failed:", err);
    } finally {
        await mongoose.disconnect();
    }
}

testInvoice();
