/**
 * server/tests/integration/reporting/reportingE2E.test.js
 *
 * End-to-End Quality Gate Test Suite for Phase 2.3.4 — Reporting, Operations & Observability.
 */

import { jest } from '@jest/globals';
import reportService from '../../../src/modules/reporting/services/ReportService.js';
import operationsService from '../../../src/modules/operations/services/OperationsService.js';
import telemetryService from '../../../src/platform/telemetry/telemetryService.js';
import exportManager from '../../../src/modules/reporting/exporters/ExportManager.js';
import exportQueue from '../../../src/modules/reporting/queue/exportQueue.js';
import exportWorker from '../../../src/modules/reporting/workers/ExportWorker.js';
import scheduledReportScheduler from '../../../src/modules/reporting/services/ScheduledReportScheduler.js';
import storageProvider from '../../../src/platform/storage/storageProvider.js';
import eventBus from '../../../src/platform/events/eventBus.js';
import ReportAudit from '../../../src/modules/reporting/models/ReportAudit.js';
import Payment from '../../../src/models/Payment.js';
import Property from '../../../src/models/Property.js';
import Lease from '../../../src/models/Lease.js';
import Maintenance from '../../../src/models/Maintenance.js';
import Notification from '../../../src/models/Notification.js';
import Reminder from '../../../src/modules/reminders/models/Reminder.js';
import ReminderHistory from '../../../src/modules/reminders/models/ReminderHistory.js';
import User from '../../../src/models/User.js';
import SavedReport from '../../../src/modules/reporting/models/SavedReport.js';

describe('Phase 2.3.4.6 — End-to-End Integration Quality Gate', () => {

  beforeAll(() => {
    jest.setTimeout(30000);
  });

  beforeEach(() => {
    // Platform & storage mocks
    jest.spyOn(ReportAudit, 'create').mockResolvedValue({});
    jest.spyOn(ReportAudit, 'countDocuments').mockResolvedValue(25);
    jest.spyOn(ReportAudit, 'aggregate').mockResolvedValue([{ _id: 'revenue', count: 12, avgTimeMs: 45 }]);
    jest.spyOn(ReportAudit, 'find').mockReturnValue({
      sort: () => ({ limit: () => ({ lean: () => Promise.resolve([]) }) })
    });
    jest.spyOn(storageProvider, 'upload').mockResolvedValue({ url: '/uploads/reports/test_report.pdf', filename: 'test_report.pdf' });
    jest.spyOn(storageProvider, 'getSignedUrl').mockResolvedValue('https://storage.provider/signed-url?token=xyz');

    // Mongoose Model Mocks for Domain Report Services & Operations
    jest.spyOn(Payment, 'aggregate').mockImplementation((pipeline) => {
      if (pipeline && pipeline.some((s) => s.$group && s.$group._id?.year)) {
        return Promise.resolve([{ _id: { year: 2026, month: 1 }, total: 5000, count: 2 }]);
      }
      return Promise.resolve([{ totalRevenue: 150000, totalTransactions: 45 }]);
    });
    jest.spyOn(Payment, 'countDocuments').mockImplementation((query = {}) => {
      if (query.status === 'paid') return Promise.resolve(40);
      if (query.status === 'overdue') return Promise.resolve(5);
      return Promise.resolve(45);
    });

    const chainableMock = {
      sort: () => ({ limit: () => ({ lean: () => Promise.resolve([]) }) }),
      limit: () => ({ lean: () => Promise.resolve([]) }),
      lean: () => Promise.resolve([])
    };

    jest.spyOn(Payment, 'find').mockReturnValue(chainableMock);
    jest.spyOn(Property, 'find').mockReturnValue(chainableMock);
    jest.spyOn(Lease, 'find').mockReturnValue(chainableMock);
    jest.spyOn(Maintenance, 'find').mockReturnValue(chainableMock);
    jest.spyOn(Notification, 'find').mockReturnValue(chainableMock);

    jest.spyOn(Property, 'countDocuments').mockImplementation((query = {}) => {
      if (query.status === 'occupied') return Promise.resolve(80);
      if (query.status === 'available') return Promise.resolve(20);
      return Promise.resolve(100);
    });

    jest.spyOn(Lease, 'countDocuments').mockResolvedValue(80);
    jest.spyOn(Lease, 'aggregate').mockResolvedValue([{ _id: 'active', count: 80 }]);

    jest.spyOn(Maintenance, 'aggregate').mockResolvedValue([
      { _id: 'completed', count: 25, avgResolutionDays: 1.8 }
    ]);
    jest.spyOn(Maintenance, 'countDocuments').mockResolvedValue(30);

    jest.spyOn(Notification, 'aggregate').mockResolvedValue([
      { _id: 'email', count: 120 }
    ]);
    jest.spyOn(Notification, 'countDocuments').mockResolvedValue(150);

    jest.spyOn(Reminder, 'aggregate').mockResolvedValue([
      { _id: 'sent', count: 50 }
    ]);
    jest.spyOn(Reminder, 'countDocuments').mockResolvedValue(60);
    jest.spyOn(Reminder, 'find').mockReturnValue({
      sort: () => ({ skip: () => ({ limit: () => ({ lean: () => Promise.resolve([]) }) }) }),
      populate: () => ({ sort: () => ({ skip: () => ({ limit: () => ({ lean: () => Promise.resolve([]) }) }) }) })
    });
    jest.spyOn(Reminder, 'updateMany').mockResolvedValue({ modifiedCount: 0 });
    jest.spyOn(Reminder, 'deleteMany').mockResolvedValue({ deletedCount: 0 });

    jest.spyOn(ReminderHistory, 'aggregate').mockResolvedValue([
      { _id: 'email', count: 50, avgLatencyMs: 40 }
    ]);
    jest.spyOn(ReminderHistory, 'countDocuments').mockResolvedValue(50);

    jest.spyOn(User, 'find').mockReturnValue({
      select: () => ({ lean: () => Promise.resolve([{ _id: 'm1', firstName: 'John', lastName: 'Doe', role: 'manager' }]) }),
      populate: () => ({ sort: () => ({ skip: () => ({ limit: () => ({ lean: () => Promise.resolve([]) }) }) }) }),
      lean: () => Promise.resolve([{ _id: 'm1', firstName: 'John', lastName: 'Doe', role: 'manager' }])
    });
    jest.spyOn(User, 'countDocuments').mockResolvedValue(5);

    jest.spyOn(SavedReport, 'find').mockReturnValue({
      populate: () => ({ lean: () => Promise.resolve([]) })
    });
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  // ─────────────────────────────────────────────────────────────
  // 1. ALL 9 DOMAIN REPORT SERVICES & DTO BUILDER INTEGRATION
  // ─────────────────────────────────────────────────────────────
  describe('Domain Report Services & DTO Integration', () => {
    const domains = [
      'revenue', 'occupancy', 'lease', 'payment', 'maintenance',
      'notification', 'reminder', 'manager_performance', 'audit_log'
    ];

    domains.forEach((type) => {
      test(`reportService generates valid AI-Ready DTO for '${type}' report`, async () => {
        const dto = await reportService.generateReport(type, { dateRange: '30d' });

        expect(dto).toBeDefined();
        expect(dto.success).toBe(true);
        expect(dto.reportType).toBe(type);
        expect(dto.summary).toBeDefined();
        expect(Array.isArray(dto.kpis)).toBe(true);
        expect(Array.isArray(dto.charts)).toBe(true);
        expect(dto.table).toBeDefined();
        expect(dto.meta).toBeDefined();
      }, 15000);
    });
  });

  // ─────────────────────────────────────────────────────────────
  // 2. OPERATIONS COMMAND CENTER & AUDIT INTEGRATION
  // ─────────────────────────────────────────────────────────────
  describe('Operations Command Center & System Status', () => {
    test('operationsService returns aggregate health status across workers & schedulers', async () => {
      const status = await operationsService.getSystemOperationsStatus();
      expect(status).toBeDefined();
      expect(status.workers).toBeDefined();
      expect(status.schedulers).toBeDefined();
    }, 15000);

    test('operationsService inspects, retries, and purges dead-letter items safely', async () => {
      const deadLetters = await operationsService.getDeadLetterItems(1, 10);
      expect(deadLetters).toBeDefined();
      expect(Array.isArray(deadLetters.items)).toBe(true);

      const retryRes = await operationsService.bulkRetryDeadLetter([]);
      expect(retryRes.success).toBe(true);

      const purgeRes = await operationsService.bulkPurgeDeadLetter([]);
      expect(purgeRes.success).toBe(true);
    }, 15000);
  });

  // ─────────────────────────────────────────────────────────────
  // 3. SYSTEM OBSERVABILITY & TELEMETRY INTEGRATION
  // ─────────────────────────────────────────────────────────────
  describe('System Observability & Telemetry Integration', () => {
    test('telemetryService collects real-time process memory & HTTP metrics', () => {
      telemetryService.incrementActiveRequests();
      telemetryService.recordHttpRequest(200, 25);
      telemetryService.decrementActiveRequests();

      telemetryService.incrementActiveRequests();
      telemetryService.recordHttpRequest(500, 110);
      telemetryService.decrementActiveRequests();

      const metrics = telemetryService.getTelemetryReport();
      expect(metrics).toBeDefined();
      expect(metrics.process).toBeDefined();
      expect(metrics.process.memory.rssMb).toBeGreaterThan(0);
      expect(metrics.http.totalRequests).toBeGreaterThanOrEqual(2);
      expect(metrics.http.statusCounts['2xx']).toBeGreaterThanOrEqual(1);
      expect(metrics.http.statusCounts['5xx']).toBeGreaterThanOrEqual(1);
    });
  });

  // ─────────────────────────────────────────────────────────────
  // 4. UNIVERSAL REPORT EXPORT ENGINE & ASYNC JOBS INTEGRATION
  // ─────────────────────────────────────────────────────────────
  describe('Universal Export Engine & Async Export Jobs Integration', () => {
    test('exportManager exports report DTO synchronously to PDF, CSV, and Excel', async () => {
      const dto = await reportService.generateReport('revenue', { dateRange: '30d' });

      const pdfResult = await exportManager.export('pdf', dto, { userId: '507f1f77bcf86cd799439011', reportType: 'revenue' });
      expect(pdfResult.success).toBe(true);
      expect(pdfResult.format).toBe('pdf');
      expect(pdfResult.downloadUrl).toContain('signed-url');

      const csvResult = await exportManager.export('csv', dto, { userId: '507f1f77bcf86cd799439011', reportType: 'revenue' });
      expect(csvResult.success).toBe(true);
      expect(csvResult.format).toBe('csv');

      const excelResult = await exportManager.export('xlsx', dto, { userId: '507f1f77bcf86cd799439011', reportType: 'revenue' });
      expect(excelResult.success).toBe(true);
      expect(excelResult.format).toBe('xlsx');
    }, 20000);

    test('Async Export Job lifecycle executes in background and emits EventBus progress events', async () => {
      const eventsEmitted = [];
      const listener = (payload, topic) => eventsEmitted.push({ topic, payload });

      eventBus.subscribe('export.started', listener);
      eventBus.subscribe('export.progress', listener);
      eventBus.subscribe('export.completed', listener);

      const mockJob = {
        _id: 'job_e2e_999',
        userId: '507f1f77bcf86cd799439011',
        reportType: 'occupancy',
        format: 'pdf',
        filters: {},
        attempts: 0,
        maxAttempts: 3
      };

      jest.spyOn(exportQueue, 'updateProgress').mockResolvedValue({});

      await exportWorker.processJob(mockJob);

      // Give EventBus handlers a tick
      await new Promise((r) => setTimeout(r, 50));

      expect(exportQueue.updateProgress).toHaveBeenCalledWith('job_e2e_999', 100, 'completed', expect.any(Object));
      expect(eventsEmitted.some((e) => e.topic === 'export.started')).toBe(true);
      expect(eventsEmitted.some((e) => e.topic === 'export.completed')).toBe(true);
    }, 15000);
  });

  // ─────────────────────────────────────────────────────────────
  // 5. SCHEDULED REPORT SCHEDULER & SCAN EXECUTION
  // ─────────────────────────────────────────────────────────────
  describe('Scheduled Report Scheduler Integration', () => {
    test('ScheduledReportScheduler executes scan cleanly without throwing', async () => {
      await expect(scheduledReportScheduler.run()).resolves.not.toThrow();
    }, 15000);
  });

});
