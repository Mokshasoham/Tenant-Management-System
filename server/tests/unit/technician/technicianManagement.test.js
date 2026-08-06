import { jest, describe, beforeEach, it, expect } from '@jest/globals';
import technicianService from '../../../src/services/technicianService.js';
import technicianRepository from '../../../src/repositories/technicianRepository.js';
import Maintenance from '../../../src/models/Maintenance.js';
import eventBus from '../../../src/platform/events/eventBus.js';
import * as technicianController from '../../../src/controllers/technicianController.js';

describe('Phase 3.3.1 — Technician & Workforce Management Unit Tests', () => {
  beforeEach(() => {
    jest.restoreAllMocks();
    jest.clearAllMocks();
  });

  describe('Technician CRUD & Retrieval', () => {
    it('should fetch all technicians with pagination and workload metrics', async () => {
      const mockTech = {
        _id: 'tech101',
        firstName: 'Mike',
        lastName: 'Johnson',
        toObject: () => ({ _id: 'tech101', firstName: 'Mike', lastName: 'Johnson' })
      };

      jest.spyOn(technicianRepository, 'findWithFilters').mockResolvedValue([mockTech]);
      jest.spyOn(technicianRepository, 'countWithFilters').mockResolvedValue(1);
      jest.spyOn(Maintenance, 'countDocuments')
        .mockResolvedValueOnce(2) // currentJobs
        .mockResolvedValueOnce(1) // pendingJobs
        .mockResolvedValueOnce(4); // completedToday

      const res = await technicianService.getAllTechnicians({ page: 1, limit: 10 });

      expect(res.technicians).toHaveLength(1);
      expect(res.technicians[0].workload).toEqual({
        currentJobs: 2,
        pendingJobs: 1,
        completedToday: 4,
        totalActiveJobs: 3,
        utilizationPercent: 60
      });
      expect(res.pagination.total).toBe(1);
    });

    it('should create technician profile and publish technician.created event', async () => {
      const inputData = { firstName: 'Sam', lastName: 'Smith', email: 'sam@tms.com' };
      const createdTech = { _id: 'tech102', ...inputData, technicianProfile: { employeeId: 'TECH-8899' } };

      jest.spyOn(technicianRepository, 'create').mockResolvedValue(createdTech);
      jest.spyOn(eventBus, 'publish').mockResolvedValue(true);

      const res = await technicianService.createTechnician(inputData);

      expect(technicianRepository.create).toHaveBeenCalledWith(inputData);
      expect(eventBus.publish).toHaveBeenCalledWith('technician.created', expect.objectContaining({ technicianId: 'tech102' }));
      expect(res._id).toBe('tech102');
    });
  });

  describe('Technician Workload & Performance Analytics', () => {
    it('should compute technician performance metrics', async () => {
      const completedMock = [
        { _id: 't1', actualResolutionTimeMinutes: 45 },
        { _id: 't2', actualResolutionTimeMinutes: 75 }
      ];

      jest.spyOn(Maintenance, 'find').mockResolvedValue(completedMock);
      jest.spyOn(technicianRepository, 'findById').mockResolvedValue({
        _id: 'tech101',
        technicianProfile: { rating: 4.9, firstTimeFixRate: 96, reopenedTickets: 1 }
      });

      const res = await technicianService.getTechnicianPerformance('tech101');

      expect(res.jobsCompleted).toBe(2);
      expect(res.avgResolutionTimeMins).toBe(60);
      expect(res.avgRating).toBe(4.9);
      expect(res.firstTimeFixPercent).toBe(96);
    });
  });

  describe('Technician Controller', () => {
    it('should respond with technicians list in getAllTechnicians controller handler', async () => {
      const req = { query: { page: '1' } };
      const res = { status: jest.fn().mockReturnThis(), json: jest.fn() };
      const next = jest.fn();

      jest.spyOn(technicianService, 'getAllTechnicians').mockResolvedValue({
        technicians: [{ _id: 'tech101', firstName: 'Mike' }],
        pagination: { total: 1, page: 1, pages: 1 }
      });

      await technicianController.getAllTechnicians(req, res, next);

      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith({
        success: true,
        data: [{ _id: 'tech101', firstName: 'Mike' }],
        pagination: { total: 1, page: 1, pages: 1 }
      });
    });
  });
});
