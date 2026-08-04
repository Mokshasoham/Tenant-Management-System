import { useState, useEffect, useCallback, useRef } from 'react';
import { useSearchParams } from 'react-router-dom';
import analyticsService from '../services/analyticsService';
import campaignService from '../services/campaignService';

const POLLING_INTERVAL_MS = 60000;

export const useManagerDashboard = () => {
  const [searchParams, setSearchParams] = useSearchParams();

  // Parse filters from URL search params
  const filters = {
    organizationId: searchParams.get('organizationId') || '',
    propertyId: searchParams.get('propertyId') || '',
    managerId: searchParams.get('managerId') || '',
    status: searchParams.get('status') || '',
    riskBand: searchParams.get('risk') || searchParams.get('riskBand') || '',
    startDate: searchParams.get('startDate') || '',
    endDate: searchParams.get('endDate') || '',
    search: searchParams.get('search') || '',
    page: Number(searchParams.get('page')) || 1,
    limit: Number(searchParams.get('limit')) || 10,
    sort: searchParams.get('sort') || 'createdAt',
    order: searchParams.get('order') || 'desc'
  };

  // Section States
  const [dashboardData, setDashboardData] = useState(null);
  const [campaignsData, setCampaignsData] = useState({ records: [], total: 0, page: 1, limit: 10 });
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [lastUpdated, setLastUpdated] = useState(null);

  // Section Loading States
  const [loadingSummary, setLoadingSummary] = useState(true);
  const [loadingTrends, setLoadingTrends] = useState(true);
  const [loadingRisk, setLoadingRisk] = useState(true);
  const [loadingWorkload, setLoadingWorkload] = useState(true);
  const [loadingCampaigns, setLoadingCampaigns] = useState(true);

  // Section Error States
  const [errorSummary, setErrorSummary] = useState(null);
  const [errorTrends, setErrorTrends] = useState(null);
  const [errorRisk, setErrorRisk] = useState(null);
  const [errorWorkload, setErrorWorkload] = useState(null);
  const [errorCampaigns, setErrorCampaigns] = useState(null);

  // Quick Action Modal State
  const [activeModal, setActiveModal] = useState({ isOpen: false, type: null, campaign: null });

  // Update URL Filters
  const setFilters = useCallback((newFilters) => {
    const params = new URLSearchParams();
    const merged = { ...filters, ...newFilters };

    Object.entries(merged).forEach(([key, val]) => {
      if (val !== undefined && val !== null && val !== '') {
        params.set(key, String(val));
      }
    });

    setSearchParams(params, { replace: true });
  }, [filters, setSearchParams]);

  // Reset Filters
  const resetFilters = useCallback(() => {
    setSearchParams(new URLSearchParams(), { replace: true });
  }, [setSearchParams]);

  // Main Fetch Function
  const fetchDashboardData = useCallback(async (isManualRefresh = false) => {
    if (isManualRefresh) setIsRefreshing(true);

    const apiParams = {
      organizationId: filters.organizationId || undefined,
      propertyId: filters.propertyId || undefined,
      managerId: filters.managerId || undefined,
      status: filters.status || undefined,
      riskBand: filters.riskBand || undefined,
      startDate: filters.startDate || undefined,
      endDate: filters.endDate || undefined
    };

    // 1. Consolidated Analytics Dashboard
    analyticsService.getDashboard(apiParams)
      .then((data) => {
        setDashboardData(data);
        setErrorSummary(null);
        setErrorTrends(null);
        setErrorRisk(null);
        setErrorWorkload(null);
      })
      .catch((err) => {
        const msg = err.response?.data?.message || err.message || 'Failed to load analytics';
        setErrorSummary(msg);
        setErrorTrends(msg);
        setErrorRisk(msg);
        setErrorWorkload(msg);
      })
      .finally(() => {
        setLoadingSummary(false);
        setLoadingTrends(false);
        setLoadingRisk(false);
        setLoadingWorkload(false);
      });

    // 2. Campaigns Data Table
    const tableParams = {
      ...apiParams,
      page: filters.page,
      limit: filters.limit,
      sort: filters.sort,
      order: filters.order,
      search: filters.search || undefined
    };

    setLoadingCampaigns(true);
    campaignService.getCampaigns(tableParams)
      .then((res) => {
        setCampaignsData({
          records: res.data || [],
          total: res.meta?.total || 0,
          page: res.meta?.page || filters.page,
          limit: res.meta?.limit || filters.limit
        });
        setErrorCampaigns(null);
      })
      .catch((err) => {
        setErrorCampaigns(err.response?.data?.message || err.message || 'Failed to load campaigns list');
      })
      .finally(() => {
        setLoadingCampaigns(false);
        if (isManualRefresh) setIsRefreshing(false);
        setLastUpdated(new Date());
      });
  }, [
    filters.organizationId,
    filters.propertyId,
    filters.managerId,
    filters.status,
    filters.riskBand,
    filters.startDate,
    filters.endDate,
    filters.search,
    filters.page,
    filters.limit,
    filters.sort,
    filters.order
  ]);

  // Initial & Filter Change Trigger
  useEffect(() => {
    fetchDashboardData();
  }, [fetchDashboardData]);

  // 60-Second Auto-Polling
  useEffect(() => {
    const timer = setInterval(() => {
      fetchDashboardData(false);
    }, POLLING_INTERVAL_MS);
    return () => clearInterval(timer);
  }, [fetchDashboardData]);

  // Quick Action Handler
  const executeQuickAction = async (actionType, campaignId, extraData = {}) => {
    try {
      if (actionType === 'escalate') {
        await campaignService.transitionStatus(campaignId, 'escalated', extraData.reason || 'Manager Escalation');
      } else if (actionType === 'expire') {
        await campaignService.transitionStatus(campaignId, 'expired', extraData.reason || 'Expired by Manager');
      } else if (actionType === 'negotiate') {
        await campaignService.transitionStatus(campaignId, 'negotiating', 'Started negotiation');
      } else if (actionType === 'approve') {
        await campaignService.transitionStatus(campaignId, 'approved', 'Approved by Manager');
      }
      
      // Auto-refresh dashboard after action
      await fetchDashboardData(true);
      setActiveModal({ isOpen: false, type: null, campaign: null });
      return { success: true };
    } catch (err) {
      throw err;
    }
  };

  const openQuickAction = (type, campaign) => {
    setActiveModal({ isOpen: true, type, campaign });
  };

  const closeQuickAction = () => {
    setActiveModal({ isOpen: false, type: null, campaign: null });
  };

  return {
    filters,
    setFilters,
    resetFilters,
    dashboardData,
    campaignsData,
    isRefreshing,
    lastUpdated,
    // Loading states
    loadingSummary,
    loadingTrends,
    loadingRisk,
    loadingWorkload,
    loadingCampaigns,
    // Error states
    errorSummary,
    errorTrends,
    errorRisk,
    errorWorkload,
    errorCampaigns,
    // Quick Action Modal
    activeModal,
    openQuickAction,
    closeQuickAction,
    executeQuickAction,
    // Refresh Trigger
    refresh: () => fetchDashboardData(true)
  };
};

export default useManagerDashboard;
