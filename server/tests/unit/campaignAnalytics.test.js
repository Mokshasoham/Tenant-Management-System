import mongoose from 'mongoose';
import { jest } from '@jest/globals';
import { buildAnalyticsFilters } from '../../src/modules/lease-renewal/analytics/analyticsFilterBuilder.js';
import {
  mapSummaryAnalytics,
  mapRiskAnalytics,
  mapTrendAnalytics,
  mapWorkloadAnalytics,
  mapRecentActivityAnalytics,
  mapDashboardPayload
} from '../../src/modules/lease-renewal/analytics/campaignAnalyticsMapper.js';
import { fetchSummaryAnalytics } from '../../src/modules/lease-renewal/analytics/SummaryAnalyticsService.js';
import { fetchRiskAnalytics } from '../../src/modules/lease-renewal/analytics/RiskAnalyticsService.js';
import { fetchTrendAnalytics } from '../../src/modules/lease-renewal/analytics/TrendAnalyticsService.js';
import { fetchWorkloadAnalytics } from '../../src/modules/lease-renewal/analytics/WorkloadAnalyticsService.js';
import campaignAnalyticsService from '../../src/modules/lease-renewal/analytics/CampaignAnalyticsService.js';
import cacheProvider from '../../src/platform/cache/cacheProvider.js';
import notificationEventRegistry from '../../src/modules/lease-renewal/notifications/notificationEventRegistry.js';
import Notification from '../../src/models/Notification.js';
import LeaseRenewalCampaign from '../../src/models/LeaseRenewalCampaign.js';

describe('Phase 2.3.3.3 — Manager Analytics Backend & Notification Engine', () => {

  beforeEach(() => {
    jest.restoreAllMocks();
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // 1. Reusable Filter Builder Tests
  // ═══════════════════════════════════════════════════════════════════════════
  describe('1. Reusable Analytics Filter Builder (analyticsFilterBuilder.js)', () => {
    it('1.1 — applies default isDeleted: false filter', () => {
      const match = buildAnalyticsFilters({}, {});
      expect(match).toEqual({ isDeleted: false });
    });

    it('1.2 — enforces manager role scoping (manager sees only their campaigns)', () => {
      const managerId = new mongoose.Types.ObjectId().toString();
      const user = { userId: managerId, role: 'manager' };
      const match = buildAnalyticsFilters({}, user);

      expect(match.manager).toBeDefined();
      expect(match.manager.toString()).toBe(managerId);
    });

    it('1.3 — enforces organization isolation', () => {
      const orgId = new mongoose.Types.ObjectId().toString();
      const match = buildAnalyticsFilters({ organizationId: orgId }, {});

      expect(match.organizationId).toBeDefined();
      expect(match.organizationId.toString()).toBe(orgId);
    });

    it('1.4 — parses status and riskBand filters correctly', () => {
      const match = buildAnalyticsFilters({
        status: 'draft,created',
        riskBand: 'critical'
      }, {});

      expect(match.status).toEqual({ $in: ['draft', 'created'] });
      expect(match.riskScore).toEqual({ $gte: 0, $lte: 30 });
    });

    it('1.5 — parses date range filters (startDate and endDate)', () => {
      const match = buildAnalyticsFilters({
        startDate: '2026-01-01',
        endDate: '2026-12-31'
      }, {});

      expect(match.createdAt).toBeDefined();
      expect(match.createdAt.$gte).toEqual(new Date('2026-01-01'));
      expect(match.createdAt.$lte).toEqual(new Date('2026-12-31'));
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // 2. Analytics DTO Mappers & Empty State Defaults
  // ═══════════════════════════════════════════════════════════════════════════
  describe('2. Analytics DTO Mappers (campaignAnalyticsMapper.js)', () => {
    it('2.1 — mapSummaryAnalytics handles empty input with valid default structure', () => {
      const mapped = mapSummaryAnalytics({});
      expect(mapped.totalCampaigns).toBe(0);
      expect(mapped.activeCampaigns).toBe(0);
      expect(mapped.slaMetrics.slaCompliancePercentage).toBe(100);
      expect(mapped.slaMetrics.slaComplianceFormatted).toBe('100.0%');
      expect(mapped.performanceMetrics.averageApprovalTimeHours).toBe(0);
    });

    it('2.2 — mapRiskAnalytics formats percentage strings and risk bands', () => {
      const raw = {
        riskDistribution: { critical: 2, high: 3, medium: 4, low: 1 },
        topRiskyProperties: [{ _id: 'prop-1', propertyName: 'Sunset Apartments', avgRiskScore: 25 }]
      };
      const mapped = mapRiskAnalytics(raw);

      expect(mapped.totalEvaluated).toBe(10);
      expect(mapped.bands.find(b => b.key === 'critical').percentage).toBe(20);
      expect(mapped.bands.find(b => b.key === 'critical').formattedPercentage).toBe('20.0%');
      expect(mapped.topRiskyProperties[0].propertyName).toBe('Sunset Apartments');
    });

    it('2.3 — mapDashboardPayload consolidates full payload with ISO timestamp', () => {
      const payload = mapDashboardPayload({}, {}, {}, {}, []);
      expect(payload.summary).toBeDefined();
      expect(payload.risk).toBeDefined();
      expect(payload.trends).toBeDefined();
      expect(payload.workload).toBeDefined();
      expect(payload.generatedAt).toBeDefined();
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // 3. Aggregation Pipelines & Performance Targets (First Stage $match)
  // ═══════════════════════════════════════════════════════════════════════════
  describe('3. MongoDB Aggregation Read Models (Pipelines)', () => {
    it('3.1 — fetchSummaryAnalytics begins pipeline with $match', async () => {
      const aggregateSpy = jest.spyOn(LeaseRenewalCampaign, 'aggregate').mockResolvedValue([{}]);
      await fetchSummaryAnalytics({ isDeleted: false });

      expect(aggregateSpy).toHaveBeenCalled();
      const pipeline = aggregateSpy.mock.calls[0][0];
      expect(pipeline[0]).toEqual({ $match: { isDeleted: false } });
    });

    it('3.2 — fetchRiskAnalytics begins pipeline with $match', async () => {
      const aggregateSpy = jest.spyOn(LeaseRenewalCampaign, 'aggregate').mockResolvedValue([{}]);
      await fetchRiskAnalytics({ isDeleted: false });

      const pipeline = aggregateSpy.mock.calls[0][0];
      expect(pipeline[0]).toEqual({ $match: { isDeleted: false } });
    });

    it('3.3 — fetchTrendAnalytics begins pipeline with $match', async () => {
      const aggregateSpy = jest.spyOn(LeaseRenewalCampaign, 'aggregate').mockResolvedValue([{}]);
      await fetchTrendAnalytics({ isDeleted: false });

      const pipeline = aggregateSpy.mock.calls[0][0];
      expect(pipeline[0]).toEqual({ $match: { isDeleted: false } });
    });

    it('3.4 — fetchWorkloadAnalytics begins pipeline with $match', async () => {
      const aggregateSpy = jest.spyOn(LeaseRenewalCampaign, 'aggregate').mockResolvedValue([{}]);
      await fetchWorkloadAnalytics({ isDeleted: false });

      const pipeline = aggregateSpy.mock.calls[0][0];
      expect(pipeline[0]).toEqual({ $match: { isDeleted: false } });
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // 4. Cache Hit & Cache Invalidation
  // ═══════════════════════════════════════════════════════════════════════════
  describe('4. Dashboard Analytics Caching Subsystem', () => {
    it('4.1 — getDashboard Summary returns cached value on cache hit', async () => {
      const fakeCached = { totalCampaigns: 42, activeCampaigns: 10 };
      jest.spyOn(cacheProvider, 'get').mockResolvedValue(fakeCached);
      const aggregateSpy = jest.spyOn(LeaseRenewalCampaign, 'aggregate');

      const result = await campaignAnalyticsService.getDashboardSummary({}, {});
      expect(result).toBe(fakeCached);
      expect(aggregateSpy).not.toHaveBeenCalled();
    });

    it('4.2 — invalidateAnalyticsCache clears analytics cache keys from store', async () => {
      await cacheProvider.set('analytics:dashboard:test-key', { data: 123 }, 60);
      let val = await cacheProvider.get('analytics:dashboard:test-key');
      expect(val).toBeDefined();

      await campaignAnalyticsService.invalidateAnalyticsCache();
      val = await cacheProvider.get('analytics:dashboard:test-key');
      expect(val).toBeNull();
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // 5. Notification Event Registry
  // ═══════════════════════════════════════════════════════════════════════════
  describe('5. Notification Event Registry & Subsystem', () => {
    it('5.1 — handles lease.renewal.campaign.created and persists Notification record', async () => {
      const managerId = new mongoose.Types.ObjectId();
      const campaignId = new mongoose.Types.ObjectId();

      const createSpy = jest.spyOn(Notification, 'create').mockResolvedValue({
        _id: new mongoose.Types.ObjectId(),
        recipient: managerId,
        title: 'New Renewal Campaign Created'
      });

      const event = {
        eventType: 'lease.renewal.campaign.created',
        payload: {
          campaignId,
          campaignNumber: 'LCP-20260804-000001',
          manager: managerId
        }
      };

      const result = await notificationEventRegistry.handleEvent(event);
      expect(createSpy).toHaveBeenCalled();
      expect(result).toHaveLength(1);
    });

    it('5.2 — handles SLA breach event with critical priority', async () => {
      const managerId = new mongoose.Types.ObjectId();
      const createSpy = jest.spyOn(Notification, 'create').mockResolvedValue({});

      const event = {
        eventType: 'lease.renewal.sla.breached',
        payload: {
          campaignId: new mongoose.Types.ObjectId(),
          campaignNumber: 'LCP-20260804-000002',
          manager: managerId
        }
      };

      await notificationEventRegistry.handleEvent(event);
      expect(createSpy).toHaveBeenCalledWith(expect.objectContaining({
        priority: 'critical',
        source: 'ESCALATION_SCHEDULER'
      }));
    });

    it('5.3 — returns null for unknown unhandled event type without throwing', async () => {
      const result = await notificationEventRegistry.handleEvent({ eventType: 'unknown.event.type' });
      expect(result).toBeNull();
    });
  });

});
