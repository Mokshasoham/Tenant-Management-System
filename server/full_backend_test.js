import mongoose from 'mongoose';
import User from './src/models/User.js';
import Property from './src/models/Property.js';
import Payment from './src/models/Payment.js';
import Tenant from './src/models/Tenant.js';
import { processPostPayment } from './src/services/paymentAutomation.js';
import 'dotenv/config';

async function fullTest() {
    try {
        await mongoose.connect(process.env.MONGODB_URI);
        
        // 1. Create a test tenant (User + Tenant record)
        const email = 'tenant_test_' + Date.now() + '@example.com';
        const user = await User.create({
            firstName: 'Test',
            lastName: 'Tenant',
            email,
            password: 'password123',
            role: 'tenant',
            isEmailVerified: true
        });
        
        const tenant = await Tenant.create({
            firstName: 'Test',
            lastName: 'Tenant',
            email,
            phone: '1234567890',
            address: '123 Test St',
            managedBy: user._id // Self-managed for test
        });
        console.log(`Created tenant: ${tenant._id}`);

        // 2. Create a test property
        const property = await Property.create({
            name: 'Test Mansion',
            address: '123 Test St',
            type: 'apartment',
            rentAmount: 1500,
            owner: tenant._id, // Just for testing
            status: 'available'
        });
        console.log(`Created property: ${property._id}`);

        // 3. Create a pending payment
        const payment = await Payment.create({
            tenant: tenant._id,
            property: property._id,
            amount: 1500,
            type: 'rent',
            status: 'pending',
            paymentMethod: 'card',
            description: 'Test Rent Payment'
        });
        console.log(`Created payment: ${payment._id}`);

        // 4. Mark as paid
        payment.status = 'paid';
        payment.amountPaid = 1500;
        payment.paymentDate = new Date();
        await payment.save();
        console.log("Payment marked as paid.");

        // 5. Trigger automation
        console.log("Starting processPostPayment...");
        const result = await processPostPayment(payment);
        console.log("processPostPayment finished result:", result);

        // 6. Verify invoiceUrl
        const updatedPayment = await Payment.findById(payment._id).populate('tenant property');
        console.log("Invoice URL:", updatedPayment.invoiceUrl);
        console.log("Tenant Email:", updatedPayment.tenant.email);

    } catch (err) {
        console.error("Full test failed:", err);
    } finally {
        await mongoose.disconnect();
    }
}

fullTest();
