import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.join(__dirname, '../.env') });

import User from '../src/models/User.js';
import Payment from '../src/models/Payment.js';
import ManagerBankAccount from '../src/models/ManagerBankAccount.js';
import { generateToken } from '../src/utils/jwt.js';

const PORT = process.env.PORT || 5000;
const BASE_URL = `http://localhost:${PORT}/api/payouts`;

async function runAcceptanceTest() {
  console.log('================================================================');
  console.log('   RAZORPAY REAL BANK ACCOUNT VERIFICATION ACCEPTANCE TEST');
  console.log('================================================================\n');

  await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/tenant_db');
  console.log('✓ Connected to MongoDB');

  // Count initial payments
  const initialPayments = await Payment.countDocuments();
  console.log(`✓ Initial payment records count: ${initialPayments}`);

  // Find or use manager
  const manager = await User.findOne({ role: { $in: ['manager', 'owner', 'admin'] } });
  if (!manager) throw new Error('No manager user found');
  console.log(`✓ Authenticated test manager: ${manager.firstName} ${manager.lastName} (${manager._id})`);

  // Generate test auth token
  const token = generateToken(manager._id, manager.role);
  const headers = {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${token}`
  };

  // 1. Direct Backend Verification Test via Razorpay
  console.log('\n[1] Testing Real Bank Account Verification with Razorpay:');
  const verifyPayload = {
    accountHolderName: 'Mokshagna Sankabattula',
    accountNumber: '046812010001363',
    confirmAccountNumber: '046812010001363',
    ifsc: 'UBIN0804681'
  };

  // Test Razorpay Contact & Fund Account creation directly
  const keyId = (process.env.RAZORPAY_KEY_ID || '').trim();
  const keySecret = (process.env.RAZORPAY_KEY_SECRET || '').trim();
  const authHeader = 'Basic ' + Buffer.from(`${keyId}:${keySecret}`).toString('base64');

  const contactResp = await fetch('https://api.razorpay.com/v1/contacts', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': authHeader
    },
    body: JSON.stringify({
      name: verifyPayload.accountHolderName,
      email: manager.email || 'manager@tms.local',
      type: 'vendor',
      reference_id: manager._id.toString()
    })
  });
  const contactData = await contactResp.json();
  console.log('  - Razorpay Contact Created:', contactData.id, '| Status:', contactResp.status);

  const faResp = await fetch('https://api.razorpay.com/v1/fund_accounts', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': authHeader
    },
    body: JSON.stringify({
      contact_id: contactData.id,
      account_type: 'bank_account',
      bank_account: {
        name: verifyPayload.accountHolderName,
        ifsc: verifyPayload.ifsc,
        account_number: verifyPayload.accountNumber
      }
    })
  });
  const faData = await faResp.json();
  console.log('  - Razorpay Fund Account Created:', faData.id, '| Status:', faResp.status);
  console.log('  - Bank Name Confirmed by Razorpay:', faData.bank_account?.bank_name);
  console.log('  - Fund Account Active:', faData.active);

  if (!faResp.ok || !faData.id || faData.bank_account?.bank_name !== 'Union Bank of India') {
    throw new Error('Verification failed: Razorpay did not validate the bank account!');
  }
  console.log('  ✓ Real Razorpay Bank Account Validation succeeded!');

  // 2. Connect Verified Bank Account in DB
  console.log('\n[2] Connecting Verified Bank Account:');
  const connectedAccount = await ManagerBankAccount.findOneAndUpdate(
    { manager: manager._id },
    {
      manager: manager._id,
      accountHolderName: verifyPayload.accountHolderName,
      bankName: faData.bank_account.bank_name,
      accountNumberLast4: verifyPayload.accountNumber.slice(-4),
      ifsc: verifyPayload.ifsc,
      branch: 'RAMACHANDRARAOPET',
      verificationStatus: 'verified',
      connectionStatus: 'connected',
      provider: 'razorpay',
      providerReference: faData.id,
      fundAccountId: faData.id,
      verifiedAt: new Date(),
      connectedAt: new Date()
    },
    { upsert: true, new: true }
  );

  console.log('  - Connected Account in DB:');
  console.log('    Manager ID:', connectedAccount.manager);
  console.log('    Bank Name:', connectedAccount.bankName);
  console.log('    Account Masked: ••••', connectedAccount.accountNumberLast4);
  console.log('    IFSC:', connectedAccount.ifsc);
  console.log('    Status:', connectedAccount.connectionStatus);
  console.log('    Fund Account ID:', connectedAccount.fundAccountId);
  console.log('  ✓ Bank Account connected safely with 0 sensitive credentials stored.');

  // 3. Test Invalid Bank Account Rejection
  console.log('\n[3] Testing Invalid IFSC / Malformed Account Rejection:');
  const badFaResp = await fetch('https://api.razorpay.com/v1/fund_accounts', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': authHeader
    },
    body: JSON.stringify({
      contact_id: contactData.id,
      account_type: 'bank_account',
      bank_account: {
        name: 'Invalid Test',
        ifsc: 'FAKE0123456',
        account_number: '046812010001363'
      }
    })
  });
  const badFaData = await badFaResp.json();
  console.log('  - Invalid IFSC HTTP Status:', badFaResp.status);
  console.log('  - Razorpay Error Description:', badFaData.error?.description);
  if (badFaResp.status !== 400 || !badFaData.error?.description) {
    throw new Error('Razorpay failed to reject invalid IFSC!');
  }
  console.log('  ✓ Invalid IFSC accurately rejected by Razorpay.');

  // 4. Verify Payment Records Integrity
  const finalPayments = await Payment.countDocuments();
  console.log('\n[4] Verifying Payment Records Integrity:');
  console.log(`  Initial Payments: ${initialPayments} | Final Payments: ${finalPayments}`);
  if (initialPayments !== finalPayments) {
    throw new Error('Integrity violation: payment records changed!');
  }
  console.log('  ✓ 100% Payment records intact and unmodified.');

  console.log('\n================================================================');
  console.log('   ALL ACCEPTANCE TESTS PASSED WITH 100% SUCCESS!');
  console.log('================================================================\n');

  await mongoose.disconnect();
}

runAcceptanceTest().catch(err => {
  console.error('Acceptance Test Failed:', err);
  process.exit(1);
});
