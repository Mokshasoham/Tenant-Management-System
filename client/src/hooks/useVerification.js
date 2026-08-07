import { useState, useCallback } from 'react';
import { verificationService } from '../services/api';
import formatVerificationApiError from '../utils/verificationApiErrors';

export const useVerification = (initialId = null) => {
  const [verification, setVerification] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const fetchVerification = useCallback(async (id) => {
    const targetId = id || initialId;
    if (!targetId) return;
    try {
      setLoading(true);
      setError(null);
      const res = await verificationService.getVerificationById(targetId);
      const data = res?.data || res;
      setVerification(data);
      return data;
    } catch (err) {
      const msg = formatVerificationApiError(err);
      setError(msg);
      throw err;
    } finally {
      setLoading(false);
    }
  }, [initialId]);

  const initiate = useCallback(async (entityType, entityId) => {
    try {
      setLoading(true);
      setError(null);
      const res = await verificationService.initiateVerification({ entityType, entityId });
      const data = res?.data || res;
      setVerification(data);
      return data;
    } catch (err) {
      const msg = formatVerificationApiError(err);
      setError(msg);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  const submit = useCallback(async (id) => {
    try {
      setLoading(true);
      setError(null);
      const res = await verificationService.submitVerification(id);
      const data = res?.data || res;
      setVerification(data);
      return data;
    } catch (err) {
      const msg = formatVerificationApiError(err);
      setError(msg);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  const resubmit = useCallback(async (id, documents) => {
    try {
      setLoading(true);
      setError(null);
      const res = await verificationService.resubmitVerification(id, documents);
      const data = res?.data || res;
      setVerification(data);
      return data;
    } catch (err) {
      const msg = formatVerificationApiError(err);
      setError(msg);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  return {
    verification,
    loading,
    error,
    fetchVerification,
    initiate,
    submit,
    resubmit,
    setVerification,
  };
};

export default useVerification;
