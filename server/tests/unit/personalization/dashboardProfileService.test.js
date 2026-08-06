/**
 * server/tests/unit/personalization/dashboardProfileService.test.js
 *
 * Unit Test Suite for Phase 2.3.5.2 — Dashboard Profiles & Presets Engine.
 */

import { jest } from '@jest/globals';
import dashboardLayoutService from '../../../src/services/DashboardLayoutService.js';
import dashboardLayoutRepository from '../../../src/repositories/dashboardLayoutRepository.js';
import eventBus from '../../../src/platform/events/eventBus.js';

describe('Phase 2.3.5.2 — Dashboard Profiles & Presets Engine Unit Tests', () => {

  afterEach(() => {
    jest.restoreAllMocks();
  });

  // ─────────────────────────────────────────────────────────────
  // 1. PROFILE LISTING & SWITCHING
  // ─────────────────────────────────────────────────────────────
  describe('Profile Listing & Switching', () => {
    test('lists saved user profiles for role', async () => {
      jest.spyOn(dashboardLayoutRepository, 'listUserProfiles').mockResolvedValue([
        { profileName: 'Default', isActive: true },
        { profileName: 'Finance (Custom)', isActive: false }
      ]);

      const res = await dashboardLayoutService.listUserProfiles('user123', 'admin');

      expect(res.success).toBe(true);
      expect(res.profiles).toHaveLength(2);
    });

    test('switches active profile and publishes dashboard.profile.changed event', async () => {
      const eventsEmitted = [];
      eventBus.subscribe('dashboard.profile.changed', (payload) => eventsEmitted.push(payload));

      jest.spyOn(dashboardLayoutRepository, 'setActiveProfile').mockResolvedValue({
        profileName: 'Finance Executive',
        isActive: true
      });

      const res = await dashboardLayoutService.switchActiveProfile('user123', 'admin', 'Finance Executive');

      expect(res.success).toBe(true);
      expect(res.profileName).toBe('Finance Executive');
      expect(eventsEmitted).toHaveLength(1);
      expect(eventsEmitted[0].profileName).toBe('Finance Executive');
    });
  });

  // ─────────────────────────────────────────────────────────────
  // 2. COPY-ON-EDIT PRESET CLONING & VALIDATION
  // ─────────────────────────────────────────────────────────────
  describe('Copy-on-Edit Preset Cloning & Validation', () => {
    test('clones preset into user custom profile and publishes dashboard.profile.cloned event', async () => {
      const eventsEmitted = [];
      eventBus.subscribe('dashboard.profile.cloned', (payload) => eventsEmitted.push(payload));

      jest.spyOn(dashboardLayoutRepository, 'upsertLayout').mockResolvedValue({
        __v: 0,
        widgets: [{ widgetId: 'revenue_kpi', x: 0, y: 0, w: 4, h: 1 }]
      });

      const res = await dashboardLayoutService.clonePresetToUserProfile(
        'user123',
        'admin',
        'finance',
        'Finance (My Copy)',
        [{ widgetId: 'revenue_kpi', x: 0, y: 0, w: 4, h: 1 }]
      );

      expect(res.success).toBe(true);
      expect(res.profileName).toBe('Finance (My Copy)');
      expect(eventsEmitted).toHaveLength(1);
      expect(eventsEmitted[0].presetId).toBe('finance');
    });

    test('rejects layout with 0 widgets during cloning with PROFILE_VALIDATION_ERROR', async () => {
      await expect(
        dashboardLayoutService.clonePresetToUserProfile(
          'user123',
          'admin',
          'finance',
          'Empty Layout',
          []
        )
      ).rejects.toThrow('PROFILE_VALIDATION_ERROR');
    });
  });

});
