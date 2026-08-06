/**
 * server/tests/integration/reporting/reportingLoad.test.js
 *
 * Load & Stress Test Suite for Phase 2.3.4 — Reporting, Operations & Observability.
 */

import { jest } from '@jest/globals';
import reportService from '../../../src/modules/reporting/services/ReportService.js';
import exportManager from '../../../src/modules/reporting/exporters/ExportManager.js';
import storageProvider from '../../../src/platform/storage/storageProvider.js';
import ReportAudit from '../../../src/modules/reporting/models/ReportAudit.js';
import Payment from '../../../src/models/Payment.js';
import Property from '../../../src/models/Property.js';
import Lease from '../../../src/models/Lease.js';

describe('Phase 2.3.4.6 — Reporting & Export Load/Stress Test Suite', () => {

  beforeAll(() => {
    jest.setTimeout(30000);
  });

  beforeEach(() => {
    jest.spyOn(ReportAudit, 'create').mockResolvedValue({});
    jest.spyOn(storageProvider, 'upload').mockResolvedValue({ url: '/uploads/reports/stress_test.pdf', filename: 'stress_test.pdf' });
    jest.spyOn(storageProvider, 'getSignedUrl').mockResolvedValue('https://storage.provider/signed');

    jest.spyOn(Payment, 'aggregate').mockImplementation((pipeline) => {
      if (pipeline && pipeline.some((s) => s.$group && s.$group._id?.year)) {
        return Promise.resolve([{ _id: { year: 2026, month: 1 }, total: 5000, count: 2 }]);
      }
      return Promise.resolve([{ totalRevenue: 150000, totalTransactions: 45 }]);
    });
    jest.spyOn(Payment, 'countDocuments').mockResolvedValue(45);

    jest.spyOn(Property, 'countDocuments').mockImplementation((query = {}) => {
      if (query.status === 'occupied') return Promise.resolve(80);
      if (query.status === 'available') return Promise.resolve(20);
      return Promise.resolve(100);
    });

    jest.spyOn(Lease, 'countDocuments').mockResolvedValue(80);
    jest.spyOn(Lease, 'aggregate').mockResolvedValue([{ _id: 'active', count: 80 }]);
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  // ─────────────────────────────────────────────────────────────
  // 1. CONCURRENT DOMAIN REPORT GENERATION STRESS TEST
  // ─────────────────────────────────────────────────────────────
  test('Executes 50 concurrent report generation requests within acceptable latency', async () => {
    const startTime = Date.now();
    const tasks = Array.from({ length: 50 }, (_, i) => {
      const type = i % 2 === 0 ? 'revenue' : 'occupancy';
      return reportService.generateReport(type, { dateRange: '30d' });
    });

    const results = await Promise.all(tasks);
    const duration = Date.now() - startTime;

    expect(results.length).toBe(50);
    results.forEach((res) => expect(res.success).toBe(true));
    expect(duration).toBeLessThan(10000);
  }, 30000);

  // ─────────────────────────────────────────────────────────────
  // 2. HIGH-VOLUME STREAMING EXPORT STRESS TEST
  // ─────────────────────────────────────────────────────────────
  test('Executes 20 concurrent streaming PDF, CSV, and Excel exports without memory degradation', async () => {
    const dto = await reportService.generateReport('payment', { dateRange: '90d' });
    
    // Expand DTO rows for high volume
    dto.table = {
      headers: ['ID', 'Tenant', 'Amount', 'Date', 'Status'],
      rows: Array.from({ length: 500 }, (_, i) => ({
        ID: `PAY-${1000 + i}`,
        Tenant: `Tenant ${i}`,
        Amount: `$${(i * 15).toFixed(2)}`,
        Date: new Date().toISOString(),
        Status: 'Completed'
      }))
    };

    const initialHeap = process.memoryUsage().heapUsed;

    const exportTasks = Array.from({ length: 20 }, (_, i) => {
      const fmt = i % 3 === 0 ? 'pdf' : i % 3 === 1 ? 'csv' : 'xlsx';
      return exportManager.export(fmt, dto, { userId: '507f1f77bcf86cd799439011', reportType: 'payment' });
    });

    const results = await Promise.all(exportTasks);
    const finalHeap = process.memoryUsage().heapUsed;

    expect(results.length).toBe(20);
    results.forEach((r) => expect(r.success).toBe(true));

    // Ensure memory delta doesn't leak more than 50MB
    const heapDeltaMb = (finalHeap - initialHeap) / (1024 * 1024);
    expect(heapDeltaMb).toBeLessThan(50);
  }, 30000);

});
