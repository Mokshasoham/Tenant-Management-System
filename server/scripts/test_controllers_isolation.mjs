import mongoose from 'mongoose';
import dotenv from 'dotenv';
dotenv.config();

const MONGO_URI = process.env.MONGO_URI || process.env.MONGODB_URI || 'mongodb://localhost:27017/tenant-management';

async function testFullSuite() {
  await mongoose.connect(MONGO_URI);
  
  const User = (await import('../src/models/User.js')).default;
  const Property = (await import('../src/models/Property.js')).default;
  const Tenant = (await import('../src/models/Tenant.js')).default;
  const Lease = (await import('../src/models/Lease.js')).default;
  const Payment = (await import('../src/models/Payment.js')).default;
  const Maintenance = (await import('../src/models/Maintenance.js')).default;
  const { TechnicianService } = await import('../src/services/technicianService.js');
  const { ReportService } = await import('../src/modules/reporting/services/ReportService.js');
  const { WorkforceSchedulingService } = await import('../src/services/workforceSchedulingService.js');
  const { getManagerPropertyIds } = await import('../src/utils/managerHelper.js');

  const technicianService = new TechnicianService();
  const reportService = new ReportService();
  const workforceSchedulingService = new WorkforceSchedulingService();

  // Test with Madhu (manager with 0 properties)
  const madhu = await User.findOne({ email: 'madhu@gmail.com' });
  console.log('=== TESTING ZERO-DATA MANAGER (Madhu) ===');
  console.log('Manager ID:', madhu._id.toString());

  const propIds = await getManagerPropertyIds(madhu._id);
  console.log('1. Manager Properties Count:', propIds.length);

  // Tenants check
  const tenants = await Tenant.find({ managedBy: madhu._id });
  console.log('2. Manager Tenants Count:', tenants.length);

  // Leases check
  const leases = propIds.length === 0 ? [] : await Lease.find({ property: { $in: propIds } });
  console.log('3. Manager Leases Count:', leases.length);

  // Payments check
  const payments = propIds.length === 0 ? [] : await Payment.find({ property: { $in: propIds } });
  console.log('4. Manager Payments Count:', payments.length);

  // Maintenance check
  const maintenance = propIds.length === 0 ? [] : await Maintenance.find({ property: { $in: propIds } });
  console.log('5. Manager Maintenance Count:', maintenance.length);

  // Technicians check
  const techResult = await technicianService.getAllTechnicians({ managerId: madhu._id.toString() });
  console.log('6. Manager Technicians Count:', techResult.technicians.length);

  // Workforce Calendar check
  const calendar = await workforceSchedulingService.getScheduleCalendar({}, madhu._id.toString(), 'manager');
  console.log('7. Manager Workforce Calendar Shifts:', calendar.length);

  // Reports check
  const revReport = await reportService.generateReport('revenue', {}, madhu._id.toString(), 'manager');
  console.log('8. Revenue Report KPI:', revReport.kpis?.find(k => k.key === 'total_revenue')?.value);

  const occReport = await reportService.generateReport('occupancy', {}, madhu._id.toString(), 'manager');
  console.log('9. Occupancy Report KPI:', occReport.kpis?.find(k => k.key === 'occupied_units')?.value);

  const leaseReport = await reportService.generateReport('lease', {}, madhu._id.toString(), 'manager');
  console.log('10. Lease Report KPI:', leaseReport.kpis?.find(k => k.key === 'active_leases')?.value);

  const payReport = await reportService.generateReport('payment', {}, madhu._id.toString(), 'manager');
  console.log('11. Payment Report KPI:', payReport.kpis?.find(k => k.key === 'paid_payments_count')?.value);

  const mntReport = await reportService.generateReport('maintenance', {}, madhu._id.toString(), 'manager');
  console.log('12. Maintenance Report KPI:', mntReport.kpis?.find(k => k.key === 'open_maintenance_tickets')?.value);

  // Test with Manager 1 (manager WITH properties)
  const mgr1 = await User.findOne({ email: 'manager01@gmail.com' });
  console.log('\n=== TESTING ACTIVE MANAGER (Manager 1) ===');
  const mgr1PropIds = await getManagerPropertyIds(mgr1._id);
  console.log('Manager 1 Properties Count:', mgr1PropIds.length);
  const mgr1TechResult = await technicianService.getAllTechnicians({ managerId: mgr1._id.toString() });
  console.log('Manager 1 Technicians Count:', mgr1TechResult.technicians.length);

  await mongoose.disconnect();
  console.log('\n=== ALL ISOLATION TESTS COMPLETED SUCCESSFULLY ===');
}

testFullSuite().catch(err => {
  console.error('Test suite error:', err);
  process.exit(1);
});
