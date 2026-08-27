import { useState, useEffect, useCallback } from 'react';
import { useSearchParams } from 'react-router-dom';
import { leaseRenewalDashboardService } from '../services/leaseRenewalDashboardService';

/**
 * Custom hook managing the Tenant Lease Renewal Dashboard state lifecycle.
 */
export const useLeaseRenewalDashboard = () => {
  const [searchParams] = useSearchParams();
  const leaseId = searchParams.get('leaseId');

  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchDashboardData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await leaseRenewalDashboardService.getDashboardData(leaseId ? { leaseId } : {});
      setData(res);
    } catch (err) {
      console.error('Error fetching lease renewal dashboard:', err);
      const status = err.response?.status;
      const respError = err.response?.data?.error || err.response?.data;
      setError({
        message: respError?.message || err.message || 'Could not fetch lease renewal dashboard. Please try again.',
        code: respError?.code || (status === 403 ? 'AUTH_FORBIDDEN' : (status === 404 ? 'LEASE_NOT_FOUND' : 'DASHBOARD_FETCH_FAILED')),
        statusCode: status || 500,
      });
    } finally {
      setLoading(false);
    }
  }, [leaseId]);

  useEffect(() => {
    fetchDashboardData();
  }, [fetchDashboardData]);

  /**
   * Triggers a renewal request submission with optimistic updates
   */
  const handleRequestRenewal = async (payload) => {
    try {
      const newRenewal = await leaseRenewalDashboardService.submitRenewalRequest(payload);
      
      // Optimistic/immediate state transition on success
      setData(prev => {
        if (!prev) return prev;
        return {
          ...prev,
          activeRenewal: newRenewal,
          eligibility: {
            ...prev.eligibility,
            eligible: false,
            checklist: {
              ...prev.eligibility.checklist,
              noExistingRequest: false
            }
          }
        };
      });
      return { success: true };
    } catch (err) {
      console.error('Error requesting lease renewal:', err);
      throw err.response?.data?.error || err;
    }
  };

  /**
   * Cancels a pending lease renewal
   */
  const handleCancelRenewal = async (id) => {
    try {
      await leaseRenewalDashboardService.cancelRenewalRequest(id);
      
      // Clear active renewal state on success
      setData(prev => {
        if (!prev) return prev;
        return {
          ...prev,
          activeRenewal: null,
          eligibility: {
            ...prev.eligibility,
            eligible: prev.lease.daysRemaining <= 90 && prev.payments.outstandingBalance === 0 && prev.maintenance.openCount === 0,
            checklist: {
              ...prev.eligibility.checklist,
              noExistingRequest: true
            }
          }
        };
      });
      return { success: true };
    } catch (err) {
      console.error('Error cancelling lease renewal:', err);
      throw err.response?.data?.error || err;
    }
  };

  /**
   * Submit counter offer
   */
  const handleCounterRenewal = async (id, payload) => {
    try {
      const updated = await leaseRenewalDashboardService.submitCounterOffer(id, payload);
      setData(prev => {
        if (!prev) return prev;
        return { ...prev, activeRenewal: updated };
      });
      return { success: true };
    } catch (err) {
      console.error('Error submitting counter offer:', err);
      throw err.response?.data?.error || err;
    }
  };

  /**
   * Post message in negotiation thread
   */
  const handlePostMessage = async (id, content) => {
    try {
      const messages = await leaseRenewalDashboardService.postMessage(id, content);
      setData(prev => {
        if (!prev) return prev;
        return {
          ...prev,
          activeRenewal: {
            ...prev.activeRenewal,
            messages
          }
        };
      });
      return { success: true };
    } catch (err) {
      console.error('Error sending message:', err);
      throw err.response?.data?.error || err;
    }
  };

  /**
   * Approve renewal terms
   */
  const handleApproveRenewal = async (id) => {
    try {
      const updated = await leaseRenewalDashboardService.approveRenewal(id);
      setData(prev => {
        if (!prev) return prev;
        return { ...prev, activeRenewal: updated };
      });
      return { success: true };
    } catch (err) {
      console.error('Error approving renewal:', err);
      throw err.response?.data?.error || err;
    }
  };

  /**
   * Digitally sign renewal agreement
   */
  const handleSignRenewal = async (id, signatureData) => {
    try {
      const updated = await leaseRenewalDashboardService.signRenewal(id, signatureData);
      setData(prev => {
        if (!prev) return prev;
        return { ...prev, activeRenewal: updated };
      });
      return { success: true };
    } catch (err) {
      console.error('Error signing renewal:', err);
      throw err.response?.data?.error || err;
    }
  };

  return {
    data,
    loading,
    error,
    refresh: fetchDashboardData,
    onRequestRenewal: handleRequestRenewal,
    onCancelRenewal: handleCancelRenewal,
    onCounterRenewal: handleCounterRenewal,
    onPostMessage: handlePostMessage,
    onApproveRenewal: handleApproveRenewal,
    onSignRenewal: handleSignRenewal
  };
};
