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
    const { proposedRent, currentRent, proposedDurationMonths, policy, counterOfferCount } = context;

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
    if (policy.minDurationMonths != null && proposedDurationMonths < policy.minDurationMonths) {
      passed = false;
      why.push(`Proposed duration of ${proposedDurationMonths} months is shorter than the minimum allowed limit of ${policy.minDurationMonths} months.`);
    }
    if (policy.maxDurationMonths != null && proposedDurationMonths > policy.maxDurationMonths) {
      passed = false;
      why.push(`Proposed duration of ${proposedDurationMonths} months exceeds the maximum allowed limit of ${policy.maxDurationMonths} months.`);
    }

    // Check rent increase limits
    if (currentRent && proposedRent && policy.maxRentIncreasePercent != null) {
      const increasePercent = ((proposedRent - currentRent) / currentRent) * 100;
      if (increasePercent > policy.maxRentIncreasePercent) {
        passed = false;
        why.push(`Proposed rent increase of ${increasePercent.toFixed(1)}% exceeds the maximum policy threshold of ${policy.maxRentIncreasePercent}%.`);
      }
    }

    // Check counter offer limit
    if (policy.maxCounterOffers != null && counterOfferCount != null && counterOfferCount >= policy.maxCounterOffers) {
      passed = false;
      why.push(`Counter offer limit of ${policy.maxCounterOffers} has been reached (current: ${counterOfferCount}).`);
    }

    return {
      passed,
      reason: passed ? 'Proposed terms comply with all active lease policies.' : why.join(' '),
      code: 'POLICY_VIOLATION',
      metadata: { why }
    };
  }
}

// ---------------------------------------------------------------------------
// Rule Registry Manager
// ---------------------------------------------------------------------------

/**
 * Each registry entry stores rich metadata alongside the rule instance:
 * {
 *   rule:          BaseRule instance,
 *   enabled:       boolean,
 *   registeredAt:  Date,
 *   version:       string  (from rule.metadata.version)
 * }
 */
class RuleRegistry {
  constructor() {
    /** @type {Map<string, { rule: BaseRule, enabled: boolean, registeredAt: Date, version: string }>} */
    this.rules = new Map();

    // Auto-register default rules
    this._registerDefault(new PaymentRule());
    this._registerDefault(new MaintenanceRule());
    this._registerDefault(new KYCRule());
    this._registerDefault(new PolicyRule());
  }

  /** Internal helper — bypasses duplicate check for bootstrap defaults */
  _registerDefault(rule) {
    this.rules.set(rule.metadata.id, {
      rule,
      enabled: true,
      registeredAt: new Date(),
      version: rule.metadata.version || '1.0'
    });
  }

  /**
   * Register a new rule.
   * @throws {Error} if a rule with the same id is already registered (use replace() to overwrite).
   */
  register(rule) {
    if (this.rules.has(rule.metadata.id)) {
      throw new Error(`Rule already registered: ${rule.metadata.id}. Use replace() to intentionally overwrite.`);
    }
    this.rules.set(rule.metadata.id, {
      rule,
      enabled: true,
      registeredAt: new Date(),
      version: rule.metadata.version || '1.0'
    });
  }

  /**
   * Replace an existing rule (or register if absent). Never throws on duplicate.
   */
  replace(rule) {
    this.rules.set(rule.metadata.id, {
      rule,
      enabled: true,
      registeredAt: new Date(),
      version: rule.metadata.version || '1.0'
    });
  }

  /**
   * Remove a rule from the registry.
   * @throws {Error} if the rule id is not registered.
   */
  remove(id) {
    if (!this.rules.has(id)) {
      throw new Error(`Rule not found: ${id}`);
    }
    this.rules.delete(id);
  }

  /**
   * Disable a rule so it is excluded from execution.
   * @throws {Error} if the rule id is not registered.
   */
  disable(id) {
    if (!this.rules.has(id)) {
      throw new Error(`Rule not found: ${id}`);
    }
    this.rules.get(id).enabled = false;
  }

  /**
   * Re-enable a previously disabled rule.
   * @throws {Error} if the rule id is not registered.
   */
  enable(id) {
    if (!this.rules.has(id)) {
      throw new Error(`Rule not found: ${id}`);
    }
    this.rules.get(id).enabled = true;
  }

  /**
   * Check whether a rule id exists in the registry (regardless of enabled state).
   */
  isRegistered(id) {
    return this.rules.has(id);
  }

  /**
   * Returns only enabled rule instances, preserving insertion order.
   */
  getRules() {
    return Array.from(this.rules.values())
      .filter(entry => entry.enabled)
      .map(entry => entry.rule);
  }

  /**
   * Returns all registry entries including disabled rules — useful for Admin UI / diagnostics.
   */
  getAll() {
    return Array.from(this.rules.entries()).map(([id, entry]) => ({
      id,
      name: entry.rule.metadata.name,
      category: entry.rule.metadata.category,
      severity: entry.rule.metadata.severity,
      enabled: entry.enabled,
      registeredAt: entry.registeredAt,
      version: entry.version
    }));
  }
}

export const ruleRegistry = new RuleRegistry();
