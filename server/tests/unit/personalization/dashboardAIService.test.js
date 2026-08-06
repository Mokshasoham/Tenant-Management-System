/**
 * server/tests/unit/personalization/dashboardAIService.test.js
 *
 * Unit Test Suite for Phase 2.3.5.5 — Operational Robustness, SHA256 Checksums & AI Suggestions.
 */

import { jest } from '@jest/globals';
import dashboardExportService from '../../../src/services/DashboardExportService.js';
import dashboardLayoutService from '../../../src/services/DashboardLayoutService.js';
import dashboardLayoutRepository from '../../../src/repositories/dashboardLayoutRepository.js';

describe('Phase 2.3.5.5 — Operational Robustness & AI Suggestions Unit Tests', () => {

  afterEach(() => {
    jest.restoreAllMocks();
  });

  // ─────────────────────────────────────────────────────────────
  // 1. SHA256 CHECKSUM & SIZE GUARDS
  // ─────────────────────────────────────────────────────────────
  describe('SHA256 Checksum & Size Guards', () => {
    test('calculates deterministic SHA256 checksum over layout widgets', () => {
      const widgets = [{ widgetId: 'revenue_kpi', x: 0, y: 0, w: 2, h: 1 }];
      const checksum = dashboardExportService.calculateChecksum(widgets);

      expect(checksum).toMatch(/^sha256:[a-f0-9]{64}$/);
    });

    test('rejects layout package exceeding 500 widget limit', async () => {
      const oversizedWidgets = Array.from({ length: 501 }, (_, i) => ({ widgetId: `w${i}`, x: 0, y: 0, w: 2, h: 1 }));

      await expect(
        dashboardExportService.previewImportJSON('507f1f77bcf86cd799439011', 'admin', {
          schemaVersion: 1,
          widgets: oversizedWidgets
        })
      ).rejects.toThrow('exceeds 500 widget limit');
    });
  });

  // ─────────────────────────────────────────────────────────────
  // 2. ITEMIZED SKIP REASON REPORTING
  // ─────────────────────────────────────────────────────────────
  describe('Itemized Skip Reason Reporting', () => {
    test('returns detailed itemized report for valid and invalid widgets', async () => {
      jest.spyOn(dashboardLayoutRepository, 'findByUserAndRole').mockResolvedValue(null);

      const samplePackage = {
        schemaVersion: 1,
        profileName: 'Test Profile',
        widgets: [
          { widgetId: 'revenue_kpi', x: 0, y: 0, w: 2, h: 1 },
          { widgetId: 'corrupt_widget', x: 0, y: 0, w: 99, h: 1 }
        ]
      };

      const res = await dashboardExportService.previewImportJSON('507f1f77bcf86cd799439011', 'admin', samplePackage);

      expect(res.success).toBe(true);
      expect(res.validWidgets).toBe(1);
      expect(res.skippedWidgets).toBe(1);
      expect(res.itemizedReport.skipped[0].reason).toBe('INVALID_COORDINATES');
    });
  });

  // ─────────────────────────────────────────────────────────────
  // 3. AI LAYOUT RECOMMENDATIONS ENGINE
  // ─────────────────────────────────────────────────────────────
  describe('AI Layout Recommendations Engine', () => {
    test('returns AI layout recommendation DTO with confidence score and suggested widgets', async () => {
      const res = await dashboardLayoutService.getAISuggestions('507f1f77bcf86cd799439011', 'admin');

      expect(res.success).toBe(true);
      expect(res.source).toBe('AI_RECOMMENDER');
      expect(res.confidence).toBeGreaterThan(0.8);
      expect(res.suggestedWidgets).toHaveLength(3);
    });
  });

});
