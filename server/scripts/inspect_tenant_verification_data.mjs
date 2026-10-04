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
import Property from '../src/models/Property.js';
import verificationService from '../src/services/verificationService.js';

async function check() {
  await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/tenant_management');
  console.log('Connected to DB');

  const tenants = await User.find({ role: { $in: ['tenant', 'user'] } }).lean();
  console.log(`Found ${tenants.length} tenants in DB:`);

  for (const t of tenants) {
    console.log(`\n========================================`);
    console.log(`Tenant: ${t.firstName} ${t.lastName} (${t.email}) [ID: ${t._id}]`);
    console.log(`Phone: ${t.phone || 'N/A'}, VerificationStatus: ${t.verificationStatus}, KYC: ${t.kycStatus}, TrustScore: ${t.currentTrustScore}`);

    // Check verification record
    const verifs = await Verification.find({ entityType: 'TENANT', entityId: t._id }).lean();
    console.log(`Verification records count: ${verifs.length}`);
    if (verifs.length > 0) {
      verifs.forEach(v => {
        console.log(`  Verif ID: ${v._id}, Number: ${v.verificationNumber}, Status: ${v.status}, Level: ${v.tenantLevel || v.currentReviewLevel}, Docs: ${v.documents?.length || 0}, Timeline: ${v.timeline?.length || 0}`);
        if (v.documents?.length > 0) {
          console.log(`  Docs:`, v.documents.map(d => ({ type: d.documentType, status: d.status || d.reviewStatus, name: d.filename || d.originalName })));
        }
      });
    }

    // Check active leases
    const leases = await Lease.find({ tenant: t._id }).populate('property').lean();
    console.log(`Leases count: ${leases.length}`);
    leases.forEach(l => {
      console.log(`  Lease ID: ${l._id}, Property: ${l.property?.name}, Status: ${l.status}, Start: ${l.startDate}, End: ${l.endDate}`);
    });

    // Check payments
    const payments = await Payment.find({ tenant: t._id }).lean();
    console.log(`Payments count: ${payments.length}`);

    // Check widget data
    const widget = await verificationService.getTenantWidget(t._id);
    console.log('Widget data:', widget);
  }

  await mongoose.disconnect();
}

check();
