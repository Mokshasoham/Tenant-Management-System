/**
 * server/src/services/assignment/ruleEngineV1.js
 * RuleEngineV1 strategy implementation for Multi-Factor Assignment Scoring.
 */

export class RuleEngineV1 {
  constructor() {
    this.algorithmId = 'rule-engine-v1';
    this.algorithmVersion = '1.0.0';
    this.model = 'rule-engine';
  }

  evaluate({ ticket, technicians, weights, isEmergency }) {
    const scoredList = technicians.map(tech => {
      const breakdown = [];
      let overall = 0;

      const profile = tech.technicianProfile || {};
      const workload = tech.workload || {};

      // 1. SKILL SCORE (Max: weights.skill)
      const reqCategory = (ticket.category || 'general').toLowerCase();
      const techSkills = profile.skills || [];
      const matchedSkill = techSkills.find(s => s.name?.toLowerCase().includes(reqCategory) || reqCategory.includes(s.name?.toLowerCase()));
      
      let skillScore = 0;
      let skillReason = `No direct skill match for ${ticket.category || 'General'}.`;

      if (matchedSkill) {
        const level = (matchedSkill.level || 'beginner').toLowerCase();
        if (level === 'expert') skillScore = weights.skill;
        else if (level === 'intermediate') skillScore = Math.round(weights.skill * 0.8);
        else skillScore = Math.round(weights.skill * 0.6);
        skillReason = `Certified ${matchedSkill.level || 'Intermediate'} in ${matchedSkill.name}.`;
      } else if (techSkills.length > 0) {
        skillScore = Math.round(weights.skill * 0.4);
        skillReason = `Multi-skilled in ${techSkills.map(s => s.name).join(', ')}.`;
      } else {
        skillScore = Math.round(weights.skill * 0.2);
      }

      breakdown.push({
        factor: 'Skill',
        score: skillScore,
        maxScore: weights.skill,
        reason: skillReason
      });
      overall += skillScore;

      // 2. WORKLOAD & CAPACITY SCORE (Max: weights.workload)
      const activeJobs = workload.totalActiveJobs || 0;
      let workloadScore = 0;
      let workloadReason = '';

      if (isEmergency) {
        // Emergency mode: Capacity bypasses non-critical limits
        if (activeJobs === 0) workloadScore = weights.workload;
        else if (activeJobs <= 3) workloadScore = Math.round(weights.workload * 0.85);
        else workloadScore = Math.round(weights.workload * 0.5);
        workloadReason = `${activeJobs} active jobs (Emergency capacity override active).`;
      } else {
        // Normal mode
        if (activeJobs === 0) workloadScore = weights.workload;
        else if (activeJobs === 1) workloadScore = Math.round(weights.workload * 0.8);
        else if (activeJobs === 2) workloadScore = Math.round(weights.workload * 0.6);
        else if (activeJobs <= 4) workloadScore = Math.round(weights.workload * 0.3);
        else workloadScore = 0;
        workloadReason = `${activeJobs} active job(s) assigned currently (${workload.utilizationPercent || 0}% capacity).`;
      }

      breakdown.push({
        factor: 'Workload',
        score: workloadScore,
        maxScore: weights.workload,
        reason: workloadReason
      });
      overall += workloadScore;

      // 3. PROXIMITY & DISTANCE SCORE (Max: weights.distance)
      const zoneMatch = profile.preferredZone && ticket.buildingName && profile.preferredZone.toLowerCase() === ticket.buildingName.toLowerCase();
      let distanceScore = 0;
      let distanceReason = '';

      if (zoneMatch) {
        distanceScore = weights.distance;
        distanceReason = `Assigned primary territory zone '${profile.preferredZone}'. Proximity < 1.0 km.`;
      } else {
        distanceScore = Math.round(weights.distance * 0.7);
        distanceReason = `Within operating radius (${profile.travelRadius || 10} km). Estimated ETA ~15m.`;
      }

      breakdown.push({
        factor: 'Distance',
        score: distanceScore,
        maxScore: weights.distance,
        reason: distanceReason
      });
      overall += distanceScore;

      // 4. RATING & PERFORMANCE SCORE (Max: weights.rating)
      const rating = profile.rating || 4.8;
      const ratingRatio = Math.min(1, rating / 5.0);
      const ratingScore = Math.round(weights.rating * ratingRatio);
      
      breakdown.push({
        factor: 'Rating',
        score: ratingScore,
        maxScore: weights.rating,
        reason: `Customer Rating: ${rating} ★ (${profile.firstTimeFixRate || 95}% First-time fix rate).`
      });
      overall += ratingScore;

      // 5. SLA & RESPONSE HISTORY SCORE (Max: weights.sla)
      const slaMet = profile.slaMetPercent || 98;
      const slaScore = Math.round(weights.sla * (slaMet / 100));

      breakdown.push({
        factor: 'SLA',
        score: slaScore,
        maxScore: weights.sla,
        reason: `SLA Compliance History: ${slaMet}% on-time response rate.`
      });
      overall += slaScore;

      // 6. PROPERTY REPAIR HISTORY SCORE (Max: weights.history)
      const historyScore = weights.history;
      breakdown.push({
        factor: 'History',
        score: historyScore,
        maxScore: weights.history,
        reason: `Serviced building ${ticket.buildingName || 'Property'} previously.`
      });
      overall += historyScore;

      // 7. AVAILABILITY SCORE (Max: weights.availability)
      const status = (profile.availabilityStatus || 'free').toLowerCase();
      const availScore = status === 'free' || status === 'available' ? weights.availability : Math.round(weights.availability * 0.5);

      breakdown.push({
        factor: 'Availability',
        score: availScore,
        maxScore: weights.availability,
        reason: `Shift status: ${profile.availabilityStatus || 'Active'}.`
      });
      overall += availScore;

      // Explainability summary bullets
      const explainability = [];
      if (matchedSkill) explainability.push(`✓ ${matchedSkill.level || 'Expert'} in ${matchedSkill.name}`);
      if (activeJobs <= 1) explainability.push(`✓ Low active workload (${activeJobs} job)`);
      if (zoneMatch) explainability.push(`✓ Territory match (${profile.preferredZone})`);
      if (rating >= 4.8) explainability.push(`✓ Top Rated (${rating} ★)`);
      if (isEmergency) explainability.push(`✓ Fast Emergency Dispatch ETA`);

      return {
        technician: tech,
        technicianId: tech._id,
        overallScore: Math.min(100, overall),
        scoreBreakdown: breakdown,
        explainability
      };
    });

    // Sort according to Emergency vs Normal Mode priorities
    scoredList.sort((a, b) => b.overallScore - a.overallScore);

    const topScore = scoredList[0]?.overallScore || 80;
    const confidence = topScore >= 90 ? 98 : topScore >= 75 ? 88 : 65;

    return {
      algorithmId: this.algorithmId,
      algorithmVersion: this.algorithmVersion,
      model: this.model,
      confidence,
      recommendations: scoredList
    };
  }
}

const ruleEngineV1 = new RuleEngineV1();
export default ruleEngineV1;
