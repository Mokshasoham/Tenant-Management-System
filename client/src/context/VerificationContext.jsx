import React, { createContext, useContext, useState, useCallback } from 'react';
import { verificationService } from '../services/api';
import formatVerificationApiError from '../utils/verificationApiErrors';

const VerificationContext = createContext(null);

export const VerificationProvider = ({ children }) => {
  const [templates, setTemplates] = useState([]);
  const [workflows, setWorkflows] = useState([]);
  const [activeVerification, setActiveVerification] = useState(null);
  const [widgetData, setWidgetData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const fetchCatalogs = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const [tRes, wRes] = await Promise.all([
        verificationService.getTemplates(),
        verificationService.getWorkflows(),
      ]);
      setTemplates(tRes?.data || tRes || []);
      setWorkflows(wRes?.data || wRes || []);
    } catch (err) {
      setError(formatVerificationApiError(err));
    } finally {
      setLoading(false);
    }
  }, []);

  const loadWidget = useCallback(async (profile, entityId) => {
    try {
      const res = await verificationService.getWidget(profile, entityId);
      const data = res?.data || res;
      setWidgetData(data);
      return data;
    } catch (err) {
      setError(formatVerificationApiError(err));
      return null;
    }
  }, []);

  const refresh = useCallback(async (id = null) => {
    if (id) {
      try {
        const res = await verificationService.getVerificationById(id);
        setActiveVerification(res?.data || res);
      } catch (err) {
        setError(formatVerificationApiError(err));
      }
    }
    await fetchCatalogs();
  }, [fetchCatalogs]);

  const verifyIdentity = useCallback(async (id, payload) => {
    try {
      setLoading(true);
      setError(null);
      const res = await verificationService.verifyIdentity(id, payload);
      const data = res?.data || res;
      setActiveVerification(data);
      return data;
    } catch (err) {
      const errMsg = formatVerificationApiError(err);
      setError(errMsg);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  const retryIdentity = useCallback(async (id, payload) => {
    try {
      setLoading(true);
      setError(null);
      const res = await verificationService.retryIdentityVerification(id, payload);
      const data = res?.data || res;
      setActiveVerification(data);
      return data;
    } catch (err) {
      const errMsg = formatVerificationApiError(err);
      setError(errMsg);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  const unlockIdentity = useCallback(async (id, note) => {
    try {
      setLoading(true);
      setError(null);
      const res = await verificationService.unlockIdentity(id, { note });
      const data = res?.data || res;
      setActiveVerification(data);
      return data;
    } catch (err) {
      const errMsg = formatVerificationApiError(err);
      setError(errMsg);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  const verifyProperty = useCallback(async (id, payload) => {
    try {
      setLoading(true);
      setError(null);
      const res = await verificationService.verifyProperty(id, payload);
      const data = res?.data || res;
      setActiveVerification(data);
      return data;
    } catch (err) {
      const errMsg = formatVerificationApiError(err);
      setError(errMsg);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  const retryProperty = useCallback(async (id, payload) => {
    try {
      setLoading(true);
      setError(null);
      const res = await verificationService.retryPropertyVerification(id, payload);
      const data = res?.data || res;
      setActiveVerification(data);
      return data;
    } catch (err) {
      const errMsg = formatVerificationApiError(err);
      setError(errMsg);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  const unlockProperty = useCallback(async (id, note) => {
    try {
      setLoading(true);
      setError(null);
      const res = await verificationService.unlockPropertyVerification(id, { note });
      const data = res?.data || res;
      setActiveVerification(data);
      return data;
    } catch (err) {
      const errMsg = formatVerificationApiError(err);
      setError(errMsg);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  const value = {
    templates,
    workflows,
    activeVerification,
    widgetData,
    loading,
    error,
    setActiveVerification,
    fetchCatalogs,
    loadWidget,
    refresh,
    verifyIdentity,
    retryIdentity,
    unlockIdentity,
    verifyProperty,
    retryProperty,
    unlockProperty,
  };

  return (
    <VerificationContext.Provider value={value}>
      {children}
    </VerificationContext.Provider>
  );
};

export const useVerificationContext = () => {
  const context = useContext(VerificationContext);
  if (!context) {
    throw new Error('useVerificationContext must be used within a VerificationProvider');
  }
  return context;
};

export default VerificationContext;
