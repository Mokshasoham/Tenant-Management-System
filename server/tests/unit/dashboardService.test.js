import { jest, describe, it, expect, beforeEach, afterEach } from '@jest/globals';
import mongoose from 'mongoose';
import { getTenantDashboardData } from '../../src/modules/lease-renewal/dashboardService.js';
import User from '../../src/models/User.js';
import Tenant from '../../src/models/Tenant.js';
import Lease from '../../src/models/Lease.js';
import Payment from '../../src/models/Payment.js';
import Maintenance from '../../src/models/Maintenance.js';
import LeaseRenewal from '../../src/modules/lease-renewal/model.js';

describe('Lease Renewal Dashboard Aggregator Tests', () => {
  beforeEach(() => {
    const userQueryStub = {
      select: jest.fn().mockResolvedValue({ name: 'Moksha', email: 'moksha@test.com' })
    };
    jest.spyOn(User, 'findById').mockReturnValue(userQueryStub);
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('should return dormant state if tenant record does not exist', async () => {
    jest.spyOn(Tenant, 'findOne').mockResolvedValue(null);
    const data = await getTenantDashboardData(new mongoose.Types.ObjectId());
    expect(data.hasActiveLease).toBe(false);
    expect(data.user.name).toBe('Moksha');
  });

  it('should return dormant state if active lease does not exist', async () => {
    jest.spyOn(Tenant, 'findOne').mockResolvedValue({ _id: 'tenant1', name: 'Moksha' });
    const queryStub = {
      populate: jest.fn().mockResolvedValue(null)
    };
    jest.spyOn(Lease, 'findOne').mockReturnValue(queryStub);

    const data = await getTenantDashboardData(new mongoose.Types.ObjectId());
    expect(data.hasActiveLease).toBe(false);
    expect(data.tenantId).toBe('tenant1');
  });

  it('should aggregate active lease details correctly', async () => {
    const mockLease = {
      _id: 'lease1',
      tenant: 'tenant1',
      status: 'active',
      rentAmount: 2000,
      securityDeposit: 3000,
      startDate: new Date(),
      endDate: new Date(Date.now() + 50 * 24 * 3600 * 1000), // 50 days from now
      duration: '12 months',
      property: {
        _id: 'prop1',
        name: 'Sunrise Residency',
        address: '123 Main St'
      },
      createdAt: new Date()
    };

    jest.spyOn(Tenant, 'findOne').mockResolvedValue({ _id: 'tenant1', name: 'Moksha', status: 'active' });
    
    const queryStub = {
      populate: jest.fn().mockResolvedValue(mockLease)
    };
    jest.spyOn(Lease, 'findOne').mockReturnValue(queryStub);
    
    // Stub the static findOne call on LeaseRenewal
    const renewalQueryStub = {
      sort: jest.fn().mockResolvedValue(null)
    };
    jest.spyOn(LeaseRenewal, 'findOne').mockReturnValue(renewalQueryStub);

    jest.spyOn(Payment, 'find').mockResolvedValue([
      { amount: 1500, status: 'overdue' },
      { amount: 500, status: 'pending' }
    ]);

    jest.spyOn(Maintenance, 'find').mockResolvedValue([
      { status: 'open' },
      { status: 'completed' }
    ]);

    const data = await getTenantDashboardData(new mongoose.Types.ObjectId());

    expect(data.hasActiveLease).toBe(true);
    expect(data.property.name).toBe('Sunrise Residency');
    expect(data.lease.daysRemaining).toBe(50);
    expect(data.payments.outstandingBalance).toBe(2000);
    expect(data.payments.overdueCount).toBe(1);
    expect(data.maintenance.openCount).toBe(1);
    expect(data.healthScore).toBe(75); // 100 - 15 (overdue) - 10 (maintenance)
    expect(data.eligibility.eligible).toBe(false); // blocked because outstanding balance & active request flags
  });
});
