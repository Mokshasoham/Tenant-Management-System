/**
 * server/tests/unit/reporting/exportManager.test.js
 *
 * Unit Test Suite for Phase 2.3.4.4 — Universal Report Export Engine & Export Jobs System.
 */

import { jest } from '@jest/globals';
import exportManager from '../../../src/modules/reporting/exporters/ExportManager.js';
import pdfExporter from '../../../src/modules/reporting/exporters/PdfExporter.js';
import csvExporter from '../../../src/modules/reporting/exporters/CsvExporter.js';
import excelExporter from '../../../src/modules/reporting/exporters/ExcelExporter.js';
import exportQueue from '../../../src/modules/reporting/queue/exportQueue.js';
import exportWorker from '../../../src/modules/reporting/workers/ExportWorker.js';
import reportService from '../../../src/modules/reporting/services/ReportService.js';
import ReportResponseBuilder from '../../../src/modules/reporting/builders/ReportResponseBuilder.js';
import ReportAudit from '../../../src/modules/reporting/models/ReportAudit.js';
import storageProvider from '../../../src/platform/storage/storageProvider.js';
import eventBus from '../../../src/platform/events/eventBus.js';

describe('Phase 2.3.4.4 — Universal Report Export Engine Unit Tests', () => {
  let sampleDTO;

  beforeEach(() => {
    const builder = new ReportResponseBuilder('revenue');
    builder.setSummary({ title: 'Revenue Audit', description: 'Revenue test report' });
    builder.addKPI('total_rev', 'Total Revenue', '$50,000', 'USD', 'positive', 12);
    builder.setTable(['Month', 'Amount'], [{ Month: 'Jan', Amount: '$25,000' }]);
    sampleDTO = builder.build();

    sampleDTO.summary = 'Revenue test report';
    sampleDTO.tables = [{ title: 'Monthly Revenue', headers: ['Month', 'Amount'], rows: [{ Month: 'Jan', Amount: '$25,000' }] }];

    jest.spyOn(ReportAudit, 'create').mockResolvedValue({});
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  // ─────────────────────────────────────────────────────────────
  // 1. CORE EXPORTERS (PDF, CSV, EXCEL)
  // ─────────────────────────────────────────────────────────────
  describe('Core Exporters (PDF, CSV, Excel)', () => {
    test('PdfExporter generates binary PDF buffer from report DTO', async () => {
      const pdfBuffer = await pdfExporter.export(sampleDTO, { title: 'Financial Audit' });
      expect(Buffer.isBuffer(pdfBuffer)).toBe(true);
      expect(pdfBuffer.length).toBeGreaterThan(100);
    });

    test('CsvExporter generates formatted CSV buffer from report DTO', async () => {
      const csvBuffer = await csvExporter.export(sampleDTO);
      const str = csvBuffer.toString('utf-8');
      expect(str).toContain('Monthly Revenue');
      expect(str).toContain('Jan');
      expect(str).toContain('$25,000');
    });

    test('ExcelExporter generates valid XLSX Excel buffer from report DTO', async () => {
      const excelBuffer = await excelExporter.export(sampleDTO);
      expect(Buffer.isBuffer(excelBuffer)).toBe(true);
      expect(excelBuffer.length).toBeGreaterThan(100);
    });
  });

  // ─────────────────────────────────────────────────────────────
  // 2. EXPORT MANAGER FACADE & SIGNED URLS
  // ─────────────────────────────────────────────────────────────
  describe('ExportManager Facade & Storage Uploads', () => {
    test('exportManager uploads binary and returns signed URL with REPORT_EXPORT_TTL', async () => {
      jest.spyOn(storageProvider, 'upload').mockResolvedValue({ url: '/uploads/reports/revenue_123.pdf', filename: 'revenue_123.pdf' });
      jest.spyOn(storageProvider, 'getSignedUrl').mockResolvedValue('https://storage.provider/signed-url?token=abc');

      const result = await exportManager.export('pdf', sampleDTO, {
        userId: '507f1f77bcf86cd799439011',
        reportType: 'revenue'
      });

      expect(result.success).toBe(true);
      expect(result.format).toBe('pdf');
      expect(result.downloadUrl).toContain('signed-url');
      expect(result.expiresAt).toBeDefined();
    });

    test('exportManager throws UNSUPPORTED_FORMAT for invalid format', async () => {
      await expect(exportManager.export('invalid_fmt', sampleDTO)).rejects.toThrow('UNSUPPORTED_FORMAT');
    });
  });

  // ─────────────────────────────────────────────────────────────
  // 3. ASYNCHRONOUS EXPORT JOBS & EVENTBUS PROGRESS TELEMETRY
  // ─────────────────────────────────────────────────────────────
  describe('Export Jobs Background Processing & EventBus', () => {
    test('ExportWorker processes ExportJob, updates progress, and emits EventBus lifecycle events', async () => {
      const eventsEmitted = [];
      const listener = (payload, topic) => eventsEmitted.push({ topic, payload });

      eventBus.subscribe('export.started', listener);
      eventBus.subscribe('export.progress', listener);
      eventBus.subscribe('export.completed', listener);

      const mockJob = {
        _id: 'job_test_123',
        userId: '507f1f77bcf86cd799439011',
        reportType: 'revenue',
        format: 'pdf',
        filters: {},
        attempts: 0,
        maxAttempts: 3
      };

      jest.spyOn(reportService, 'generateReport').mockResolvedValue(sampleDTO);
      jest.spyOn(exportQueue, 'updateProgress').mockResolvedValue({});
      jest.spyOn(storageProvider, 'upload').mockResolvedValue({ url: '/uploads/reports/revenue_123.pdf', filename: 'revenue_123.pdf' });
      jest.spyOn(storageProvider, 'getSignedUrl').mockResolvedValue('https://storage.provider/signed');

      await exportWorker.processJob(mockJob);

      // Wait for EventBus handlers tick
      await new Promise((r) => setTimeout(r, 50));

      expect(exportQueue.updateProgress).toHaveBeenCalledWith('job_test_123', 100, 'completed', expect.any(Object));
      expect(eventsEmitted.some((e) => e.topic === 'export.started')).toBe(true);
      expect(eventsEmitted.some((e) => e.topic === 'export.completed')).toBe(true);
    });
  });

});
