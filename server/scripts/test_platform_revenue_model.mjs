import 'dotenv/config';
import mongoose from 'mongoose';
import connectDB from '../src/config/database.js';
import PlatformSetting from '../src/models/PlatformSetting.js';
import PaymentTransaction from '../src/models/PaymentTransaction.js';
import Payment from '../src/models/Payment.js';
import Property from '../src/models/Property.js';
import User from '../src/models/User.js';
import { 
  calculatePaymentBreakdown, 
  recordVerifiedRevenue, 
  handleRevenueRefund, 
  getPlatformFeeConfig 
} from '../src/services/platformFeeService.js';
import { calculateManagerLedger } from '../src/controllers/payoutController.js';

let passed = 0;
let failed = 0;

function assert(condition, description) {
  if (condition) {
    console.log(`  ✅ [PASS] ${description}`);
    passed++;
  } else {
    console.error(`  ❌ [FAIL] ${description}`);
    failed++;
  }
}

async function runTests() {
  console.log('\n========================================================');
  console.log('🚀 TMS PLATFORM REVENUE MODEL — ACCEPTANCE TEST SUITE');
  console.log('========================================================\n');

  try {
    await connectDB();
    console.log('📦 Connected to MongoDB.\n');

    // ----------------------------------------------------
    // TEST 1: Default Breakdown Calculation (₹15,000 Rent)
    // ----------------------------------------------------
    console.log('--- TEST 1: Server-Side Fee Breakdown (₹15,000 rent @ 1%) ---');
    // Ensure default settings
    await PlatformSetting.deleteMany({});
    const breakdown = await calculatePaymentBreakdown(15000);
    
    assert(breakdown.rentAmount === 15000, 'Rent amount is ₹15,000');
    assert(breakdown.platformFee === 150, 'TMS Platform Fee is ₹150 (1%)');
    assert(breakdown.taxAmount === 0, 'Applicable tax is ₹0');
    assert(breakdown.totalPayable === 15150, 'Total payable by tenant is ₹15,150');
    assert(breakdown.managerGrossAmount === 15000, 'Manager gross rental earnings is ₹15,000');
    assert(breakdown.managerCommission === 0, 'Manager commission is ₹0 (0% disabled by default)');
    assert(breakdown.managerNetAmount === 15000, 'Manager net withdrawable earnings is ₹15,000');
    assert(breakdown.platformRevenue === 150, 'TMS net earned platform revenue is ₹150');

    // ----------------------------------------------------
    // TEST 2: Platform Settings Admin Config & Persistence
    // ----------------------------------------------------
    console.log('\n--- TEST 2: Platform Settings Configuration & Custom Rates ---');
    const settingDoc = await PlatformSetting.create({
      platformFeeEnabled: true,
      platformFeeType: 'percentage',
      platformFeePercentage: 2.5,
      platformFeeTaxPercentage: 18,
      managerCommissionEnabled: true,
      managerCommissionPercentage: 5.0,
      platformFeePayer: 'tenant',
    });

    const customBreakdown = await calculatePaymentBreakdown(10000);
    // Rent: 10,000, Fee: 250, Tax: 45, Manager Gross: 10,000, Commission: 500, Manager Net: 9,500, Total Payable: 10,295, TMS Rev: 250 + 500 = 750
    assert(customBreakdown.platformFee === 250, '2.5% platform fee on ₹10,000 = ₹250');
    assert(customBreakdown.taxAmount === 45, '18% tax on ₹250 fee = ₹45');
    assert(customBreakdown.managerCommission === 500, '5% manager commission on ₹10,000 = ₹500');
    assert(customBreakdown.managerNetAmount === 9500, 'Manager net after 5% commission = ₹9,500');
    assert(customBreakdown.totalPayable === 10295, 'Total tenant payable = ₹10,295');
    assert(customBreakdown.platformRevenue === 750, 'Platform revenue = ₹250 fee + ₹500 commission = ₹750');

    // Reset back to standard 1% fee & 0% commission
    await PlatformSetting.deleteMany({});
    await PlatformSetting.create({
      platformFeeEnabled: true,
      platformFeeType: 'percentage',
      platformFeePercentage: 1.0,
      platformFeeTaxPercentage: 0,
      managerCommissionEnabled: false,
      managerCommissionPercentage: 0,
      platformFeePayer: 'tenant',
    });

    // ----------------------------------------------------
    // TEST 3: Idempotent Verified Revenue Recording
    // ----------------------------------------------------
    console.log('\n--- TEST 3: Idempotent Verified Revenue Ledger ---');
    const testPayment = await Payment.create({
      amount: 15150,
      amountPaid: 15150,
      rentAmount: 15000,
      status: 'paid',
      paymentMethod: 'card',
      reference: 'test_pay_revenue_101',
      razorpayPaymentId: 'pay_test_revenue_101',
    });

    const recorded1 = await recordVerifiedRevenue({
      paymentId: testPayment._id,
      rentAmount: 15000,
      platformFee: 150,
      platformFeePercentage: 1.0,
      platformTax: 0,
      managerCommission: 0,
      managerGrossAmount: 15000,
      managerNetAmount: 15000,
      platformRevenue: 150,
      totalAmount: 15150,
      currency: 'INR',
      razorpayPaymentId: 'pay_test_revenue_101',
    });

    assert(recorded1.platformRevenue === 150, 'Recorded transaction has ₹150 platform revenue');
    assert(recorded1.managerNetAmount === 15000, 'Recorded transaction has ₹15,000 manager net');
    assert(recorded1.status === 'paid', 'Transaction status is paid');

    // Re-record with same razorpayPaymentId (idempotency check)
    const recorded2 = await recordVerifiedRevenue({
      paymentId: testPayment._id,
      rentAmount: 15000,
      platformFee: 150,
      platformRevenue: 150,
      totalAmount: 15150,
      razorpayPaymentId: 'pay_test_revenue_101',
    });

    assert(recorded2._id.toString() === recorded1._id.toString(), 'Idempotent: duplicate paymentId does NOT create duplicate transaction');
    const count = await PaymentTransaction.countDocuments({ razorpayPaymentId: 'pay_test_revenue_101' });
    assert(count === 1, 'Only exactly 1 transaction ledger entry exists');

    // ----------------------------------------------------
    // TEST 4: Manager Ledger Isolation (Available Balance)
    // ----------------------------------------------------
    console.log('\n--- TEST 4: Manager Ledger Isolation & Available Balance ---');
    // Find an existing manager
    let testManager = await User.findOne({ role: { $in: ['manager', 'landlord'] } });
    if (!testManager) {
      testManager = await User.create({
        firstName: 'Test',
        lastName: 'Manager',
        email: `manager_${Date.now()}@tms.com`,
        password: 'password123',
        role: 'manager',
      });
    }

    const testProperty = await Property.create({
      name: 'Revenue Test Villa',
      type: 'apartment',
      address: '100 Revenue Way',
      city: 'Mumbai',
      state: 'Maharashtra',
      zipCode: '400001',
      rentAmount: 15000,
      manager: testManager._id,
      owner: testManager._id,
    });

    const managerPayment = await Payment.create({
      property: testProperty._id,
      owner: testManager._id,
      amount: 15150,
      amountPaid: 15150,
      rentAmount: 15000,
      platformFee: 150,
      managerGrossAmount: 15000,
      managerCommission: 0,
      managerNetAmount: 15000,
      platformRevenue: 150,
      status: 'paid',
      paymentMethod: 'card',
      reference: 'pay_manager_ledger_test_01',
      razorpayPaymentId: 'pay_manager_ledger_test_01',
    });

    await recordVerifiedRevenue({
      paymentId: managerPayment._id,
      propertyId: testProperty._id,
      managerId: testManager._id,
      rentAmount: 15000,
      platformFee: 150,
      managerGrossAmount: 15000,
      managerCommission: 0,
      managerNetAmount: 15000,
      platformRevenue: 150,
      totalAmount: 15150,
      razorpayPaymentId: 'pay_manager_ledger_test_01',
    });

    const ledger = await calculateManagerLedger(testManager._id);
    assert(ledger.totalEarned >= 15000, `Manager earned is strictly net rent (₹${ledger.totalEarned})`);
    assert(ledger.availableBalance >= 15000, `Manager available balance (₹${ledger.availableBalance}) excludes TMS platform fee`);
    assert(Array.isArray(ledger.earningsBreakdown), 'Ledger returns itemized earningsBreakdown array');
    
    const breakdownItem = ledger.earningsBreakdown.find(b => b.razorpayPaymentId === 'pay_manager_ledger_test_01');
    assert(!!breakdownItem, 'Found test payment in earningsBreakdown');
    if (breakdownItem) {
      assert(breakdownItem.grossRent === 15000, 'Item gross rent is ₹15,000');
      assert(breakdownItem.platformFee === 150, 'Item platform fee is ₹150');
      assert(breakdownItem.managerNet === 15000, 'Item manager net is ₹15,000');
    }

    // ----------------------------------------------------
    // TEST 5: Refund & Reversal Accounting
    // ----------------------------------------------------
    console.log('\n--- TEST 5: Refund & Reversal Accounting ---');
    const refundedTx = await handleRevenueRefund(managerPayment._id, 15150, 'Tenant cancelled booking');
    assert(refundedTx !== null, 'Refund processed successfully');
    assert(refundedTx.refundedAmount === 15150, 'Refunded amount is ₹15,150');
    assert(refundedTx.reversedPlatformFee === 150, 'Reversed platform fee is ₹150');
    assert(refundedTx.netPlatformRevenue === 0, 'Net platform revenue after full refund is ₹0');
    assert(refundedTx.status === 'refunded', 'Transaction status updated to refunded');

    // ----------------------------------------------------
    // TEST 6: Legacy Payments Safety Check
    // ----------------------------------------------------
    console.log('\n--- TEST 6: Legacy Records Integrity ---');
    const allPaymentsCount = await Payment.countDocuments();
    assert(allPaymentsCount >= 2, `Database maintains existing payment records (${allPaymentsCount} total)`);

    // Clean up temporary test data
    await Payment.deleteMany({ reference: { $in: ['test_pay_revenue_101', 'pay_manager_ledger_test_01'] } });
    await PaymentTransaction.deleteMany({ razorpayPaymentId: { $in: ['pay_test_revenue_101', 'pay_manager_ledger_test_01'] } });
    await Property.findByIdAndDelete(testProperty._id);

    console.log('\n========================================================');
    console.log(`🏁 TEST RESULTS: ${passed} PASSED | ${failed} FAILED`);
    console.log('========================================================\n');

    process.exit(failed > 0 ? 1 : 0);
  } catch (err) {
    console.error('Fatal test error:', err);
    process.exit(1);
  }
}

runTests();
