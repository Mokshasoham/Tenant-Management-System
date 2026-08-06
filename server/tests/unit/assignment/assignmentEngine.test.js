/**
 * server/tests/unit/assignment/assignmentEngine.test.js
 * Unit tests for Phase 3.3.3 Smart Technician Assignment & Dispatch Intelligence.
 */

import { jest } from '@jest/globals';
import algorithmRegistry from '../../../src/services/assignment/algorithmRegistry.js';
import ruleEngineV1 from '../../../src/services/assignment/ruleEngineV1.js';
import assignmentEngineService from '../../../src/services/assignmentEngineService.js';
import technicianService from '../../../src/services/technicianService.js';
import assignmentRepository from '../../../src/repositories/assignmentRepository.js';
import Maintenance from '../../../src/models/Maintenance.js';
import User from '../../../src/models/User.js';
import AssignmentDecision from '../../../src/models/AssignmentDecision.js';

describe('Phase 3.3.3 — Smart Technician Assignment & Dispatch Intelligence', () => {
  let mockTicket;
  let mockTechnicians;
  let defaultWeights;

  beforeEach(() => {
    jest.clearAllMocks();
    assignmentEngineService.clearCache();

    defaultWeights = {
      skill: 30,
      distance: 20,
      workload: 15,
      rating: 10,
      sla: 15,
      history: 5,
      availability: 5
    };

    jest.spyOn(assignmentRepository, 'getActiveConfig').mockResolvedValue({
      weights: defaultWeights
    });

    mockTicket = {
      _id: '507f1f77bcf86cd799439011',
      title: 'Water Leakage in Kitchen',
      category: 'Plumbing',
      priority: 'high',
      buildingName: 'Tower A',
      unitNumber: '402',
      status: 'open'
    };

    mockTechnicians = [
      {
        _id: '507f1f77bcf86cd799439022',
        firstName: 'Mike',
        lastName: 'Johnson',
        email: 'mike@example.com',
        technicianProfile: {
          skills: [{ name: 'Plumbing', level: 'Expert' }],
          rating: 4.9,
          availabilityStatus: 'Available',
          employmentStatus: 'Active',
          preferredZone: 'Tower A',
          slaMetPercent: 98
        },
        workload: { currentJobs: 1, totalActiveJobs: 1, utilizationPercent: 20 }
      },
      {
        _id: '507f1f77bcf86cd799439033',
        firstName: 'Alex',
        lastName: 'Rivera',
        email: 'alex@example.com',
        technicianProfile: {
          skills: [{ name: 'Electrical', level: 'Expert' }],
          rating: 4.5,
          availabilityStatus: 'Available',
          employmentStatus: 'Active',
          preferredZone: 'Tower B',
          slaMetPercent: 90
        },
        workload: { currentJobs: 3, totalActiveJobs: 3, utilizationPercent: 60 }
      }
    ];
  });

  describe('1. AlgorithmRegistry & Strategy Pattern', () => {
    test('should register and retrieve RuleEngineV1 strategy', () => {
      const strategy = algorithmRegistry.getStrategy('rule-engine-v1');
      expect(strategy).toBeDefined();
      expect(strategy.algorithmId).toBe('rule-engine-v1');
      expect(strategy.algorithmVersion).toBe('1.0.0');
      expect(strategy.model).toBe('rule-engine');
    });

    test('should throw error for non-existent algorithm ID', () => {
      expect(() => algorithmRegistry.getStrategy('unknown-strategy')).toThrow(
        "Assignment algorithm strategy 'unknown-strategy' not found"
      );
    });
  });

  describe('2. Multi-Factor Scoring & Structured Explanation DTO', () => {
    test('should score expert skill match higher than non-matching technician', () => {
      const result = ruleEngineV1.evaluate({
        ticket: mockTicket,
        technicians: mockTechnicians,
        weights: defaultWeights,
        isEmergency: false
      });

      expect(result.recommendations.length).toBe(2);

      const top = result.recommendations[0];
      expect(top.technicianId).toBe('507f1f77bcf86cd799439022'); // Mike Johnson
      expect(top.overallScore).toBeGreaterThan(result.recommendations[1].overallScore);

      // Verify Score Breakdown DTO structure
      expect(top.scoreBreakdown).toEqual(
        expect.arrayContaining([
          expect.objectContaining({ factor: 'Skill', score: 30, maxScore: 30 }),
          expect.objectContaining({ factor: 'Workload', maxScore: 15 }),
          expect.objectContaining({ factor: 'Distance', score: 20, maxScore: 20 })
        ])
      );

      // Verify Explainability bullets
      expect(top.explainability).toContain('✓ Expert in Plumbing');
      expect(top.explainability).toContain('✓ Territory match (Tower A)');
    });
  });

  describe('3. Emergency Mode Differentiation', () => {
    test('should apply emergency capacity overrides when priority is emergency', () => {
      const emergencyTicket = { ...mockTicket, priority: 'emergency' };

      const result = ruleEngineV1.evaluate({
        ticket: emergencyTicket,
        technicians: mockTechnicians,
        weights: defaultWeights,
        isEmergency: true
      });

      const top = result.recommendations[0];
      const workloadFactor = top.scoreBreakdown.find(f => f.factor === 'Workload');

      expect(workloadFactor.reason).toContain('Emergency capacity override active');
    });
  });

  describe('4. Recommendation Caching strictly as Optimization', () => {
    test('should cache recommendations for 30 minutes and clear cache on event', async () => {
      const mockTicketDoc = {
        _id: mockTicket._id,
        category: 'Plumbing',
        priority: 'high',
        toObject: () => mockTicket
      };

      jest.spyOn(Maintenance, 'findById').mockImplementation(() => ({
        populate: () => Promise.resolve(mockTicketDoc)
      }));

      jest.spyOn(technicianService, 'getAllTechnicians').mockResolvedValue({ technicians: mockTechnicians });

      const recs1 = await assignmentEngineService.getRecommendationsForTicket(mockTicket._id);
      expect(recs1.ticketId).toBe(mockTicket._id);

      // Second call should hit cache
      const recs2 = await assignmentEngineService.getRecommendationsForTicket(mockTicket._id);
      expect(recs2.generatedAt).toBe(recs1.generatedAt);

      // Clear cache
      assignmentEngineService.clearCache();

      // Third call should recompute
      const recs3 = await assignmentEngineService.getRecommendationsForTicket(mockTicket._id, { bypassCache: true });
      expect(recs3).toBeDefined();
    });
  });

  describe('5. Non-Persistent Dry-Run Simulation', () => {
    test('should calculate ranking shift diff without mutating database', async () => {
      const mockTicketDoc = {
        _id: mockTicket._id,
        category: 'Plumbing',
        priority: 'low',
        toObject: () => mockTicket
      };

      jest.spyOn(Maintenance, 'findById').mockImplementation(() => ({
        populate: () => Promise.resolve(mockTicketDoc)
      }));

      jest.spyOn(technicianService, 'getAllTechnicians').mockResolvedValue({ technicians: mockTechnicians });

      const simulation = await assignmentEngineService.simulateAssignment(mockTicket._id, {
        priority: 'emergency'
      });

      expect(simulation.ticketId).toBe(mockTicket._id);
      expect(simulation.simulatedTweaks.priority).toBe('emergency');
      expect(simulation.oldRanking).toBeDefined();
      expect(simulation.newRanking).toBeDefined();
      expect(simulation.whyChanged).toBeDefined();
    });
  });

  describe('6. Route Optimization Metadata', () => {
    test('should calculate optimized route sequence and estimated travel time', async () => {
      const mockTickets = [
        { _id: 't1', title: 'Leaking Tap', priority: 'medium', buildingName: 'Apt A' },
        { _id: 't2', title: 'Power Burst', priority: 'emergency', buildingName: 'Apt B' }
      ];

      jest.spyOn(Maintenance, 'find').mockResolvedValue(mockTickets);

      const route = await assignmentEngineService.optimizeRoute('tech123', ['t1', 't2']);

      expect(route.technicianId).toBe('tech123');
      expect(route.optimizedRouteVersion).toBe('v1.0-spatial-priority');
      expect(route.sequence[0].ticketId).toBe('t2'); // Emergency ticket prioritized first
      expect(route.estimatedTravelMinutes).toBe(30);
      expect(route.routeDistanceKm).toBeGreaterThan(0);
    });
  });
});
