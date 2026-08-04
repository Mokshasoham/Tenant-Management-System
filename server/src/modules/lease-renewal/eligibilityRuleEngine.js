import Bill from '../../models/Bill.js';
import Maintenance from '../../models/Maintenance.js';
import User from '../../models/User.js';

export class BaseRule {
  constructor(metadata) {
    this.metadata = metadata; // { id, name, version, category, severity }
  }

  async execute(context) {
    throw new Error('execute method must be implemented');
  }
}

// 1. Payment Rule: Checks if there are any overdue bills
export class PaymentRule extends BaseRule {
  constructor() {
    super({
      id: 'payment-rule',
      name: 'Payment Overdue Check',
      version: '1.0',
      category: 'Financial',
      severity: 'BLOCKER'
    });
  }

  async execute(context) {
    const { tenantId } = context;
    const overdueBillsCount = await Bill.countDocuments({
      tenant: tenantId,
      status: 'overdue'
    });

    const passed = overdueBillsCount === 0;
    return {
      passed,
      reason: passed ? 'No overdue rent or utility bills.' : `Tenant has ${overdueBillsCount} overdue bill(s).`,
      code: 'PAYMENT_OVERDUE',
      metadata: { overdueBillsCount }
    };
  }
}

// 2. Maintenance Rule: Checks if there are any active unresolved maintenance issues
export class MaintenanceRule extends BaseRule {
  constructor() {
    super({
      id: 'maintenance-rule',
      name: 'Maintenance Issues Check',
      version: '1.0',
      category: 'Property',
      severity: 'HIGH'
    });
  }

  async execute(context) {
    const { propertyId } = context;
    const openTicketsCount = await Maintenance.countDocuments({
      property: propertyId,
      status: { $in: ['pending', 'assigned', 'in_progress'] }
    });

    const passed = openTicketsCount === 0;
    return {
      passed,
      reason: passed ? 'No open maintenance tickets.' : `Property has ${openTicketsCount} open maintenance ticket(s).`,
      code: 'OPEN_MAINTENANCE',
      metadata: { openTicketsCount }
    };
  }
}

// 3. KYC Rule: Checks if tenant has uploaded KYC documents and profile is complete
export class KYCRule extends BaseRule {
  constructor() {
    super({
      id: 'kyc-rule',
      name: 'Tenant KYC Status Check',
      version: '1.0',
      category: 'Compliance',
      severity: 'HIGH'
    });
  }

  async execute(context) {
    const { tenantEmail } = context;
    const userRecord = await User.findOne({ email: tenantEmail });

    if (!userRecord) {
      return {
        passed: false,
        reason: 'Tenant user profile not found in system.',
        code: 'USER_NOT_FOUND',
        metadata: {}
      };
    }

    const hasKYC = userRecord.kycDocuments && userRecord.kycDocuments.length > 0;
    const isProfileComplete = !!(userRecord.firstName && userRecord.lastName && userRecord.phone);

    const passed = hasKYC && isProfileComplete;
    let reason = 'Tenant profile is complete and KYC is verified.';
    if (!hasKYC) {
      reason = 'Tenant KYC documents are missing or expired.';
    } else if (!isProfileComplete) {
      reason = 'Tenant profile contact information is incomplete.';
    }

    return {
      passed,
      reason,
      code: 'INCOMPLETE_KYC',
      metadata: { hasKYC, isProfileComplete }
    };
  }
}

// 4. Policy Rule: Validates proposal terms against resolved policy limits
export class PolicyRule extends BaseRule {
  constructor() {
    super({
      id: 'policy-rule',
      name: 'Lease Policy Compliance Check',
      version: '1.0',
      category: 'Policy',
      severity: 'BLOCKER'
    });
  }

  async execute(context) {
    const { proposedRent, currentRent, proposedDurationMonths, policy } = context;

    if (!policy) {
      return {
        passed: true,
        reason: 'No policy defined for comparison; default fallback applied.',
        code: 'NO_POLICY_APPLIED',
        metadata: {}
      };
    }

    const why = [];
    let passed = true;

    // Check duration limits
    if (policy.minDurationMonths && proposedDurationMonths < policy.minDurationMonths) {
      passed = false;
      why.push(`Proposed duration of ${proposedDurationMonths} months is shorter than the minimum allowed limit of ${policy.minDurationMonths} months.`);
    }
    if (policy.maxDurationMonths && proposedDurationMonths > policy.maxDurationMonths) {
      passed = false;
      why.push(`Proposed duration of ${proposedDurationMonths} months exceeds the maximum allowed limit of ${policy.maxDurationMonths} months.`);
    }

    // Check rent increase limits
    if (currentRent && proposedRent && policy.maxRentIncreasePercent) {
      const increasePercent = ((proposedRent - currentRent) / currentRent) * 100;
      if (increasePercent > policy.maxRentIncreasePercent) {
        passed = false;
        why.push(`Proposed rent increase of ${increasePercent.toFixed(1)}% exceeds the maximum policy threshold of ${policy.maxRentIncreasePercent}%.`);
      }
    }

    return {
      passed,
      reason: passed ? 'Proposed terms comply with all active lease policies.' : why.join(' '),
      code: 'POLICY_VIOLATION',
      metadata: { why }
    };
  }
}

// Rule Registry Manager
class RuleRegistry {
  constructor() {
    this.rules = new Map();
    // Auto-register default rules
    this.register(new PaymentRule());
    this.register(new MaintenanceRule());
    this.register(new KYCRule());
    this.register(new PolicyRule());
  }

  register(rule) {
    this.rules.set(rule.metadata.id, rule);
  }

  getRules() {
    return Array.from(this.rules.values());
  }
}

export const ruleRegistry = new RuleRegistry();
