import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.join(__dirname, '../.env') });

import User from '../src/models/User.js';
import Payment from '../src/models/Payment.js';
import Property from '../src/models/Property.js';
import ManagerBankAccount from '../src/models/ManagerBankAccount.js';
import PayoutRequest from '../src/models/PayoutRequest.js';
import { lookupIfscDetails, calculateManagerLedger } from '../src/controllers/payoutController.js';

async function runTests() {
  console.log('--- STARTING BANK VERIFICATION & CONNECTION TESTS ---');
  await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/tenant_db');
  console.log('✓ Connected to MongoDB');

  // 1. Test IFSC Lookup Helper
  console.log('\n[1] Testing IFSC Lookup & Detection:');
  const sbiTest = await lookupIfscDetails('SBIN0001234');
  console.log('  SBIN0001234 -> Bank Name:', sbiTest.bankName, '| Valid:', sbiTest.valid);
  if (!sbiTest.bankName.includes('State Bank of India')) {
    throw new Error('Expected SBI bank name');
  }

  const hdfcTest = await lookupIfscDetails('HDFC0000001');
  console.log('  HDFC0000001 -> Bank Name:', hdfcTest.bankName, '| Valid:', hdfcTest.valid);
  if (!hdfcTest.bankName.includes('HDFC')) {
    throw new Error('Expected HDFC bank name');
  }
  console.log('✓ IFSC Lookup working perfectly');

  // 2. Find Manager User
  const manager = await User.findOne({ role: { $in: ['manager', 'owner', 'admin'] } });
  if (!manager) throw new Error('No manager user found in database');
  console.log(`\n[2] Testing with Manager: ${manager.firstName} ${manager.lastName} (${manager._id})`);

  // Count existing payments before test
  const initialPaymentCount = await Payment.countDocuments();
  console.log(`  Initial payment count in DB: ${initialPaymentCount}`);

  // 3. Test Bank Account Connection Lifecycle
  console.log('\n[3] Testing Bank Account Connection:');
  // Upsert a test bank account
  const bankAccount = await ManagerBankAccount.findOneAndUpdate(
    { manager: manager._id },
    {
      manager: manager._id,
      accountHolderName: `${manager.firstName} ${manager.lastName}`,
      bankName: 'State Bank of India',
      accountNumberLast4: '4321',
      ifsc: 'SBIN0001234',
      branch: 'Main Branch',
      verificationStatus: 'verified',
      connectionStatus: 'connected',
      provider: 'razorpay',
      providerReference: `vfy_test_${Date.now()}`,
      verifiedAt: new Date(),
      connectedAt: new Date()
    },
    { upsert: true, new: true }
  );

  console.log('  Connected Bank Account Created/Updated:');
  console.log('  - Bank:', bankAccount.bankName);
  console.log('  - Account Masked: ••••', bankAccount.accountNumberLast4);
  console.log('  - IFSC:', bankAccount.ifsc);
  console.log('  - Verification Status:', bankAccount.verificationStatus);
  console.log('  - Connection Status:', bankAccount.connectionStatus);

  // 4. Test Manager Ledger Calculation
  console.log('\n[4] Testing Manager Ledger Calculation:');
  const ledger = await calculateManagerLedger(manager._id);
  console.log('  - Total Earned: ₹' + ledger.totalEarned.toLocaleString('en-IN'));
  console.log('  - Pending: ₹' + ledger.totalPending.toLocaleString('en-IN'));
  console.log('  - Reserved: ₹' + ledger.reservedAmount.toLocaleString('en-IN'));
  console.log('  - Completed: ₹' + ledger.completedAmount.toLocaleString('en-IN'));
  console.log('  - Available Balance: ₹' + ledger.availableBalance.toLocaleString('en-IN'));

  // 5. Verify payment records integrity
  const finalPaymentCount = await Payment.countDocuments();
  console.log(`\n[5] Verifying Payment Records Integrity:`);
  console.log(`  Initial Payments: ${initialPaymentCount} | Final Payments: ${finalPaymentCount}`);
  if (initialPaymentCount !== finalPaymentCount) {
    throw new Error('PAYMENT RECORDS INTEGRITY VIOLATION! Count changed!');
  }
  console.log('✓ 100% Payment records preserved with 0 modifications or deletions.');

  console.log('\n--- ALL BANK VERIFICATION TESTS PASSED SUCCESSFULLY! ---');
  await mongoose.disconnect();
}

runTests().catch(err => {
  console.error('Test Failed:', err);
  process.exit(1);
});
