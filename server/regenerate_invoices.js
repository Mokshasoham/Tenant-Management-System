import mongoose from 'mongoose';
import Payment from './src/models/Payment.js';
import { processPostPayment } from './src/services/paymentAutomation.js';
import 'dotenv/config';

async function regenerateInvoices() {
    try {
        await mongoose.connect(process.env.MONGODB_URI);

        // Find paid payments without invoiceUrl
        const paymentsWithoutInvoice = await Payment.find({
            status: 'paid',
            tenant: { $exists: true, $ne: null },
            property: { $exists: true, $ne: null },
            $or: [
                { invoiceUrl: { $exists: false } },
                { invoiceUrl: null },
                { invoiceUrl: '' }
            ]
        });

        console.log(`Found ${paymentsWithoutInvoice.length} paid payments without invoices.`);

        for (const payment of paymentsWithoutInvoice) {
            console.log(`Regenerating invoice for payment: ${payment._id}`);
            try {
                await processPostPayment(payment);
                console.log(`Invoice generated for payment: ${payment._id}`);
            } catch (error) {
                console.error(`Failed to generate invoice for payment ${payment._id}: ${error.message}`);
            }
        }

        console.log('Invoice regeneration completed.');

    } catch (err) {
        console.error("Script failed:", err);
    } finally {
        await mongoose.disconnect();
    }
}

regenerateInvoices();