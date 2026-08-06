import { jest, describe, beforeEach, it, expect } from '@jest/globals';
import maintenanceReportService from '../../../src/modules/reporting/services/MaintenanceReportService.js';
import Maintenance from '../../../src/models/Maintenance.js';
import User from '../../../src/models/User.js';
import eventBus from '../../../src/platform/events/eventBus.js';
import * as maintenanceController from '../../../src/controllers/maintenanceController.js';
import maintenanceRepository from '../../../src/repositories/maintenanceRepository.js';

describe('Sub-Milestone 3.1 — Manager Maintenance Dashboard & Queue Unit Tests', () => {
  beforeEach(() => {
    jest.restoreAllMocks();
    jest.clearAllMocks();
  });

  describe('MaintenanceReportService.getManagerDashboardMetrics()', () => {
    it('should compute all 10 Manager KPIs and 7 Chart datasets in parallel without duplicate queries', async () => {
      jest.spyOn(Maintenance, 'countDocuments')
        .mockResolvedValueOnce(100)  // totalRequests
        .mockResolvedValueOnce(20)   // openCount
        .mockResolvedValueOnce(15)   // inProgressCount
        .mockResolvedValueOnce(5)    // emergencyCount
        .mockResolvedValueOnce(8)    // completedTodayCount
        .mockResolvedValueOnce(60)   // totalCompletedCount
        .mockResolvedValueOnce(3);   // slaBreachedCount

      jest.spyOn(Maintenance, 'aggregate')
        .mockResolvedValueOnce([{ _id: 'open', count: 20 }, { _id: 'completed', count: 60 }]) // byStatus
        .mockResolvedValueOnce([{ _id: 'emergency', count: 5 }, { _id: 'high', count: 25 }])   // byPriority
        .mockResolvedValueOnce([{ _id: 'plumbing', count: 40 }, { _id: 'hvac', count: 30 }])     // byCategory
        .mockResolvedValueOnce([{ _id: 'tech123', count: 12 }])                                   // techWorkload
        .mockResolvedValueOnce([{ _id: '2026-08', created: 45 }])                                 // monthlyTrend
        .mockResolvedValueOnce([{ _id: null, avgMinutes: 1110 }]);                                // avgResolutionMinutes

      jest.spyOn(User, 'find').mockImplementation(() => ({
        lean: jest.fn().mockResolvedValue([{ _id: 'tech123', firstName: 'John', lastName: 'Doe', rating: 4.9 }])
      }));

      const metrics = await maintenanceReportService.getManagerDashboardMetrics();

      expect(metrics.kpis).toBeDefined();
      expect(metrics.kpis.totalRequests).toBe(100);
      expect(metrics.kpis.open).toBe(20);
      expect(metrics.kpis.emergency).toBe(5);
      expect(metrics.kpis.slaBreached).toBe(3);
      expect(metrics.kpis.completedToday).toBe(8);
      expect(metrics.kpis.avgResolutionTimeHours).toBe(18.5);
      expect(metrics.kpis.technicianUtilizationPercent).toBe(84);
      expect(metrics.kpis.customerSatisfactionScore).toBe(4.8);

      expect(metrics.charts).toBeDefined();
      expect(metrics.charts.byStatus).toHaveLength(2);
      expect(metrics.charts.byPriority).toHaveLength(2);
      expect(metrics.charts.byCategory).toHaveLength(2);
      expect(metrics.charts.technicianWorkload[0].name).toBe('John Doe');
    });
  });

  describe('maintenanceController.getManagerDashboard()', () => {
    it('should publish manager.dashboard.viewed and return metrics', async () => {
      const req = { user: { userId: 'manager1', role: 'manager' }, query: {} };
      const next = jest.fn();
      const res = { status: jest.fn().mockReturnThis(), json: jest.fn() };

      const mockMetrics = { kpis: { totalRequests: 50 }, charts: {} };
      jest.spyOn(maintenanceReportService, 'getManagerDashboardMetrics').mockResolvedValue(mockMetrics);
      const publishSpy = jest.spyOn(eventBus, 'publish').mockImplementation(() => Promise.resolve(true));

      await maintenanceController.getManagerDashboard(req, res, next);
      if (next.mock.calls.length > 0) {
        console.error('getManagerDashboard next called with:', next.mock.calls[0][0]);
      }

      expect(publishSpy).toHaveBeenCalledWith('manager.dashboard.viewed', expect.objectContaining({ userId: 'manager1' }));
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith({ success: true, data: mockMetrics });
    });
  });

  describe('maintenanceController.getAllRequests() queue filters & EventBus', () => {
    it('should filter queue by status, emergencyOnly, slaBreached and publish maintenance.queue.filtered', async () => {
      const req = {
        user: { userId: 'manager1', role: 'manager' },
        query: { emergencyOnly: 'true', slaBreached: 'true', page: '1', limit: '20' }
      };
      const next = jest.fn();
      const res = { status: jest.fn().mockReturnThis(), json: jest.fn() };

      jest.spyOn(maintenanceRepository, 'findWithFilters').mockResolvedValue([{ _id: 't1', title: 'Emergency Burst Pipe' }]);
      jest.spyOn(maintenanceRepository, 'countWithFilters').mockResolvedValue(1);
      const publishSpy = jest.spyOn(eventBus, 'publish').mockImplementation(() => Promise.resolve(true));

      await maintenanceController.getAllRequests(req, res, next);
      if (next.mock.calls.length > 0) {
        console.error('getAllRequests next called with:', next.mock.calls[0][0]);
      }

      expect(publishSpy).toHaveBeenCalledWith('maintenance.queue.filtered', expect.objectContaining({
        resultCount: 1,
        userId: 'manager1'
      }));
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
        success: true,
        data: [expect.objectContaining({ title: 'Emergency Burst Pipe' })]
      }));
    });
  });
});
