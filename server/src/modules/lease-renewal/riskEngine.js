import Bill from '../../models/Bill.js';
import Maintenance from '../../models/Maintenance.js';

export class BaseRiskStrategy {
  constructor(name, weight) {
    this.name = name;
    this.weight = weight;
  }
  async calculate(context) {
    throw new Error('calculate method must be implemented');
  }
}

export class PaymentRiskStrategy extends BaseRiskStrategy {
  constructor() {
    super('PaymentRisk', 40);
  }
  async calculate(context) {
    const { tenantId } = context;
    const count = await Bill.countDocuments({ tenant: tenantId, status: 'overdue' });
    const deduction = Math.min(this.weight, count * 10); // Deduct 10 pts per late payment
    return {
      deduction,
      reason: deduction > 0 ? `Tenant has ${count} overdue bill(s).` : 'No payment delinquency detected.',
      weight: this.weight,
      metadata: { overdueCount: count }
    };
  }
}

export class MaintenanceRiskStrategy extends BaseRiskStrategy {
  constructor() {
    super('MaintenanceRisk', 20);
  }
  async calculate(context) {
    const { propertyId } = context;
    const count = await Maintenance.countDocuments({ property: propertyId, category: 'damage' });
    const deduction = Math.min(this.weight, count * 10);
    return {
      deduction,
      reason: deduction > 0 ? `${count} tenant-attributed damage issue(s) reported.` : 'No tenant-caused property damage issues.',
      weight: this.weight,
      metadata: { damageCount: count }
    };
  }
}

export class ViolationRiskStrategy extends BaseRiskStrategy {
  constructor() {
    super('ViolationRisk', 20);
  }
  async calculate(context) {
    const count = context.violationsCount || 0;
    const deduction = Math.min(this.weight, count * 10);
    return {
      deduction,
      reason: deduction > 0 ? `${count} lease violation(s) recorded.` : 'No documented lease violations.',
      weight: this.weight,
      metadata: { violationsCount: count }
    };
  }
}

export class OccupancyRiskStrategy extends BaseRiskStrategy {
  constructor() {
    super('OccupancyRisk', 20);
  }
  async calculate(context) {
    const durationMonths = context.occupancyDurationMonths || 0;
    const deduction = durationMonths >= 12 ? 0 : Math.max(0, 15 - Math.round(durationMonths * 1.25));
    return {
      deduction,
      reason: deduction > 0 ? `Tenancy is relatively short (${durationMonths} months).` : 'Long-term stable tenant.',
      weight: this.weight,
      metadata: { durationMonths }
    };
  }
}

export const getRiskGrade = (score) => {
  if (score >= 90) return 'Excellent';
  if (score >= 75) return 'Low Risk';
  if (score >= 60) return 'Medium Risk';
  if (score >= 40) return 'High Risk';
  return 'Critical';
};

export const calculateRiskScore = async (context) => {
  const strategies = [
    new PaymentRiskStrategy(),
    new MaintenanceRiskStrategy(),
    new ViolationRiskStrategy(),
    new OccupancyRiskStrategy()
  ];

  const results = await Promise.all(strategies.map(s => s.calculate(context)));
  const totalDeductions = results.reduce((acc, r) => acc + r.deduction, 0);
  const score = Math.max(0, 100 - totalDeductions);
  const grade = getRiskGrade(score);

  return {
    score,
    grade,
    breakdown: results
  };
};
