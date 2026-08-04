import crypto from 'crypto';
import cacheProvider from '../../../platform/cache/cacheProvider.js';
import { buildAnalyticsFilters } from './analyticsFilterBuilder.js';
import { fetchSummaryAnalytics } from './SummaryAnalyticsService.js';
import { fetchRiskAnalytics } from './RiskAnalyticsService.js';
import { fetchTrendAnalytics } from './TrendAnalyticsService.js';
import { fetchWorkloadAnalytics } from './WorkloadAnalyticsService.js';
import { fetchRecentActivity } from './DashboardAnalyticsService.js';
import {
  mapSummaryAnalytics,
  mapRiskAnalytics,
  mapTrendAnalytics,
  mapWorkloadAnalytics,
  mapRecentActivityAnalytics,
  mapDashboardPayload
} from './campaignAnalyticsMapper.js';

const CACHE_TTL_SECONDS = 60;
const CACHE_PREFIX = 'analytics:dashboard:';

/** Generates a deterministic cache key from query params and user context */
const generateCacheKey = (endpoint, matchQuery, user = {}) => {
  const queryStr = JSON.stringify(matchQuery);
  const hash = crypto.createHash('md5').update(queryStr).digest('hex');
  const orgId = user.organizationId || 'global';
  const managerId = user.userId || user.id || 'all';
  return `${CACHE_PREFIX}${endpoint}:${orgId}:${managerId}:${hash}`;
};

/**
 * Master Orchestrator for Campaign Analytics.
 * Delegates work to individual Read Model Services, maps output to DTOs, and handles 60s TTL caching.
 */
class CampaignAnalyticsService {
  /**
   * Invalidates all analytics cache keys.
   */
  async invalidateAnalyticsCache() {
    if (cacheProvider.store && typeof cacheProvider.store.keys === 'function') {
      for (const key of cacheProvider.store.keys()) {
        if (key.startsWith(CACHE_PREFIX)) {
          await cacheProvider.del(key);
        }
      }
    } else if (cacheProvider.store instanceof Map) {
      for (const key of cacheProvider.store.keys()) {
        if (key.startsWith(CACHE_PREFIX)) {
          await cacheProvider.del(key);
        }
      }
    }
  }

  async getDashboard(query = {}, user = {}) {
    const match = buildAnalyticsFilters(query, user);
    const cacheKey = generateCacheKey('full', match, user);

    const cached = await cacheProvider.get(cacheKey);
    if (cached) return cached;

    const [summaryRaw, riskRaw, trendsRaw, workloadRaw, recentRaw] = await Promise.all([
      fetchSummaryAnalytics(match),
      fetchRiskAnalytics(match),
      fetchTrendAnalytics(match),
      fetchWorkloadAnalytics(match),
      fetchRecentActivity(match)
    ]);

    const result = mapDashboardPayload(summaryRaw, riskRaw, trendsRaw, workloadRaw, recentRaw);
    await cacheProvider.set(cacheKey, result, CACHE_TTL_SECONDS);
    return result;
  }

  async getDashboardSummary(query = {}, user = {}) {
    const match = buildAnalyticsFilters(query, user);
    const cacheKey = generateCacheKey('summary', match, user);

    const cached = await cacheProvider.get(cacheKey);
    if (cached) return cached;

    const raw = await fetchSummaryAnalytics(match);
    const mapped = mapSummaryAnalytics(raw);
    await cacheProvider.set(cacheKey, mapped, CACHE_TTL_SECONDS);
    return mapped;
  }

  async getDashboardRisk(query = {}, user = {}) {
    const match = buildAnalyticsFilters(query, user);
    const cacheKey = generateCacheKey('risk', match, user);

    const cached = await cacheProvider.get(cacheKey);
    if (cached) return cached;

    const raw = await fetchRiskAnalytics(match);
    const mapped = mapRiskAnalytics(raw);
    await cacheProvider.set(cacheKey, mapped, CACHE_TTL_SECONDS);
    return mapped;
  }

  async getDashboardTrends(query = {}, user = {}) {
    const match = buildAnalyticsFilters(query, user);
    const cacheKey = generateCacheKey('trends', match, user);

    const cached = await cacheProvider.get(cacheKey);
    if (cached) return cached;

    const raw = await fetchTrendAnalytics(match);
    const mapped = mapTrendAnalytics(raw);
    await cacheProvider.set(cacheKey, mapped, CACHE_TTL_SECONDS);
    return mapped;
  }

  async getDashboardWorkload(query = {}, user = {}) {
    const match = buildAnalyticsFilters(query, user);
    const cacheKey = generateCacheKey('workload', match, user);

    const cached = await cacheProvider.get(cacheKey);
    if (cached) return cached;

    const raw = await fetchWorkloadAnalytics(match);
    const mapped = mapWorkloadAnalytics(raw);
    await cacheProvider.set(cacheKey, mapped, CACHE_TTL_SECONDS);
    return mapped;
  }

  async getRecentActivity(query = {}, user = {}) {
    const match = buildAnalyticsFilters(query, user);
    const cacheKey = generateCacheKey('recent', match, user);

    const cached = await cacheProvider.get(cacheKey);
    if (cached) return cached;

    const raw = await fetchRecentActivity(match);
    const mapped = mapRecentActivityAnalytics(raw);
    await cacheProvider.set(cacheKey, mapped, CACHE_TTL_SECONDS);
    return mapped;
  }
}

export const campaignAnalyticsService = new CampaignAnalyticsService();
export default campaignAnalyticsService;
