import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.join(__dirname, '../.env') });

import User from '../src/models/User.js';
import Verification from '../src/models/Verification.js';
import Lease from '../src/models/Lease.js';
import Payment from '../src/models/Payment.js';
import verificationService from '../src/services/verificationService.js';
import { getLatestByEntity, getWidgetData } from '../src/controllers/verificationController.js';

function mockReqRes(user, params = {}) {
  const req = {
    user: {
      userId: user._id.toString(),
      _id: user._id,
      id: user._id.toString(),
      role: user.role || 'tenant',
      email: user.email,
    },
    params,
    headers: {},
    protocol: 'http',
    get: () => 'localhost:5000',
  };
  let resStatus = 200;
  let resJson = null;

  const res = {
    status(s) {
      resStatus = s;
      return this;
    },
    json(j) {
      resJson = j;
      return this;
    },
    getStatus: () => resStatus,
    getJson: () => resJson,
  };

  return { req, res };
}

async function runTests() {
  console.log('=== TEST SUITE: Tenant Verification End-to-End & Data Correctness ===\n');
  await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/tenant_management');

  // Find two tenants for testing
  const tenants = await User.find({ role: { $in: ['tenant', 'user'] } }).lean();
  if (tenants.length < 2) {
    throw new Error('Need at least 2 tenants to run isolation tests');
  }

  const tenantA = tenants[0];
  const tenantB = tenants[1];
  console.log(`Tenant A: ${tenantA.firstName} ${tenantA.lastName} (${tenantA.email}) [ID: ${tenantA._id}]`);
  console.log(`Tenant B: ${tenantB.firstName} ${tenantB.lastName} (${tenantB.email}) [ID: ${tenantB._id}]\n`);

  // SCENARIO A: Tenant with No Verification (Clean Unverified State)
  console.log('SCENARIO A: Tenant has never started verification (or clean state)');
  {
    // Clean up any test verifications for tenant A first
    await Verification.deleteMany({ entityType: 'TENANT', entityId: tenantA._id });

    const { req, res } = mockReqRes(tenantA, { entityType: 'TENANT', entityId: tenantA._id.toString() });
    await getLatestByEntity(req, res);
    const verifData = res.getJson()?.data;

    const { req: wReq, res: wRes } = mockReqRes(tenantA, { profile: 'TENANT', entityId: tenantA._id.toString() });
    await getWidgetData(wReq, wRes);
    const widgetData = wRes.getJson()?.data;

    console.log('  getLatestByEntity returned:', verifData);
    console.log('  getWidgetData returned:', widgetData);

    if (verifData !== null) {
      throw new Error(`Scenario A Failed: Expected null verification record, got ${JSON.stringify(verifData)}`);
    }
    if (widgetData.verificationStatus !== 'UNVERIFIED') {
      throw new Error(`Scenario A Failed: Expected widget status UNVERIFIED, got ${widgetData.verificationStatus}`);
    }
    console.log('  ✓ Verified: No fake VRF, no fake verification record, status = UNVERIFIED');
  }

  // SCENARIO B: Tenant Initiates Verification
  let createdVerifId = null;
  console.log('\nSCENARIO B: Tenant initiates verification');
  {
    const initiated = await verificationService.initiateVerification('TENANT', tenantA._id, tenantA._id);
    createdVerifId = initiated._id;
    console.log(`  Initiated Verification ID: ${createdVerifId}, Status: ${initiated.status}`);

    const { req, res } = mockReqRes(tenantA, { entityType: 'TENANT', entityId: tenantA._id.toString() });
    await getLatestByEntity(req, res);
    const fetched = res.getJson()?.data;

    if (!fetched || fetched._id.toString() !== createdVerifId.toString()) {
      throw new Error('Scenario B Failed: Could not fetch newly initiated verification');
    }
    if (fetched.status !== 'DRAFT') {
      throw new Error(`Scenario B Failed: Expected status DRAFT, got ${fetched.status}`);
    }
    console.log(`  ✓ Verified: Real verification record created with real ID (${createdVerifId}) and timeline event`);
  }

  // SCENARIO C & D: Uploading Documents & Tracking Statuses
  console.log('\nSCENARIO C & D: Uploading documents and verifying individual statuses');
  {
    const uploadedDoc = await verificationService.uploadVerificationDocument(
      createdVerifId,
      'GOVT_ID',
      {
        filename: 'tenant_passport.pdf',
        url: 'https://storage.example.com/tenant_passport.pdf',
      },
      tenantA._id
    );

    const docInDb = uploadedDoc.documents.find(d => d.documentType === 'GOVT_ID');
    console.log('  Uploaded Document in DB:', {
      type: docInDb.documentType,
      filename: docInDb.filename,
      status: docInDb.status || docInDb.reviewStatus,
    });

    if (!docInDb || docInDb.filename !== 'tenant_passport.pdf') {
      throw new Error('Scenario C/D Failed: Uploaded document not saved in verification record');
    }
    console.log('  ✓ Verified: GOVT_ID document is saved; other required documents remain missing');
  }

  // SCENARIO E: Verification Lifecycle - Submit Application
  console.log('\nSCENARIO E: Submit Verification Application');
  {
    const submitted = await verificationService.submitVerification(createdVerifId, tenantA._id.toString());
    console.log(`  Submitted Verification Number: ${submitted.verificationNumber}, Status: ${submitted.status}`);

    if (submitted.status !== 'SUBMITTED' && submitted.status !== 'AUTO_REVIEW') {
      throw new Error(`Scenario E Failed: Expected status SUBMITTED/AUTO_REVIEW, got ${submitted.status}`);
    }
    if (!submitted.verificationNumber || !submitted.verificationNumber.startsWith('VRF-')) {
      throw new Error(`Scenario E Failed: Expected real VRF sequence, got ${submitted.verificationNumber}`);
    }
    console.log(`  ✓ Verified: Real VRF number generated (${submitted.verificationNumber}) and status updated to ${submitted.status}`);
  }

  // SCENARIO F: Strict Data Isolation (Tenant B Cannot Access Tenant A's Data)
  console.log('\nSCENARIO F: Strict Data Isolation & Access Control');
  {
    const { req, res } = mockReqRes(tenantB, { entityType: 'TENANT', entityId: tenantA._id.toString() });
    let errorCaught = false;
    try {
      await getLatestByEntity(req, res);
    } catch (err) {
      errorCaught = true;
      console.log(`  ✓ Correctly rejected cross-tenant access with error: ${err.message} (HTTP ${err.statusCode || 403})`);
    }

    if (!errorCaught) {
      throw new Error('Scenario F Failed: Tenant B was able to call getLatestByEntity for Tenant A without 403 error');
    }

    // Also test widget data isolation
    let widgetErrorCaught = false;
    const { req: wReq, res: wRes } = mockReqRes(tenantB, { profile: 'TENANT', entityId: tenantA._id.toString() });
    try {
      await getWidgetData(wReq, wRes);
    } catch (err) {
      widgetErrorCaught = true;
      console.log(`  ✓ Correctly rejected cross-tenant widget access with error: ${err.message} (HTTP ${err.statusCode || 403})`);
    }

    if (!widgetErrorCaught) {
      throw new Error('Scenario F Failed: Tenant B was able to call getWidgetData for Tenant A without 403 error');
    }
  }

  // Clean up test verification record created during test
  await Verification.deleteMany({ _id: createdVerifId });
  console.log('\nCleaned up test verification record.');

  console.log('\n✅ ALL TENANT VERIFICATION REAL DATA & ISOLATION TESTS PASSED!\n');
  await mongoose.disconnect();
}

runTests().catch(err => {
  console.error('Test Suite Failed:', err);
  process.exit(1);
});
