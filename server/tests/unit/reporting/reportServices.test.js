/**
 * server/tests/unit/reporting/reportServices.test.js
 *
 * Unit Test Suite for Phase 2.3.4.1 — Reporting Foundation & Data Services.
 */

import { jest } from '@jest/globals';
import ReportResponseBuilder from '../../../src/modules/reporting/builders/ReportResponseBuilder.js';
import reportService from '../../../src/modules/reporting/services/ReportService.js';
import revenueReportService from '../../../src/modules/reporting/services/RevenueReportService.js';
import occupancyReportService from '../../../src/modules/reporting/services/OccupancyReportService.js';
import leaseReportService from '../../../src/modules/reporting/services/LeaseReportService.js';
import paymentReportService from '../../../src/modules/reporting/services/PaymentReportService.js';
import maintenanceReportService from '../../../src/modules/reporting/services/MaintenanceReportService.js';
import reminderReportService from '../../../src/modules/reporting/services/ReminderReportService.js';
import Payment from '../../../src/models/Payment.js';
import Property from '../../../src/models/Property.js';
import Lease from '../../../src/models/Lease.js';
import Maintenance from '../../../src/models/Maintenance.js';
import reminderMetricsService from '../../../src/modules/reminders/services/ReminderMetricsService.js';

describe('Phase 2.3.4.1 — Reporting Foundation & Data Services Unit Tests', () => {

  // ─────────────────────────────────────────────────────────────
  // 1. REPORT RESPONSE BUILDER (AI-READY DTOs)
  // ─────────────────────────────────────────────────────────────
  describe('ReportResponseBuilder', () => {
    test('builds standardized AI-Ready DTO output shape', () => {
      const builder = new ReportResponseBuilder('revenue');
      builder
        .setSummary({ total: 10000 })
        .addKPI('revenue', 'Total Revenue', 10000, '$', 'positive')
        .addChart('area', 'Revenue Trend', [{ month: '2026-01', value: 10000 }])
        .setTable(['Month', 'Revenue'], [['2026-01', '$10,000']]);

      const dto = builder.build();

      expect(dto.success).toBe(true);
      expect(dto.reportType).toBe('revenue');
      expect(dto.summary.total).toBe(10000);
      expect(dto.kpis).toHaveLength(1);
      expect(dto.kpis[0].key).toBe('revenue');
      expect(dto.charts).toHaveLength(1);
      expect(dto.table.headers).toContain('Month');
      expect(dto.meta).toBeDefined();
    });
  });

  // ─────────────────────────────────────────────────────────────
  // 2. DOMAIN REPORT SERVICES
  // ─────────────────────────────────────────────────────────────
  describe('Domain Report Services', () => {

    test('RevenueReportService generates revenue metrics and trend charts', async () => {
      jest.spyOn(Payment, 'aggregate').mockImplementation((pipeline) => {
        if (pipeline.some(stage => stage.$group && stage.$group._id?.year)) {
          return Promise.resolve([{ _id: { year: 2026, month: 1 }, total: 5000, count: 2 }]);
        }
        return Promise.resolve([{ totalRevenue: 5000, totalTransactions: 2 }]);
      });

      const report = await revenueReportService.generate({ months: '1' });
      expect(report.reportType).toBe('revenue');
      expect(report.summary.totalRevenue).toBe(5000);
      expect(report.kpis[0].value).toBe(5000);

      Payment.aggregate.mockRestore();
    });

    test('OccupancyReportService calculates occupancy rate and pie chart breakdown', async () => {
      jest.spyOn(Property, 'countDocuments').mockImplementation((query = {}) => {
        if (query.status === 'occupied') return Promise.resolve(8);
        if (query.status === 'available') return Promise.resolve(2);
        if (query.status === 'maintenance') return Promise.resolve(0);
        return Promise.resolve(10);
      });

      const report = await occupancyReportService.generate();
      expect(report.reportType).toBe('occupancy');
      expect(report.summary.occupancyRate).toBe(80);
      expect(report.kpis.find(k => k.key === 'occupancy_rate').value).toBe(80);

      Property.countDocuments.mockRestore();
    });

    test('LeaseReportService summarizes active and expiring leases', async () => {
      jest.spyOn(Lease, 'countDocuments').mockResolvedValue(15);
      jest.spyOn(Lease, 'aggregate').mockResolvedValue([{ _id: 'active', count: 15 }]);

      const report = await leaseReportService.generate({ daysWindow: '30' });
      expect(report.reportType).toBe('lease');
      expect(report.summary.activeLeases).toBe(15);

      Lease.countDocuments.mockRestore();
      Lease.aggregate.mockRestore();
    });

    test('PaymentReportService calculates payment collection rate', async () => {
      jest.spyOn(Payment, 'countDocuments').mockImplementation((query = {}) => {
        if (query.status === 'paid') return Promise.resolve(9);
        if (query.status === 'overdue') return Promise.resolve(1);
        return Promise.resolve(10);
      });
      jest.spyOn(Payment, 'aggregate').mockResolvedValue([{ _id: 'stripe', count: 9, total: 9000 }]);

      const report = await paymentReportService.generate();
      expect(report.reportType).toBe('payment');
      expect(report.summary.collectionRate).toBe(90);

      Payment.countDocuments.mockRestore();
      Payment.aggregate.mockRestore();
    });

    test('ReminderReportService reuses ReminderMetricsService', async () => {
      jest.spyOn(reminderMetricsService, 'getMetrics').mockResolvedValue({
        queued: 2,
        sent: 50,
        failed: 1,
        dead_letter: 0,
        averageLatencyMs: 45,
        deliverySuccessRate: 98.0
      });

      const report = await reminderReportService.generate();
      expect(report.reportType).toBe('reminder');
      expect(report.summary.deliverySuccessRate).toBe(98.0);
      expect(report.kpis.find(k => k.key === 'delivery_success_rate').value).toBe(98.0);

      reminderMetricsService.getMetrics.mockRestore();
    });
  });

  // ─────────────────────────────────────────────────────────────
  // 3. REPORT SERVICE FACADE DELEGATION
  // ─────────────────────────────────────────────────────────────
  describe('ReportService Facade', () => {
    test('generateReport delegates to appropriate domain service and throws on unsupported type', async () => {
      jest.spyOn(revenueReportService, 'generate').mockResolvedValue({
        success: true,
        reportType: 'revenue'
      });

      const report = await reportService.generateReport('revenue', { months: '3' });
      expect(report.reportType).toBe('revenue');

      await expect(reportService.generateReport('unsupported_type')).rejects.toThrow('UNSUPPORTED_REPORT_TYPE');

      revenueReportService.generate.mockRestore();
    });
  });

});
