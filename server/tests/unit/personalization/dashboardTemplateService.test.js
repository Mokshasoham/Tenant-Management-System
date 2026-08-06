/**
 * server/tests/unit/personalization/dashboardTemplateService.test.js
 *
 * Unit Test Suite for Phase 2.3.5.3 — Shared Dashboard Templates & Catalog Engine.
 */

import { jest } from '@jest/globals';
import dashboardTemplateService from '../../../src/services/DashboardTemplateService.js';
import dashboardTemplateRepository from '../../../src/repositories/dashboardTemplateRepository.js';
import dashboardLayoutService from '../../../src/services/DashboardLayoutService.js';
import eventBus from '../../../src/platform/events/eventBus.js';

describe('Phase 2.3.5.3 — Dashboard Templates & Catalog Engine Unit Tests', () => {

  afterEach(() => {
    jest.restoreAllMocks();
  });

  // ─────────────────────────────────────────────────────────────
  // 1. CATALOG SEARCH & TEMPLATE CREATION
  // ─────────────────────────────────────────────────────────────
  describe('Catalog Search & Template Creation', () => {
    test('searches catalog templates by scope and role', async () => {
      jest.spyOn(dashboardTemplateRepository, 'searchCatalog').mockResolvedValue([
        { title: 'Executive Dashboard', scope: 'GLOBAL', category: 'executive' },
        { title: 'Finance Overview', scope: 'ORGANIZATION', category: 'finance' }
      ]);

      const res = await dashboardTemplateService.searchCatalog({ category: 'finance' }, 'admin');

      expect(res.success).toBe(true);
      expect(res.count).toBe(2);
    });

    test('creates template and publishes dashboard.template.created event', async () => {
      const eventsEmitted = [];
      eventBus.subscribe('dashboard.template.created', (payload) => eventsEmitted.push(payload));

      jest.spyOn(dashboardTemplateRepository, 'createTemplate').mockResolvedValue({
        _id: 'temp123',
        title: 'Operations Dashboard',
        scope: 'ORGANIZATION',
        category: 'operations',
        widgets: [{ widgetId: 'maintenance_kpi', x: 0, y: 0, w: 2, h: 1 }]
      });

      const res = await dashboardTemplateService.createTemplate(
        'user123',
        'admin',
        {
          title: 'Operations Dashboard',
          category: 'operations',
          widgets: [{ widgetId: 'maintenance_kpi', x: 0, y: 0, w: 2, h: 1 }]
        }
      );

      expect(res.success).toBe(true);
      expect(res.template.title).toBe('Operations Dashboard');
      expect(eventsEmitted).toHaveLength(1);
      expect(eventsEmitted[0].templateId).toBe('temp123');
    });

    test('rejects template creation without widgets with TEMPLATE_VALIDATION_ERROR', async () => {
      await expect(
        dashboardTemplateService.createTemplate('user123', 'admin', { title: 'Invalid', widgets: [] })
      ).rejects.toThrow('TEMPLATE_VALIDATION_ERROR');
    });
  });

  // ─────────────────────────────────────────────────────────────
  // 2. IMMUTABLE TEMPLATE APPLICATION & USAGE TRACKING
  // ─────────────────────────────────────────────────────────────
  describe('Immutable Template Application', () => {
    test('applies template to user profile, increments usageCount, and publishes event', async () => {
      const eventsEmitted = [];
      eventBus.subscribe('dashboard.template.applied', (payload) => eventsEmitted.push(payload));

      jest.spyOn(dashboardTemplateRepository, 'findById').mockResolvedValue({
        _id: 'temp123',
        title: 'Finance Executive',
        status: 'ACTIVE',
        widgets: [{ widgetId: 'revenue_kpi', x: 0, y: 0, w: 4, h: 1 }]
      });

      jest.spyOn(dashboardLayoutService, 'saveLayout').mockResolvedValue({
        widgets: [{ widgetId: 'revenue_kpi', x: 0, y: 0, w: 4, h: 1 }]
      });

      jest.spyOn(dashboardTemplateRepository, 'incrementUsage').mockResolvedValue({});

      const res = await dashboardTemplateService.applyTemplateToUser('user123', 'admin', 'temp123', 'Finance (Applied)');

      expect(res.success).toBe(true);
      expect(res.profileName).toBe('Finance (Applied)');
      expect(eventsEmitted).toHaveLength(1);
      expect(eventsEmitted[0].templateId).toBe('temp123');
    });
  });

  // ─────────────────────────────────────────────────────────────
  // 3. SOFT DELETION (ARCHIVING)
  // ─────────────────────────────────────────────────────────────
  describe('Soft Deletion (Archiving)', () => {
    test('archives template (soft delete) and publishes dashboard.template.archived event', async () => {
      const eventsEmitted = [];
      eventBus.subscribe('dashboard.template.archived', (payload) => eventsEmitted.push(payload));

      jest.spyOn(dashboardTemplateRepository, 'findById').mockResolvedValue({
        _id: 'temp123',
        title: 'Old Template',
        createdById: 'user123'
      });

      jest.spyOn(dashboardTemplateRepository, 'softDelete').mockResolvedValue({
        _id: 'temp123',
        title: 'Old Template',
        status: 'ARCHIVED'
      });

      const res = await dashboardTemplateService.archiveTemplate('user123', 'admin', 'temp123');

      expect(res.success).toBe(true);
      expect(eventsEmitted).toHaveLength(1);
      expect(eventsEmitted[0].templateId).toBe('temp123');
    });
  });

});
