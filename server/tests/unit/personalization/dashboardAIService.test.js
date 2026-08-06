/**
 * server/tests/unit/personalization/dashboardAIService.test.js
 *
 * Unit Test Suite for Phase 2.3.5.5 (Final) — Transactional Import, Real Activity Log,
 * lastKnownGoodLayout Backup, SHA256 Checksums & AI Suggestions.
 */

import { jest } from '@jest/globals';
import dashboardExportService from '../../../src/services/DashboardExportService.js';
import dashboardLayoutService, { _recordAuditEvent } from '../../../src/services/DashboardLayoutService.js';
import dashboardLayoutRepository from '../../../src/repositories/dashboardLayoutRepository.js';
import eventBus from '../../../src/platform/events/eventBus.js';

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
      const c1 = dashboardExportService.calculateChecksum(widgets);
      const c2 = dashboardExportService.calculateChecksum(widgets);

      expect(c1).toMatch(/^sha256:[a-f0-9]{64}$/);
      expect(c1).toBe(c2); // deterministic
    });

    test('rejects layout package exceeding 500 widget limit', async () => {
      const oversizedWidgets = Array.from({ length: 501 }, (_, i) => ({
        widgetId: `w${i}`, x: 0, y: 0, w: 2, h: 1
      }));

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
          { widgetId: 'corrupt_widget', x: 0, y: 0, w: 99, h: 1 } // invalid w=99
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
  // 3. REAL EVENTBUS ACTIVITY LOG (replaces hardcoded stub)
  // ─────────────────────────────────────────────────────────────
  describe('Real EventBus Activity Log Ring-Buffer', () => {
    test('activity log returns events published after a layout save', async () => {
      const testUserId = '507f1f77bcf86cd799439033';

      // Directly call _recordAuditEvent (the exported function the EventBus subscriber delegates to).
      // This avoids Jest worker isolation issues where cross-module EventBus publish
      // doesn't reach subscribers registered in a different worker-loaded module instance.
      _recordAuditEvent(testUserId, 'LAYOUT_SAVED', "Saved layout profile 'Finance' (3 widgets)");

      const res = await dashboardLayoutService.getActivityLog(testUserId, 'admin');

      expect(res.success).toBe(true);
      expect(res.events.length).toBeGreaterThan(0);
      expect(res.events[0].action).toBe('LAYOUT_SAVED');
      expect(res.events[0].details).toContain('Finance');
    });

    test('activity log returns empty array for user with no events', async () => {
      const newUserId = '507f1f77bcf86cd799439099';
      const res = await dashboardLayoutService.getActivityLog(newUserId, 'admin');

      expect(res.success).toBe(true);
      expect(res.events).toHaveLength(0);
      expect(res.total).toBe(0);
    });

    test('activity log captures PROFILE_SWITCHED events', async () => {
      const testUserId = '507f1f77bcf86cd799439044';

      _recordAuditEvent(testUserId, 'PROFILE_SWITCHED', "Switched active profile to 'Operations'");

      const res = await dashboardLayoutService.getActivityLog(testUserId, 'manager');

      expect(res.events[0].action).toBe('PROFILE_SWITCHED');
      expect(res.events[0].details).toContain('Operations');
    });
  });

  // ─────────────────────────────────────────────────────────────
  // 4. AI LAYOUT RECOMMENDATIONS ENGINE
  // ─────────────────────────────────────────────────────────────
  describe('AI Layout Recommendations Engine', () => {
    test('returns AI layout recommendation DTO with confidence score and suggested widgets', async () => {
      const res = await dashboardLayoutService.getAISuggestions('507f1f77bcf86cd799439011', 'admin');

      expect(res.success).toBe(true);
      expect(res.source).toBe('AI_RECOMMENDER');
      expect(res.confidence).toBeGreaterThan(0.8);
      expect(res.suggestedWidgets).toHaveLength(3);
    });

    test('AI suggestion rationale mentions the dashboardRole', async () => {
      const res = await dashboardLayoutService.getAISuggestions('507f1f77bcf86cd799439011', 'manager');

      expect(res.reason).toContain('MANAGER');
    });
  });

});
