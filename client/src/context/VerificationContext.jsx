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
