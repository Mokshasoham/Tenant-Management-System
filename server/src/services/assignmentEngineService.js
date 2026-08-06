/**
 * server/src/services/assignmentEngineService.js
 * Multi-Factor Technician Assignment Engine & Dispatch Intelligence Service.
 */

import algorithmRegistry from './assignment/algorithmRegistry.js';
import ruleEngineV1 from './assignment/ruleEngineV1.js';
import assignmentRepository from '../repositories/assignmentRepository.js';
import technicianService from './technicianService.js';
import Maintenance from '../models/Maintenance.js';
import User from '../models/User.js';
import eventBus from '../platform/events/eventBus.js';
import NotificationService from './NotificationService.js';
import { AppError } from '../utils/errorHandling.js';

// Register default RuleEngineV1 strategy into AlgorithmRegistry
algorithmRegistry.registerStrategy('rule-engine-v1', ruleEngineV1);

export class AssignmentEngineService {
  constructor() {
    // Recommendation Cache Layer (ticketId -> { data, expiresAt })
    this.recommendationCache = new Map();
    this.CACHE_TTL_MS = 30 * 60 * 1000; // 30 minutes

    // Subscribe to EventBus invalidation triggers
    this._subscribeInvalidationEvents();
  }

  _subscribeInvalidationEvents() {
    const invalidateAll = () => this.clearCache();
    eventBus.subscribe('technician.updated', invalidateAll);
    eventBus.subscribe('technician.created', invalidateAll);
    eventBus.subscribe('maintenance.status_updated', invalidateAll);
    eventBus.subscribe('maintenance.priority_updated', invalidateAll);
    eventBus.subscribe('shift.created', invalidateAll);
    eventBus.subscribe('shift.updated', invalidateAll);
    eventBus.subscribe('leave.approved', invalidateAll);
  }

  clearCache() {
    this.recommendationCache.clear();
  }

  async getRecommendationsForTicket(ticketId, options = {}) {
    const { algorithmId = 'rule-engine-v1', bypassCache = false } = options;

    // Check Recommendation Cache strictly as an optimization
    if (!bypassCache) {
      const cached = this.recommendationCache.get(ticketId);
      if (cached && Date.now() < cached.expiresAt) {
        return cached.data;
      }
    }

    const ticket = await Maintenance.findById(ticketId).populate('propertyId');
    if (!ticket) throw new AppError('Maintenance ticket not found', 404);

    const isEmergency = ticket.priority === 'emergency';
    const reqSkill = ticket.category || 'general';

    // Retrieve active technicians with live workload
    const { technicians } = await technicianService.getAllTechnicians({ limit: 100 });
    const activeTechnicians = technicians.filter(t => 
      t.technicianProfile?.employmentStatus !== 'suspended' &&
      t.technicianProfile?.employmentStatus !== 'inactive'
    );

    // Retrieve active scoring factor weights
    const config = await assignmentRepository.getActiveConfig();
    const weights = config.weights;

    // Retrieve strategy from AlgorithmRegistry
    const strategy = algorithmRegistry.getStrategy(algorithmId);
    const result = strategy.evaluate({ ticket, technicians: activeTechnicians, weights, isEmergency });

    const now = new Date();
    const expiresAt = new Date(now.getTime() + this.CACHE_TTL_MS);

    const responseDTO = {
      ticketId,
      algorithmId: result.algorithmId,
      algorithmVersion: result.algorithmVersion,
      model: result.model,
      confidence: result.confidence,
      generatedAt: now.toISOString(),
      expiresAt: expiresAt.toISOString(),
      isEmergencyMode: isEmergency,
      explainability: result.recommendations[0]?.explainability || ['✓ Best available skill match'],
      recommendations: result.recommendations.map(r => ({
        technicianId: r.technicianId,
        technicianName: `${r.technician.firstName || ''} ${r.technician.lastName || ''}`.trim(),
        avatar: r.technician.avatar,
        phone: r.technician.phone,
        email: r.technician.email,
        rating: r.technician.technicianProfile?.rating || 4.9,
        employmentStatus: r.technician.technicianProfile?.employmentStatus || 'Active',
        availabilityStatus: r.technician.technicianProfile?.availabilityStatus || 'Available',
        workload: r.technician.workload || { currentJobs: 0, utilizationPercent: 0 },
        overallScore: r.overallScore,
        scoreBreakdown: r.scoreBreakdown,
        explainability: r.explainability
      }))
    };

    // Store in cache
    this.recommendationCache.set(ticketId, { data: responseDTO, expiresAt: expiresAt.getTime() });

    // Publish telemetry
    await eventBus.publish('assignment.recommended', {
      ticketId,
      algorithmId: responseDTO.algorithmId,
      confidence: responseDTO.confidence,
      topSuggestedTechnicianId: responseDTO.recommendations[0]?.technicianId
    });

    return responseDTO;
  }

  async recordAssignmentDecision(decisionData, headers = {}) {
    const {
      ticketId,
      idempotencyKey,
      selectedTechnicianId,
      selectedByUserId,
      overrideReason,
      assignmentStrategy = 'AUTO'
    } = decisionData;

    // 1. Idempotency Check
    const key = idempotencyKey || headers['idempotency-key'];
    if (key) {
      const existing = await assignmentRepository.findByIdempotencyKey(key);
      if (existing) {
        return existing;
      }
    }

    // 2. Recommendation Lock & OCC Guard
    const ticket = await Maintenance.findById(ticketId);
    if (!ticket) throw new AppError('Maintenance ticket not found', 404);

    if (ticket.assignedTo && String(ticket.assignedTo) !== String(selectedTechnicianId)) {
      if (ticket.status !== 'open' && ticket.status !== 'submitted' && ticket.status !== 'manager_review') {
        throw new AppError('This ticket has already been assigned. Recommendations have changed.', 409);
      }
    }

    // 3. Compute Recommendations to snapshot current score state
    const recommendationsDTO = await this.getRecommendationsForTicket(ticketId, { bypassCache: true });
    const topSuggestion = recommendationsDTO.recommendations[0];
    const isOverride = topSuggestion ? String(topSuggestion.technicianId) !== String(selectedTechnicianId) : false;

    // 4. Fetch selected technician profile snapshot
    const selectedTechUser = await User.findById(selectedTechnicianId);
    const techProfile = selectedTechUser?.technicianProfile || {};
    const techWorkload = await technicianService.getTechnicianWorkload(selectedTechnicianId);

    const snapshot = {
      rating: techProfile.rating || 4.9,
      skills: techProfile.skills || [],
      workload: techWorkload.totalActiveJobs || 0,
      availabilityStatus: techProfile.availabilityStatus || 'Available',
      zone: techProfile.preferredZone || 'General'
    };

    const finalStatus = isOverride ? 'overridden' : 'accepted';

    // 5. Persist Decision Record
    const decisionRecord = await assignmentRepository.createDecision({
      ticketId,
      idempotencyKey: key,
      assignmentStrategy: isOverride ? 'MANUAL' : assignmentStrategy,
      assignmentStatus: finalStatus,
      algorithmId: recommendationsDTO.algorithmId,
      algorithmVersion: recommendationsDTO.algorithmVersion,
      model: recommendationsDTO.model,
      confidence: recommendationsDTO.confidence,
      recommendedTechnicians: recommendationsDTO.recommendations.map(r => ({
        technicianId: r.technicianId,
        overallScore: r.overallScore,
        scoreBreakdown: r.scoreBreakdown,
        explainability: r.explainability
      })),
      selectedTechnician: selectedTechnicianId,
      selectedBy: selectedByUserId,
      isOverride,
      overrideReason: isOverride ? (overrideReason || 'Manager manual preference') : '',
      technicianSnapshot: snapshot,
      assignedAt: new Date()
    });

    // 6. Update Ticket Status
    ticket.assignedTo = selectedTechnicianId;
    ticket.status = 'technician_assigned';
    await ticket.save();

    // Invalidate recommendation cache for this ticket
    this.recommendationCache.delete(ticketId);

    // 7. Publish EventBus Telemetry
    const eventTopic = isOverride ? 'assignment.overridden' : 'assignment.accepted';
    await eventBus.publish(eventTopic, {
      ticketId,
      decisionId: decisionRecord._id,
      selectedTechnicianId,
      selectedByUserId,
      isOverride,
      overrideReason: decisionRecord.overrideReason
    });

    // Send Notification to Assigned Technician
    try {
      await NotificationService.notify({
        recipient: selectedTechnicianId,
        category: 'maintenance',
        type: 'TECHNICIAN_ASSIGNED',
        title: 'New Maintenance Ticket Assigned',
        message: `You have been assigned ticket #${String(ticket._id).substring(0, 8)} (${ticket.title}).`,
        entityId: ticket._id,
        entityType: 'Maintenance'
      });
    } catch (err) {
      console.warn('Failed to send technician assignment notification:', err.message);
    }

    return decisionRecord;
  }

  async simulateAssignment(ticketId, tweaks = {}) {
    const { priority, requestedCategory } = tweaks;

    const originalDTO = await this.getRecommendationsForTicket(ticketId, { bypassCache: true });
    
    // Simulate modified priority / category
    const ticket = await Maintenance.findById(ticketId).populate('propertyId');
    if (!ticket) throw new AppError('Maintenance ticket not found', 404);

    const simulatedTicket = {
      ...ticket.toObject(),
      priority: priority || ticket.priority,
      category: requestedCategory || ticket.category
    };

    const { technicians } = await technicianService.getAllTechnicians({ limit: 100 });
    const config = await assignmentRepository.getActiveConfig();
    const strategy = algorithmRegistry.getStrategy(originalDTO.algorithmId);

    const simulatedResult = strategy.evaluate({
      ticket: simulatedTicket,
      technicians,
      weights: config.weights,
      isEmergency: simulatedTicket.priority === 'emergency'
    });

    const oldRanking = originalDTO.recommendations.map((r, i) => ({ rank: i + 1, technicianId: String(r.technicianId), name: r.technicianName, score: r.overallScore }));
    const newRanking = simulatedResult.recommendations.map((r, i) => ({ rank: i + 1, technicianId: String(r.technicianId), name: `${r.technician.firstName || ''} ${r.technician.lastName || ''}`.trim(), score: r.overallScore }));

    let whyChanged = 'No change in primary ranking.';
    if (oldRanking[0]?.technicianId !== newRanking[0]?.technicianId) {
      whyChanged = `Primary recommendation shifted from ${oldRanking[0]?.name} to ${newRanking[0]?.name} due to ${simulatedTicket.priority === 'emergency' ? 'Emergency SLA overrides' : 'skill/category match adjustment'}.`;
    }

    await eventBus.publish('assignment.simulated', { ticketId, priority, oldTop: oldRanking[0]?.name, newTop: newRanking[0]?.name });

    return {
      ticketId,
      simulatedTweaks: { priority: simulatedTicket.priority, category: simulatedTicket.category },
      oldRanking,
      newRanking,
      whyChanged
    };
  }

  async optimizeRoute(technicianId, ticketIds = []) {
    if (!ticketIds || ticketIds.length === 0) {
      throw new AppError('No ticket IDs provided for route optimization', 400);
    }

    const tickets = await Maintenance.find({ _id: { $in: ticketIds } });
    
    // Sequence tickets by priority (emergency first) then creation date
    const sequence = tickets.sort((a, b) => {
      if (a.priority === 'emergency' && b.priority !== 'emergency') return -1;
      if (b.priority === 'emergency' && a.priority !== 'emergency') return 1;
      return new Date(a.createdAt) - new Date(b.createdAt);
    }).map((t, idx) => ({
      step: idx + 1,
      ticketId: t._id,
      title: t.title,
      buildingName: t.buildingName || 'Residence',
      unitNumber: t.unitNumber || 'Main',
      priority: t.priority,
      estimatedMinutes: t.priority === 'emergency' ? 30 : 60
    }));

    const totalEstMins = sequence.reduce((acc, s) => acc + s.estimatedMinutes + 15, 0); // 15m travel per step
    const distanceKm = Math.round(sequence.length * 3.2 * 10) / 10;

    const routeDTO = {
      technicianId,
      optimizedRouteVersion: 'v1.0-spatial-priority',
      sequence,
      estimatedTravelMinutes: Math.round(sequence.length * 15),
      totalDurationMinutes: totalEstMins,
      estimatedCompletionTime: new Date(Date.now() + totalEstMins * 60 * 1000).toISOString(),
      routeDistanceKm: distanceKm
    };

    await eventBus.publish('assignment.route.optimized', { technicianId, ticketCount: sequence.length, totalEstMins });

    return routeDTO;
  }

  async getTicketRecommendationHistory(ticketId) {
    return await assignmentRepository.getTicketDecisionHistory(ticketId);
  }

  async getAnalytics(query = {}) {
    const { startDate, endDate } = query;
    return await assignmentRepository.getAnalyticsData(startDate, endDate);
  }

  async getConfig() {
    return await assignmentRepository.getActiveConfig();
  }

  async updateConfig(weights, userId) {
    return await assignmentRepository.updateConfig(weights, userId);
  }
}

const assignmentEngineService = new AssignmentEngineService();
export default assignmentEngineService;
