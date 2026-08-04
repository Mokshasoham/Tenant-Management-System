import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.join(__dirname, '..', '.env') });

// Register models
import '../src/models/User.js';
import '../src/models/Tenant.js';
import '../src/models/Lease.js';
import '../src/models/Payment.js';
import '../src/models/Maintenance.js';
import '../src/models/LeaseRenewalCampaign.js';
import '../src/models/LeaseRenewalAudit.js';
import '../src/models/OutboxEvent.js';
import '../src/models/Notification.js';

import { NotificationBackfillService } from '../src/modules/lease-renewal/notifications/NotificationBackfillService.js';

async function main() {
  const args = process.argv.slice(2);
  const dryRun = args.includes('--dry-run');

  let batchSize = 500;
  const batchArg = args.find(a => a.startsWith('--batch-size='));
  if (batchArg) {
    batchSize = parseInt(batchArg.split('=')[1]) || 500;
  }

  const mongoUri = process.env.MONGODB_URI;
  if (!mongoUri) {
    console.error('ERROR: MONGODB_URI is not set in environment.');
    process.exit(1);
  }

  console.log('=====================================================');
  console.log(' HISTORICAL NOTIFICATION RECONSTRUCTION MIGRATION');
  console.log('=====================================================');
  console.log(` Mode       : ${dryRun ? 'DRY-RUN (SIMULATION)' : 'LIVE EXECUTION'}`);
  console.log(` Batch Size : ${batchSize}`);
  console.log(` Database   : ${mongoUri.replace(/:([^@]+)@/, ':****@')}`);
  console.log('=====================================================\n');

  try {
    await mongoose.connect(mongoUri);
    console.log('Successfully connected to MongoDB.');

    const stats = await NotificationBackfillService.run({
      dryRun,
      batchSize,
      logger: console
    });

    console.log('\n=====================================================');
    console.log(' MIGRATION VERIFICATION & SUMMARY REPORT');
    console.log('=====================================================');
    console.log(` Execution Mode            : ${stats.dryRun ? 'DRY-RUN' : 'LIVE'}`);
    console.log(` Elapsed Time              : ${stats.elapsedMs} ms`);
    console.log('-----------------------------------------------------');
    console.log(` Payments Processed        : ${stats.payments.processed}`);
    console.log(` Payments Created          : ${stats.payments.created}`);
    console.log(` Payments Skipped          : ${stats.payments.skipped}`);
    console.log('-----------------------------------------------------');
    console.log(` Leases Processed          : ${stats.leases.processed}`);
    console.log(` Leases Created            : ${stats.leases.created}`);
    console.log(` Leases Skipped            : ${stats.leases.skipped}`);
    console.log('-----------------------------------------------------');
    console.log(` Campaigns Processed       : ${stats.campaigns.processed}`);
    console.log(` Campaigns Created         : ${stats.campaigns.created}`);
    console.log(` Campaigns Skipped         : ${stats.campaigns.skipped}`);
    console.log('-----------------------------------------------------');
    console.log(` Maintenance Processed     : ${stats.maintenance.processed}`);
    console.log(` Maintenance Created       : ${stats.maintenance.created}`);
    console.log(` Maintenance Skipped       : ${stats.maintenance.skipped}`);
    console.log('-----------------------------------------------------');
    console.log(` Total Scanned Events      : ${stats.totalScanned}`);
    console.log(` Total Notifications Created: ${stats.totalCreated}`);
    console.log(` Total Duplicates Skipped  : ${stats.totalSkipped}`);
    console.log(` Total Missing Recipients  : ${stats.totalMissingRecipients}`);
    console.log(` Unknown Event Types       : ${stats.unknownEventTypes}`);
    console.log(` Errors Encountered        : ${stats.errors}`);
    console.log('=====================================================\n');

  } catch (err) {
    console.error('Fatal Migration Error:', err);
    process.exit(1);
  } finally {
    await mongoose.disconnect();
    console.log('Disconnected from MongoDB.');
  }
}

main();
