/**
 * server/tests/unit/personalization/dashboardExportService.test.js
 *
 * Unit Test Suite for Phase 2.3.5.4 — Import / Export Engine & Pre-Import Preview.
 */

import { jest } from '@jest/globals';
import dashboardExportService from '../../../src/services/DashboardExportService.js';
import dashboardLayoutRepository from '../../../src/repositories/dashboardLayoutRepository.js';
import eventBus from '../../../src/platform/events/eventBus.js';
import mongoose from 'mongoose';

describe('Phase 2.3.5.4 — Import / Export Engine Unit Tests', () => {

  afterEach(() => {
    jest.restoreAllMocks();
  });

  // ─────────────────────────────────────────────────────────────
  // 1. JSON EXPORT & SCHEMA VERSIONING
  // ─────────────────────────────────────────────────────────────
  describe('JSON Export & Schema Versioning', () => {
    test('exports active layout into portable JSON package with schemaVersion: 1', async () => {
      const eventsEmitted = [];
      eventBus.subscribe('dashboard.layout.exported', (payload) => eventsEmitted.push(payload));

      jest.spyOn(dashboardLayoutRepository, 'findByUserAndRole').mockResolvedValue({
        profileName: 'Default',
        dashboardRole: 'admin',
        widgets: [{ widgetId: 'revenue_kpi', x: 0, y: 0, w: 2, h: 1 }]
      });

      const res = await dashboardExportService.exportLayoutJSON('user123', 'admin', 'Default');

      expect(res.schemaVersion).toBe(1);
      expect(res.profileName).toBe('Default');
      expect(res.widgets).toHaveLength(1);
      expect(eventsEmitted).toHaveLength(1);
      expect(eventsEmitted[0].profileName).toBe('Default');
    });

    test('throws 404 EXPORT_FAILED if layout profile does not exist', async () => {
      jest.spyOn(dashboardLayoutRepository, 'findByUserAndRole').mockResolvedValue(null);

      await expect(
        dashboardExportService.exportLayoutJSON('user123', 'admin', 'NonExistent')
      ).rejects.toThrow('EXPORT_FAILED');
    });
  });

  // ─────────────────────────────────────────────────────────────
  // 2. PRE-IMPORT PREVIEW & IMPORTSUMMARY DTO
  // ─────────────────────────────────────────────────────────────
  describe('Pre-Import Preview & ImportSummary DTO', () => {
    test('returns ImportSummary DTO with duplicate status and valid widget count', async () => {
      jest.spyOn(dashboardLayoutRepository, 'findByUserAndRole').mockResolvedValue({
        profileName: 'Finance Overview'
      });

      const samplePackage = {
        schemaVersion: 1,
        profileName: 'Finance Overview',
        widgets: [
          { widgetId: 'revenue_kpi', x: 0, y: 0, w: 2, h: 1 },
          { widgetId: 'occupancy_kpi', x: 2, y: 0, w: 2, h: 1 }
        ]
      };

      const res = await dashboardExportService.previewImportJSON('user123', 'admin', samplePackage);

      expect(res.success).toBe(true);
      expect(res.schemaVersion).toBe(1);
      expect(res.totalWidgets).toBe(2);
      expect(res.validWidgets).toBe(2);
      expect(res.duplicateStatus).toBe('EXACT_MATCH');
    });

    test('rejects package with invalid schemaVersion', async () => {
      const invalidPackage = { schemaVersion: 99, widgets: [{ widgetId: 'w1' }] };

      await expect(
        dashboardExportService.previewImportJSON('user123', 'admin', invalidPackage)
      ).rejects.toThrow('IMPORT_VALIDATION_ERROR');
    });
  });

  // ─────────────────────────────────────────────────────────────
  // 3. EXECUTE IMPORT & DUPLICATE RESOLUTION (TRANSACTIONAL)
  // ─────────────────────────────────────────────────────────────
  describe('Execute Import & Duplicate Resolution (Transactional)', () => {
    test('executes import with CREATE_COPY strategy inside a session and emits event', async () => {
      const eventsEmitted = [];
      eventBus.subscribe('dashboard.layout.imported', (payload) => eventsEmitted.push(payload));

      jest.spyOn(dashboardLayoutRepository, 'findByUserAndRole').mockResolvedValue({
        profileName: 'Finance'
      });

      // Mock upsertLayout — the direct call inside the transaction.
      jest.spyOn(dashboardLayoutRepository, 'upsertLayout').mockResolvedValue({
        widgets: [{ widgetId: 'revenue_kpi', x: 0, y: 0, w: 2, h: 1 }]
      });

      // Mock mongoose session so we don't need a live MongoDB replica set.
      const mockSession = {
        withTransaction: async (fn) => { await fn(); },
        endSession: jest.fn()
      };
      jest.spyOn(mongoose, 'startSession').mockResolvedValue(mockSession);

      const samplePackage = {
        schemaVersion: 1,
        profileName: 'Finance',
        widgets: [{ widgetId: 'revenue_kpi', x: 0, y: 0, w: 2, h: 1 }]
      };

      const res = await dashboardExportService.executeImportJSON('user123', 'admin', samplePackage, 'CREATE_COPY');

      expect(res.success).toBe(true);
      expect(res.profileName).toBe('Finance (Imported)');
      expect(eventsEmitted).toHaveLength(1);
      expect(eventsEmitted[0].profileName).toBe('Finance (Imported)');
      expect(mockSession.endSession).toHaveBeenCalled();
    });

    test('SKIP strategy returns early without any DB writes', async () => {
      jest.spyOn(dashboardLayoutRepository, 'findByUserAndRole').mockResolvedValue({
        profileName: 'Operations'
      });

      const upsertSpy = jest.spyOn(dashboardLayoutRepository, 'upsertLayout');

      const samplePackage = {
        schemaVersion: 1,
        profileName: 'Operations',
        widgets: [{ widgetId: 'occupancy_kpi', x: 0, y: 0, w: 2, h: 1 }]
      };

      const res = await dashboardExportService.executeImportJSON('user123', 'admin', samplePackage, 'SKIP');

      expect(res.imported).toBe(false);
      expect(upsertSpy).not.toHaveBeenCalled();
    });
  });

});
