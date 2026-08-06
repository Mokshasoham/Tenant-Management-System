/**
 * server/tests/unit/personalization/dashboardLayoutService.test.js
 *
 * Unit Test Suite for Phase 2.3.5.1 — Dashboard Personalization Core & OCC Engine.
 */

import { jest } from '@jest/globals';
import dashboardLayoutService from '../../../src/services/DashboardLayoutService.js';
import dashboardLayoutRepository from '../../../src/repositories/dashboardLayoutRepository.js';
import eventBus from '../../../src/platform/events/eventBus.js';

describe('Phase 2.3.5.1 — Dashboard Personalization & OCC Engine Unit Tests', () => {

  afterEach(() => {
    jest.restoreAllMocks();
  });

  // ─────────────────────────────────────────────────────────────
  // 1. GRID BOUNDARY & COLLISION VALIDATION
  // ─────────────────────────────────────────────────────────────
  describe('Grid Boundary & Collision Validation', () => {
    test('passes valid non-overlapping grid layout', () => {
      const validWidgets = [
        { widgetId: 'w1', x: 0, y: 0, w: 2, h: 1, enabled: true },
        { widgetId: 'w2', x: 2, y: 0, w: 2, h: 1, enabled: true }
      ];

      expect(() => dashboardLayoutService.validateGridCoordinates(validWidgets)).not.toThrow();
    });

    test('throws error if widget exceeds 4-column grid boundary', () => {
      const invalidWidgets = [
        { widgetId: 'w1', x: 3, y: 0, w: 2, h: 1, enabled: true }
      ];

      expect(() => dashboardLayoutService.validateGridCoordinates(invalidWidgets))
        .toThrow('exceeds 4-column grid width boundary');
    });

    test('throws collision error when two active widgets overlap in 2D space', () => {
      const overlappingWidgets = [
        { widgetId: 'w1', x: 0, y: 0, w: 3, h: 1, enabled: true },
        { widgetId: 'w2', x: 1, y: 0, w: 2, h: 1, enabled: true }
      ];

      expect(() => dashboardLayoutService.validateGridCoordinates(overlappingWidgets))
        .toThrow('GRID_COLLISION_ERROR');
    });
  });

  // ─────────────────────────────────────────────────────────────
  // 2. LAYOUT RETRIEVAL & DEFAULT FALLBACK
  // ─────────────────────────────────────────────────────────────
  describe('Layout Retrieval', () => {
    test('returns default fallback DTO when user has no stored layout', async () => {
      jest.spyOn(dashboardLayoutRepository, 'findByUserAndRole').mockResolvedValue(null);

      const res = await dashboardLayoutService.getLayout('user123', 'admin', 'Default');

      expect(res.success).toBe(true);
      expect(res.isCustom).toBe(false);
      expect(res.version).toBe(0);
      expect(res.widgets).toEqual([]);
    });

    test('returns stored layout DTO with __v version when layout exists', async () => {
      jest.spyOn(dashboardLayoutRepository, 'findByUserAndRole').mockResolvedValue({
        profileName: 'Default',
        dashboardRole: 'admin',
        __v: 3,
        layoutVersion: 1,
        widgets: [{ widgetId: 'w1', x: 0, y: 0, w: 2, h: 1 }]
      });

      const res = await dashboardLayoutService.getLayout('user123', 'admin', 'Default');

      expect(res.success).toBe(true);
      expect(res.isCustom).toBe(true);
      expect(res.version).toBe(3);
      expect(res.widgets).toHaveLength(1);
    });
  });

  // ─────────────────────────────────────────────────────────────
  // 3. OPTIMISTIC CONCURRENCY CONTROL (__v) & EVENTBUS EMISSION
  // ─────────────────────────────────────────────────────────────
  describe('Optimistic Concurrency Control (__v) & Events', () => {
    test('saves valid layout and emits dashboard.layout.updated event', async () => {
      const eventsEmitted = [];
      eventBus.subscribe('dashboard.layout.updated', (payload) => eventsEmitted.push(payload));

      jest.spyOn(dashboardLayoutRepository, 'upsertLayout').mockResolvedValue({
        __v: 1,
        widgets: [{ widgetId: 'w1', x: 0, y: 0, w: 2, h: 1 }]
      });

      const res = await dashboardLayoutService.saveLayout(
        'user123',
        'admin',
        'Default',
        [{ widgetId: 'w1', x: 0, y: 0, w: 2, h: 1 }],
        0
      );

      expect(res.success).toBe(true);
      expect(res.version).toBe(1);
      expect(eventsEmitted).toHaveLength(1);
      expect(eventsEmitted[0].userId).toBe('user123');
    });

    test('throws 409 OCC_VERSION_CONFLICT when expectedVersion does not match __v', async () => {
      const occError = new Error('OCC_VERSION_CONFLICT');
      occError.statusCode = 409;
      occError.serverVersion = 5;

      jest.spyOn(dashboardLayoutRepository, 'upsertLayout').mockRejectedValue(occError);

      await expect(
        dashboardLayoutService.saveLayout(
          'user123',
          'admin',
          'Default',
          [{ widgetId: 'w1', x: 0, y: 0, w: 2, h: 1 }],
          2 // Stale version
        )
      ).rejects.toThrow('OCC_VERSION_CONFLICT');
    });
  });

  // ─────────────────────────────────────────────────────────────
  // 4. SINGLE WIDGET RESET
  // ─────────────────────────────────────────────────────────────
  describe('Single Widget Reset', () => {
    test('resets specific widget dimensions and settings within stored layout', async () => {
      jest.spyOn(dashboardLayoutRepository, 'findByUserAndRole').mockResolvedValue({
        __v: 2,
        widgets: [
          { widgetId: 'w1', x: 0, y: 0, w: 4, h: 2, settings: { month: 12 } }
        ]
      });

      jest.spyOn(dashboardLayoutRepository, 'upsertLayout').mockResolvedValue({
        __v: 3,
        widgets: [{ widgetId: 'w1', x: 0, y: 0, w: 2, h: 1, settings: {} }]
      });

      const res = await dashboardLayoutService.resetWidget(
        'user123',
        'admin',
        'Default',
        'w1',
        { w: 2, h: 1, settings: {} }
      );

      expect(res.success).toBe(true);
      expect(res.version).toBe(3);
    });
  });

});
