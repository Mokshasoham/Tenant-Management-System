import { jest, describe, beforeEach, it, expect } from '@jest/globals';
import workforceSchedulingService from '../../../src/services/workforceSchedulingService.js';
import workforceSchedulingRepository from '../../../src/repositories/workforceSchedulingRepository.js';
import Maintenance from '../../../src/models/Maintenance.js';
import User from '../../../src/models/User.js';
import eventBus from '../../../src/platform/events/eventBus.js';

describe('Phase 3.3.2 — Workforce Scheduling & Dispatch Engine Unit Tests', () => {
  beforeEach(() => {
    jest.restoreAllMocks();
    jest.clearAllMocks();
  });

  describe('Shift Scheduling & Conflict Detection', () => {
    it('should throw an error when shift conflicts exist', async () => {
      const shiftInput = {
        technician: 'tech101',
        startDate: new Date('2026-08-10T09:00:00Z'),
        endDate: new Date('2026-08-10T17:00:00Z')
      };

      jest.spyOn(workforceSchedulingRepository, 'checkConflicts').mockResolvedValue([{ _id: 'c1' }]);

      await expect(workforceSchedulingService.createShift(shiftInput))
        .rejects
        .toThrow(/Schedule Conflict Detected/);
    });

    it('should create shift successfully when no conflicts exist', async () => {
      const shiftInput = {
        technician: 'tech101',
        startDate: new Date('2026-08-10T09:00:00Z'),
        endDate: new Date('2026-08-10T17:00:00Z'),
        shiftName: 'morning'
      };

      const createdShift = { _id: 's101', ...shiftInput };

      jest.spyOn(workforceSchedulingRepository, 'checkConflicts').mockResolvedValue([]);
      jest.spyOn(workforceSchedulingRepository, 'create').mockResolvedValue(createdShift);
      jest.spyOn(eventBus, 'publish').mockResolvedValue(true);

      const res = await workforceSchedulingService.createShift(shiftInput);

      expect(res._id).toBe('s101');
      expect(eventBus.publish).toHaveBeenCalledWith('workforce.shift.created', expect.any(Object));
    });
  });

  describe('Auto-Scheduling Assistant', () => {
    it('should score and recommend technicians based on skill match and capacity', async () => {
      const mockTicket = { _id: 't101', category: 'Plumbing', title: 'Leaky Pipe' };
      const mockTechs = [
        {
          _id: 'techA',
          firstName: 'John',
          lastName: 'Doe',
          technicianProfile: { rating: 4.8, skills: [{ name: 'Plumbing' }], maxCapacity: 5 }
        }
      ];

      jest.spyOn(Maintenance, 'findById').mockResolvedValue(mockTicket);
      jest.spyOn(User, 'find').mockResolvedValue(mockTechs);
      jest.spyOn(Maintenance, 'countDocuments').mockResolvedValue(1);

      const res = await workforceSchedulingService.autoSuggestTechnician('t101');

      expect(res).toHaveLength(1);
      expect(res[0].score).toBeGreaterThan(60);
      expect(res[0].recommendationReason).toContain('Plumbing');
    });
  });

  describe('Dispatch Engine', () => {
    it('should dispatch ticket to technician and update maintenance status', async () => {
      const mockTicket = {
        _id: 't102',
        status: 'open',
        statusHistory: [],
        save: jest.fn().mockResolvedValue(true)
      };

      jest.spyOn(Maintenance, 'findById').mockResolvedValue(mockTicket);
      jest.spyOn(workforceSchedulingRepository, 'create').mockResolvedValue({ _id: 'd101' });
      jest.spyOn(eventBus, 'publish').mockResolvedValue(true);

      const res = await workforceSchedulingService.dispatchTicket('t102', 'techA');

      expect(mockTicket.status).toBe('technician_assigned');
      expect(mockTicket.save).toHaveBeenCalled();
      expect(eventBus.publish).toHaveBeenCalledWith('workforce.dispatched', expect.any(Object));
    });
  });
});
