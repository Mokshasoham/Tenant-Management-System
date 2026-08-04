import { jest } from '@jest/globals';
import mongoose from 'mongoose';
import Notification from '../../src/models/Notification.js';
import Payment from '../../src/models/Payment.js';
import Lease from '../../src/models/Lease.js';
import Maintenance from '../../src/models/Maintenance.js';
import LeaseRenewalCampaign from '../../src/models/LeaseRenewalCampaign.js';
import User from '../../src/models/User.js';
import Tenant from '../../src/models/Tenant.js';
import NotificationBackfillService from '../../src/modules/lease-renewal/notifications/NotificationBackfillService.js';
import PaymentNotificationMapper from '../../src/modules/lease-renewal/notifications/mappers/PaymentNotificationMapper.js';
import LeaseNotificationMapper from '../../src/modules/lease-renewal/notifications/mappers/LeaseNotificationMapper.js';
import MaintenanceNotificationMapper from '../../src/modules/lease-renewal/notifications/mappers/MaintenanceNotificationMapper.js';
import CampaignNotificationMapper from '../../src/modules/lease-renewal/notifications/mappers/CampaignNotificationMapper.js';

describe('NotificationBackfillService Unit & Integration Tests', () => {
  const dummyUserId = new mongoose.Types.ObjectId();
  const dummyLeaseId = new mongoose.Types.ObjectId();
  const dummyPaymentId = new mongoose.Types.ObjectId();
  const dummyMaintenanceId = new mongoose.Types.ObjectId();
  const dummyCampaignId = new mongoose.Types.ObjectId();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Entity Mappers', () => {
    test('PaymentNotificationMapper maps paid payments to Notification payload', async () => {
      jest.spyOn(User, 'findById').mockResolvedValue({ _id: dummyUserId, email: 'tenant@example.com' });

      const paymentDoc = {
        _id: dummyPaymentId,
        status: 'paid',
        amount: 38000,
        reference: 'pay_123',
        tenant: dummyUserId,
        lease: dummyLeaseId,
        paymentDate: new Date('2026-07-31T18:00:00Z')
      };

      const result = await PaymentNotificationMapper.map(paymentDoc);
      expect(result).toBeDefined();
      expect(result.payload).toBeDefined();
      expect(result.payload.recipient).toEqual(dummyUserId);
      expect(result.payload.category).toBe('payments');
      expect(result.payload.priority).toBe('medium');
      expect(result.payload.idempotencyKey).toContain('notification-backfill:payment');
      expect(result.payload.metadata.backfilled).toBe(true);
    });

    test('PaymentNotificationMapper returns missingRecipient if user not found', async () => {
      jest.spyOn(Tenant, 'findById').mockResolvedValue(null);
      jest.spyOn(User, 'findById').mockResolvedValue(null);

      const paymentDoc = {
        _id: dummyPaymentId,
        status: 'paid',
        tenant: null
      };

      const result = await PaymentNotificationMapper.map(paymentDoc);
      expect(result).toEqual({ missingRecipient: true, origin: 'payment', id: dummyPaymentId });
    });

    test('LeaseNotificationMapper maps signed lease to Lease Signed notification', async () => {
      const leaseDoc = {
        _id: dummyLeaseId,
        leaseNumber: 'LEASE-001',
        signedAt: new Date('2026-07-30T00:00:00Z'),
        signedBy: 'John Doe',
        createdBy: dummyUserId
      };

      const results = await LeaseNotificationMapper.map(leaseDoc);
      expect(results).toHaveLength(1);
      expect(results[0].payload.title).toBe('Lease Agreement Signed');
      expect(results[0].payload.category).toBe('lease');
      expect(results[0].payload.idempotencyKey).toContain('notification-backfill:lease');
    });

    test('MaintenanceNotificationMapper maps maintenance issue to Notification payload', async () => {
      const maintenanceDoc = {
        _id: dummyMaintenanceId,
        issue: 'Plumbing leak',
        status: 'open',
        priority: 'high',
        createdBy: dummyUserId,
        createdAt: new Date('2026-08-01T10:00:00Z')
      };

      const result = await MaintenanceNotificationMapper.map(maintenanceDoc);
      expect(result).toBeDefined();
      expect(result.payload.category).toBe('maintenance');
      expect(result.payload.priority).toBe('high');
      expect(result.payload.title).toBe('Maintenance Request Created');
    });

    test('CampaignNotificationMapper maps created campaign to Renewal notification', async () => {
      const campaignDoc = {
        _id: dummyCampaignId,
        campaignNumber: 'CMP-001',
        manager: dummyUserId,
        status: 'waiting_for_tenant',
        createdAt: new Date('2026-08-02T10:00:00Z')
      };

      const results = await CampaignNotificationMapper.map(campaignDoc);
      expect(results).toHaveLength(1);
      expect(results[0].payload.title).toBe('New Renewal Campaign Created');
      expect(results[0].payload.category).toBe('renewal');
    });
  });

  describe('NotificationBackfillService Execution & Dry-Run Mode', () => {
    test('run() in dryRun mode simulates creation without DB writes', async () => {
      const mockQueryChain = (results) => ({
        sort: jest.fn().mockReturnThis(),
        skip: jest.fn().mockReturnThis(),
        limit: jest.fn().mockResolvedValue(results)
      });

      jest.spyOn(Payment, 'find').mockReturnValue(mockQueryChain([
        { _id: dummyPaymentId, status: 'paid', amount: 5000, tenant: dummyUserId, paymentDate: new Date() }
      ]));
      jest.spyOn(Lease, 'find').mockReturnValue(mockQueryChain([]));
      jest.spyOn(Maintenance, 'find').mockReturnValue(mockQueryChain([]));
      jest.spyOn(LeaseRenewalCampaign, 'find').mockReturnValue(mockQueryChain([]));
      jest.spyOn(User, 'findById').mockResolvedValue({ _id: dummyUserId });
      jest.spyOn(Notification, 'exists').mockResolvedValue(null);
      const createSpy = jest.spyOn(Notification, 'create').mockResolvedValue({});

      const stats = await NotificationBackfillService.run({ dryRun: true, batchSize: 50 });

      expect(stats.dryRun).toBe(true);
      expect(stats.payments.processed).toBe(1);
      expect(stats.payments.created).toBe(1);
      expect(stats.totalCreated).toBe(1);
      expect(createSpy).not.toHaveBeenCalled(); // No DB writes in dry-run mode
    });

    test('run() skips duplicates when idempotencyKey already exists', async () => {
      const mockQueryChain = (results) => ({
        sort: jest.fn().mockReturnThis(),
        skip: jest.fn().mockReturnThis(),
        limit: jest.fn().mockResolvedValue(results)
      });

      jest.spyOn(Payment, 'find').mockReturnValue(mockQueryChain([
        { _id: dummyPaymentId, status: 'paid', amount: 5000, tenant: dummyUserId, paymentDate: new Date() }
      ]));
      jest.spyOn(Lease, 'find').mockReturnValue(mockQueryChain([]));
      jest.spyOn(Maintenance, 'find').mockReturnValue(mockQueryChain([]));
      jest.spyOn(LeaseRenewalCampaign, 'find').mockReturnValue(mockQueryChain([]));
      jest.spyOn(User, 'findById').mockResolvedValue({ _id: dummyUserId });

      // Simulate that idempotencyKey already exists in Notification collection
      jest.spyOn(Notification, 'exists').mockResolvedValue({ _id: new mongoose.Types.ObjectId() });
      const createSpy = jest.spyOn(Notification, 'create');

      const stats = await NotificationBackfillService.run({ dryRun: false, batchSize: 50 });

      expect(stats.payments.processed).toBe(1);
      expect(stats.payments.created).toBe(0);
      expect(stats.payments.skipped).toBe(1);
      expect(stats.totalSkipped).toBe(1);
      expect(createSpy).not.toHaveBeenCalled();
    });
  });
});
