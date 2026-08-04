import * as policyService from './policyService.js';
import { ruleRegistry } from './eligibilityRuleEngine.js';
import { calculateRiskScore } from './riskEngine.js';
import * as repository from './leaseRenewalCampaignRepository.js';
import EligibilityEvaluation from '../../models/EligibilityEvaluation.js';
import { logRenewalAudit } from '../../platform/audit/auditService.js';
import { dispatchEvent } from '../../platform/events/eventDispatcher.js';
import Tenant from '../../models/Tenant.js';
import User from '../../models/User.js';

const RULE_TIMEOUT_MS = 1000;

const runRuleWithTimeout = (rule, context) => {
  let timer;
  const timeoutPromise = new Promise((resolve) => {
    timer = setTimeout(() => {
      resolve({
        id: rule.metadata.id,
        name: rule.metadata.name,
        passed: false,
        severity: rule.metadata.severity,
        reason: `Execution timeout exceeded after ${RULE_TIMEOUT_MS}ms.`,
        code: 'TIMEOUT',
        durationMs: RULE_TIMEOUT_MS
      });
    }, RULE_TIMEOUT_MS);
  });

  const executionPromise = (async () => {
    const start = Date.now();
    try {
      const result = await rule.execute(context);
      clearTimeout(timer);
      return {
        id: rule.metadata.id,
        name: rule.metadata.name,
        passed: result.passed,
        severity: rule.metadata.severity,
        reason: result.reason,
        code: result.code,
        metadata: result.metadata,
        durationMs: Date.now() - start
      };
    } catch (err) {
      clearTimeout(timer);
      return {
        id: rule.metadata.id,
        name: rule.metadata.name,
        passed: false,
        severity: rule.metadata.severity,
        reason: `Rule execution failed: ${err.message}`,
        code: 'EXECUTION_FAILED',
        durationMs: Date.now() - start
      };
    }
  })();

  return Promise.race([executionPromise, timeoutPromise]);
};

export const evaluateCampaign = async (campaignId, proposal = {}, user = { userId: 'system' }) => {
  const start = Date.now();
  const campaign = await repository.findByIdWithRelations(campaignId);
  if (!campaign) {
    throw new Error('Campaign not found.');
  }

  const lease = campaign.lease;
  const tenantDoc = await Tenant.findById(campaign.tenant);

  // Resolve Policy
  const propertyType = campaign.property.type || 'apartment';
  const policy = await policyService.resolvePolicy({
    propertyType,
    propertyId: campaign.property._id,
    leaseId: lease._id
  });

  // Calculate Risk Score
  const occupancyDurationMonths = Math.round((new Date() - new Date(lease.startDate)) / (1000 * 60 * 60 * 24 * 30.4));
  const riskContext = {
    tenantId: campaign.tenant._id,
    propertyId: campaign.property._id,
    occupancyDurationMonths
  };
  const riskResult = await calculateRiskScore(riskContext);

  // Execute Rules in Parallel
  const ruleContext = {
    tenantId: campaign.tenant._id,
    tenantEmail: tenantDoc ? tenantDoc.email : '',
    propertyId: campaign.property._id,
    currentRent: lease.rentAmount,
    proposedRent: proposal.proposedRent || lease.rentAmount,
    proposedDurationMonths: proposal.proposedDurationMonths || 12,
    policy
  };

  const rules = ruleRegistry.getRules();
  const ruleResults = await Promise.all(rules.map(rule => runRuleWithTimeout(rule, ruleContext)));

  // Compute eligibility: must pass all BLOCKER & HIGH severity rules
  const blockers = ruleResults.filter(r => !r.passed && (r.severity === 'BLOCKER' || r.severity === 'HIGH'));
  const eligible = blockers.length === 0;

  // Compile explainability outputs
  const why = [];
  const recommendations = [];

  ruleResults.forEach(r => {
    if (!r.passed) {
      why.push(`[${r.severity}] ${r.name}: ${r.reason}`);
      if (r.id === 'payment-rule') {
        recommendations.push('Tenant must settle outstanding bill balances.');
      } else if (r.id === 'maintenance-rule') {
        recommendations.push('Resolve pending repair work orders before lease extension.');
      } else if (r.id === 'kyc-rule') {
        recommendations.push('Request updated identity or KYC documents from the tenant.');
      } else if (r.id === 'policy-rule') {
        recommendations.push('Adjust rent increase percent or lease term duration to match policy limits.');
      }
    }
  });

  if (eligible) {
    why.push('All critical policy rules and eligibility checks passed successfully.');
    recommendations.push('Proceed with creating and signing the lease agreement.');
  }

  const executionTimeMs = Date.now() - start;

  // Save Eligibility Evaluation record
  const evaluation = await EligibilityEvaluation.create({
    campaign: campaign._id,
    eligible,
    score: riskResult.score,
    riskGrade: riskResult.grade,
    rules: ruleResults,
    resolvedPolicy: {
      minDurationMonths: policy.minDurationMonths,
      maxDurationMonths: policy.maxDurationMonths,
      maxRentIncreasePercent: policy.maxRentIncreasePercent,
      minNoticeDays: policy.minNoticeDays,
      maxCounterOffers: policy.maxCounterOffers,
      autoApprovalEnabled: policy.autoApprovalEnabled,
      policyId: policy.policyId
    },
    explainability: {
      why,
      recommendations
    },
    executionTimeMs,
    policyVersion: policy.version || 1
  });

  // Emit Events
  await dispatchEvent('lease.renewal.evaluated', { campaignId: campaign._id, evaluationId: evaluation._id });
  if (eligible) {
    await dispatchEvent('lease.renewal.eligible', { campaignId: campaign._id });
  } else {
    await dispatchEvent('lease.renewal.ineligible', { campaignId: campaign._id, blockersCount: blockers.length });
  }
  await dispatchEvent('risk.score.calculated', { campaignId: campaign._id, score: riskResult.score, grade: riskResult.grade });

  // Audit
  await logRenewalAudit({
    leaseRenewalId: campaign._id,
    userId: user.userId || 'system',
    action: 'ELIGIBILITY_EVALUATION',
    newValue: evaluation.toObject()
  });

  return evaluation;
};

// ---------------------------------------------------------------------------
// simulateCampaign — pure dry-run evaluation
// ✅ Resolve policy   ✅ Execute rule engine   ✅ Execute risk engine
// ✅ Return explainability
// ❌ No EligibilityEvaluation.create   ❌ No audit   ❌ No events   ❌ No cache mutation
// ---------------------------------------------------------------------------
export const simulateCampaign = async (campaignId, proposal = {}) => {
  const start = Date.now();
  const campaign = await repository.findByIdWithRelations(campaignId);
  if (!campaign) {
    throw new Error('Campaign not found.');
  }

  const lease = campaign.lease;
  const tenantDoc = await Tenant.findById(campaign.tenant);

  // Resolve Policy (read-only — cache reads allowed, no writes)
  const propertyType = campaign.property?.type || 'apartment';
  const policy = await policyService.resolvePolicy({
    propertyType,
    propertyId: campaign.property?._id,
    leaseId: lease?._id
  });

  // Calculate Risk Score (pure computation)
  const occupancyDurationMonths = Math.round(
    (new Date() - new Date(lease.startDate)) / (1000 * 60 * 60 * 24 * 30.4)
  );
  const riskResult = await calculateRiskScore({
    tenantId: campaign.tenant?._id,
    propertyId: campaign.property?._id,
    occupancyDurationMonths
  });

  // Execute Rules in Parallel
  const ruleContext = {
    tenantId: campaign.tenant?._id,
    tenantEmail: tenantDoc ? tenantDoc.email : '',
    propertyId: campaign.property?._id,
    currentRent: lease?.rentAmount,
    proposedRent: proposal.proposedRent || lease?.rentAmount,
    proposedDurationMonths: proposal.proposedDurationMonths || 12,
    counterOfferCount: proposal.counterOfferCount ?? 0,
    policy
  };

  const rules = ruleRegistry.getRules();
  const ruleResults = await Promise.all(rules.map(rule => runRuleWithTimeout(rule, ruleContext)));

  const blockers = ruleResults.filter(r => !r.passed && (r.severity === 'BLOCKER' || r.severity === 'HIGH'));
  const eligible = blockers.length === 0;

  const why = [];
  const recommendations = [];
  ruleResults.forEach(r => {
    if (!r.passed) {
      why.push(`[${r.severity}] ${r.name}: ${r.reason}`);
      if (r.id === 'payment-rule')     recommendations.push('Tenant must settle outstanding bill balances.');
      if (r.id === 'maintenance-rule') recommendations.push('Resolve pending repair work orders before lease extension.');
      if (r.id === 'kyc-rule')         recommendations.push('Request updated identity or KYC documents from the tenant.');
      if (r.id === 'policy-rule')      recommendations.push('Adjust rent increase percent or lease term duration to match policy limits.');
    }
  });
  if (eligible) {
    why.push('All critical policy rules and eligibility checks passed successfully.');
    recommendations.push('Proceed with creating and signing the lease agreement.');
  }

  return {
    simulated: true,
    eligible,
    riskScore: riskResult.score,
    riskGrade: riskResult.grade,
    riskBreakdown: riskResult.breakdown,
    rules: ruleResults,
    resolvedPolicy: {
      minDurationMonths: policy.minDurationMonths,
      maxDurationMonths: policy.maxDurationMonths,
      maxRentIncreasePercent: policy.maxRentIncreasePercent,
      minNoticeDays: policy.minNoticeDays,
      maxCounterOffers: policy.maxCounterOffers,
      autoApprovalEnabled: policy.autoApprovalEnabled,
      policyId: policy.policyId
    },
    explainability: { why, recommendations },
    executionTimeMs: Date.now() - start,
    policyVersion: policy.version || 1
  };
};
