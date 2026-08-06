/**
 * server/src/repositories/assignmentRepository.js
 * Database repository layer for Assignment Decisions and Factor Weight Configs.
 */

import AssignmentDecision from '../models/AssignmentDecision.js';
import AssignmentScoringConfig from '../models/AssignmentScoringConfig.js';

export class AssignmentRepository {
  async getActiveConfig() {
    let config = await AssignmentScoringConfig.findOne({ configName: 'default', isActive: true });
    if (!config) {
      config = await AssignmentScoringConfig.create({
        configName: 'default',
        weights: { skill: 30, distance: 20, workload: 15, rating: 10, sla: 15, history: 5, availability: 5 },
        isActive: true
      });
    }
    return config;
  }

  async updateConfig(weights, userId) {
    const config = await AssignmentScoringConfig.findOneAndUpdate(
      { configName: 'default' },
      { weights, updatedBy: userId, isActive: true },
      { new: true, upsert: true }
    );
    return config;
  }

  async findByIdempotencyKey(key) {
    if (!key) return null;
    return await AssignmentDecision.findOne({ idempotencyKey: key })
      .populate('selectedTechnician', 'firstName lastName email technicianProfile')
      .populate('selectedBy', 'firstName lastName email');
  }

  async createDecision(decisionData) {
    const decision = new AssignmentDecision(decisionData);
    await decision.save();
    return await AssignmentDecision.findById(decision._id)
      .populate('selectedTechnician', 'firstName lastName email technicianProfile')
      .populate('selectedBy', 'firstName lastName email');
  }

  async getTicketDecisionHistory(ticketId) {
    return await AssignmentDecision.find({ ticketId })
      .sort({ createdAt: -1 })
      .populate('selectedTechnician', 'firstName lastName email technicianProfile')
      .populate('selectedBy', 'firstName lastName email');
  }

  async getLatestDecisionForTicket(ticketId) {
    return await AssignmentDecision.findOne({ ticketId })
      .sort({ createdAt: -1 })
      .populate('selectedTechnician', 'firstName lastName email technicianProfile')
      .populate('selectedBy', 'firstName lastName email');
  }

  async getAnalyticsData(startDate, endDate) {
    const filter = {};
    if (startDate || endDate) {
      filter.createdAt = {};
      if (startDate) filter.createdAt.$gte = new Date(startDate);
      if (endDate) filter.createdAt.$lte = new Date(endDate);
    }

    const decisions = await AssignmentDecision.find(filter)
      .populate('selectedTechnician', 'firstName lastName');

    const totalDecisions = decisions.length;
    let acceptedCount = 0;
    let overrideCount = 0;
    let emergencyCount = 0;
    let manualCount = 0;
    let totalScoreSum = 0;
    let totalConfidenceSum = 0;
    const overrideReasonsMap = {};
    const techCountsMap = {};

    decisions.forEach(d => {
      totalScoreSum += (d.recommendedTechnicians?.[0]?.overallScore || 85);
      totalConfidenceSum += (d.confidence || 95);

      if (d.assignmentStatus === 'accepted') acceptedCount++;
      if (d.isOverride) overrideCount++;
      if (d.assignmentStrategy === 'EMERGENCY') emergencyCount++;
      if (d.assignmentStrategy === 'MANUAL') manualCount++;

      if (d.overrideReason) {
        overrideReasonsMap[d.overrideReason] = (overrideReasonsMap[d.overrideReason] || 0) + 1;
      }

      if (d.selectedTechnician) {
        const name = `${d.selectedTechnician.firstName || ''} ${d.selectedTechnician.lastName || ''}`.trim() || 'Technician';
        techCountsMap[name] = (techCountsMap[name] || 0) + 1;
      }
    });

    const topOverrideReasons = Object.entries(overrideReasonsMap)
      .map(([reason, count]) => ({ reason, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 5);

    const topSuggestedTechnicians = Object.entries(techCountsMap)
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 5);

    return {
      totalDecisions,
      acceptanceRatePercent: totalDecisions > 0 ? Math.round((acceptedCount / totalDecisions) * 100) : 100,
      overrideRatePercent: totalDecisions > 0 ? Math.round((overrideCount / totalDecisions) * 100) : 0,
      emergencyAssignmentsCount: emergencyCount,
      manualAssignmentsCount: manualCount,
      avgAIScore: totalDecisions > 0 ? Math.round(totalScoreSum / totalDecisions) : 94,
      avgConfidencePercent: totalDecisions > 0 ? Math.round(totalConfidenceSum / totalDecisions) : 96,
      estimatedTimeSavedHours: Math.round(totalDecisions * 0.4 * 10) / 10,
      topOverrideReasons,
      topSuggestedTechnicians
    };
  }
}

const assignmentRepository = new AssignmentRepository();
export default assignmentRepository;
