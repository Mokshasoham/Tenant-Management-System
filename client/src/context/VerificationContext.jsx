import React, { createContext, useContext, useState, useCallback } from 'react';
import { verificationService } from '../services/api';
import formatVerificationApiError from '../utils/verificationApiErrors';

const VerificationContext = createContext(null);

export const VerificationProvider = ({ children }) => {
  const [verifications, setVerifications] = useState([]);
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

  const loadPropertyVerification = useCallback(async (propertyId) => {
    if (!propertyId) {
      setActiveVerification(null);
      setWidgetData(null);
      return null;
    }
    try {
      setLoading(true);
      setError(null);
      // Immediately clear activeVerification to prevent cross-property data leakage
      setActiveVerification(null);
      const res = await verificationService.getActivePropertyVerification(propertyId);
      const data = res?.data?.data !== undefined ? res.data.data : res?.data || null;
      setActiveVerification(data);
      await loadWidget('PROPERTY', propertyId);
      return data;
    } catch (err) {
      if (err?.response?.status === 404) {
        setActiveVerification(null);
        setError(null);
        return null;
      }
      setError(formatVerificationApiError(err));
      return null;
    } finally {
      setLoading(false);
    }
  }, [loadWidget]);

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

  const getTemplates = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await verificationService.getTemplates();
      const data = res?.data || res || [];
      setTemplates(data);
      return data;
    } catch (err) {
      setError(formatVerificationApiError(err));
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  const getWorkflows = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await verificationService.getWorkflows();
      const data = res?.data || res || [];
      setWorkflows(data);
      return data;
    } catch (err) {
      setError(formatVerificationApiError(err));
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  const getIdentityStatus = useCallback(async (id) => {
    try {
      const res = await verificationService.getIdentityStatus(id);
      return res?.data || res;
    } catch (err) {
      setError(formatVerificationApiError(err));
      throw err;
    }
  }, []);

  const getVerifications = useCallback(async (params) => {
    try {
      setLoading(true);
      setError(null);
      const res = await verificationService.getVerifications(params);
      const data = res?.data || res || [];
      setVerifications(Array.isArray(data) ? data : data?.verifications || []);
      return data;
    } catch (err) {
      setError(formatVerificationApiError(err));
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  const getVerificationById = useCallback(async (id) => {
    try {
      setLoading(true);
      setError(null);
      const res = await verificationService.getVerificationById(id);
      const data = res?.data || res;
      setActiveVerification(data);
      return data;
    } catch (err) {
      setError(formatVerificationApiError(err));
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  const initiateVerification = useCallback(async (payload) => {
    try {
      setLoading(true);
      setError(null);
      const res = await verificationService.initiateVerification(payload);
      const data = res?.data || res;
      setActiveVerification(data);
      return data;
    } catch (err) {
      setError(formatVerificationApiError(err));
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  const updateDraft = useCallback(async (id, payload) => {
    try {
      setLoading(true);
      setError(null);
      const res = await verificationService.updateDraft(id, payload);
      const data = res?.data || res;
      setActiveVerification(data);
      return data;
    } catch (err) {
      setError(formatVerificationApiError(err));
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  const submitVerification = useCallback(async (id) => {
    try {
      setLoading(true);
      setError(null);
      const res = await verificationService.submitVerification(id);
      const data = res?.data || res;
      setActiveVerification(data);
      return data;
    } catch (err) {
      setError(formatVerificationApiError(err));
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  const resubmitVerification = useCallback(async (id, documents) => {
    try {
      setLoading(true);
      setError(null);
      const res = await verificationService.resubmitVerification(id, documents);
      const data = res?.data || res;
      setActiveVerification(data);
      return data;
    } catch (err) {
      setError(formatVerificationApiError(err));
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  const uploadDocument = useCallback(async (id, payload) => {
    try {
      setLoading(true);
      setError(null);
      const res = await verificationService.uploadDocument(id, payload);
      const data = res?.data || res;
      setActiveVerification(data);
      return data;
    } catch (err) {
      setError(formatVerificationApiError(err));
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  const reviewVerification = useCallback(async (id, payload) => {
    try {
      setLoading(true);
      setError(null);
      const res = await verificationService.reviewVerification(id, payload);
      const data = res?.data || res;
      setActiveVerification(data);
      return data;
    } catch (err) {
      setError(formatVerificationApiError(err));
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  const approveVerification = useCallback(async (id, payload) => {
    try {
      setLoading(true);
      setError(null);
      const res = await verificationService.approveVerification(id, payload);
      const data = res?.data || res;
      setActiveVerification(data);
      return data;
    } catch (err) {
      setError(formatVerificationApiError(err));
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  const rejectVerification = useCallback(async (id, payload) => {
    try {
      setLoading(true);
      setError(null);
      const res = await verificationService.rejectVerification(id, payload);
      const data = res?.data || res;
      setActiveVerification(data);
      return data;
    } catch (err) {
      setError(formatVerificationApiError(err));
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  const getHistory = useCallback(async (entityType, entityId) => {
    try {
      const res = await verificationService.getHistory(entityType, entityId);
      return res?.data || res;
    } catch (err) {
      setError(formatVerificationApiError(err));
      throw err;
    }
  }, []);

  const getWidget = useCallback(async (profile, entityId) => {
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

  const startIdentityVerification = useCallback(async (id, payload) => {
    try {
      setLoading(true);
      setError(null);
      const res = await verificationService.startIdentityVerification(id, payload);
      const data = res?.data || res;
      setActiveVerification(data);
      return data;
    } catch (err) {
      setError(formatVerificationApiError(err));
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  const retryIdentityVerification = useCallback(async (id, payload) => {
    try {
      setLoading(true);
      setError(null);
      const res = await verificationService.retryIdentityVerification(id, payload);
      const data = res?.data || res;
      setActiveVerification(data);
      return data;
    } catch (err) {
      setError(formatVerificationApiError(err));
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  const startPropertyVerification = useCallback(async (id, payload) => {
    try {
      setLoading(true);
      setError(null);
      const res = await verificationService.startPropertyVerification(id, payload);
      const data = res?.data || res;
      setActiveVerification(data);
      return data;
    } catch (err) {
      setError(formatVerificationApiError(err));
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  const uploadPropertyDocument = useCallback(async (id, payload) => {
    try {
      setLoading(true);
      setError(null);
      const res = await verificationService.uploadPropertyDocument(id, payload);
      const data = res?.data || res;
      setActiveVerification(data);
      return data;
    } catch (err) {
      setError(formatVerificationApiError(err));
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  const getPropertyVerificationStatus = useCallback(async (id) => {
    try {
      const res = await verificationService.getPropertyVerificationStatus(id);
      return res?.data || res;
    } catch (err) {
      setError(formatVerificationApiError(err));
      throw err;
    }
  }, []);

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

  const retryPropertyVerification = useCallback(async (id, payload) => {
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

  const unlockPropertyVerification = useCallback(async (id, note) => {
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

  const connectDigiLocker = useCallback(async (id) => {
    try {
      setLoading(true);
      setError(null);
      const res = await verificationService.connectDigiLocker(id);
      return res?.data || res;
    } catch (err) {
      const errMsg = formatVerificationApiError(err);
      setError(errMsg);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  const getDigiLockerStatus = useCallback(async (id) => {
    try {
      const res = await verificationService.getDigiLockerStatus(id);
      return res?.data || res;
    } catch (err) {
      const errMsg = formatVerificationApiError(err);
      setError(errMsg);
      throw err;
    }
  }, []);

  const getDigiLockerDocuments = useCallback(async (id) => {
    try {
      setLoading(true);
      setError(null);
      const res = await verificationService.getDigiLockerDocuments(id);
      return res?.data || res;
    } catch (err) {
      const errMsg = formatVerificationApiError(err);
      setError(errMsg);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  const importDigiLockerDocument = useCallback(async (id, payload) => {
    try {
      setLoading(true);
      setError(null);
      const res = await verificationService.importDigiLockerDocument(id, payload);
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

  const disconnectDigiLocker = useCallback(async (id) => {
    try {
      setLoading(true);
      setError(null);
      const res = await verificationService.disconnectDigiLocker(id);
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

  const grantBiometricConsent = useCallback(async (id) => {
    try {
      setLoading(true);
      setError(null);
      const res = await verificationService.grantBiometricConsent(id);
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

  const revokeBiometricConsent = useCallback(async (id) => {
    try {
      setLoading(true);
      setError(null);
      const res = await verificationService.revokeBiometricConsent(id);
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

  const verifyFacialBiometrics = useCallback(async (id, payload) => {
    try {
      setLoading(true);
      setError(null);
      const res = await verificationService.verifyFacialBiometrics(id, payload);
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

  const getFacialStatus = useCallback(async (id) => {
    try {
      const res = await verificationService.getFacialStatus(id);
      return res?.data || res;
    } catch (err) {
      const errMsg = formatVerificationApiError(err);
      setError(errMsg);
      throw err;
    }
  }, []);

  const retryFacialVerification = useCallback(async (id, payload) => {
    try {
      setLoading(true);
      setError(null);
      const res = await verificationService.retryFacialVerification(id, payload);
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

  const unlockFacialVerification = useCallback(async (id, note) => {
    try {
      setLoading(true);
      setError(null);
      const res = await verificationService.unlockFacialVerification(id, { note });
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

  const grantVideoKycConsent = useCallback(async (id, permissions) => {
    try {
      setLoading(true);
      setError(null);
      const res = await verificationService.grantVideoKycConsent(id, permissions);
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

  const revokeVideoKycConsent = useCallback(async (id) => {
    try {
      setLoading(true);
      setError(null);
      const res = await verificationService.revokeVideoKycConsent(id);
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

  const createVideoKycSession = useCallback(async (id, metadata) => {
    try {
      setLoading(true);
      setError(null);
      const res = await verificationService.createVideoKycSession(id, metadata);
      return res?.data || res;
    } catch (err) {
      const errMsg = formatVerificationApiError(err);
      setError(errMsg);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  const assignVideoKycAgent = useCallback(async (id, payload) => {
    try {
      setLoading(true);
      setError(null);
      const res = await verificationService.assignVideoKycAgent(id, payload);
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

  const submitVideoKycEvaluation = useCallback(async (id, payload) => {
    try {
      setLoading(true);
      setError(null);
      const res = await verificationService.submitVideoKycEvaluation(id, payload);
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

  const getVideoKycStatus = useCallback(async (id) => {
    try {
      const res = await verificationService.getVideoKycStatus(id);
      return res?.data || res;
    } catch (err) {
      const errMsg = formatVerificationApiError(err);
      setError(errMsg);
      throw err;
    }
  }, []);

  const unlockVideoKyc = useCallback(async (id, note) => {
    try {
      setLoading(true);
      setError(null);
      const res = await verificationService.unlockVideoKyc(id, { note });
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

  const evaluateVerificationFraud = useCallback(async (id, payload, headers = {}) => {
    try {
      setLoading(true);
      setError(null);
      const res = await verificationService.evaluateVerificationFraud(id, payload, headers);
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

  const confirmFraud = useCallback(async (id, notes, headers = {}) => {
    try {
      setLoading(true);
      setError(null);
      const res = await verificationService.confirmFraud(id, { notes }, headers);
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

  const dismissFraud = useCallback(async (id, notes, headers = {}) => {
    try {
      setLoading(true);
      setError(null);
      const res = await verificationService.dismissFraud(id, { notes }, headers);
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

  const getFraudStatus = useCallback(async (id) => {
    try {
      const res = await verificationService.getFraudStatus(id);
      return res?.data || res;
    } catch (err) {
      const errMsg = formatVerificationApiError(err);
      setError(errMsg);
      throw err;
    }
  }, []);

  const unlockFraudDetection = useCallback(async (id, note) => {
    try {
      setLoading(true);
      setError(null);
      const res = await verificationService.unlockFraudDetection(id, { note });
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

  const screenSanction = useCallback(async (id, payload = {}, headers = {}) => {
    try {
      setLoading(true);
      setError(null);
      const res = await verificationService.screenSanction(id, payload, headers);
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

  const confirmSanctionMatch = useCallback(async (id, notes, headers = {}) => {
    try {
      setLoading(true);
      setError(null);
      const res = await verificationService.confirmSanctionMatch(id, { notes }, headers);
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

  const dismissSanctionMatch = useCallback(async (id, notes, headers = {}) => {
    try {
      setLoading(true);
      setError(null);
      const res = await verificationService.dismissSanctionMatch(id, { notes }, headers);
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

  const getSanctionStatus = useCallback(async (id) => {
    try {
      const res = await verificationService.getSanctionStatus(id);
      return res?.data || res;
    } catch (err) {
      const errMsg = formatVerificationApiError(err);
      setError(errMsg);
      throw err;
    }
  }, []);

  const unlockSanctionScreening = useCallback(async (id, note) => {
    try {
      setLoading(true);
      setError(null);
      const res = await verificationService.unlockSanctionScreening(id, { note });
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

  const synthesizeEvidence = useCallback(async (id, payload, headers = {}) => {
    try {
      setLoading(true);
      setError(null);
      const res = await verificationService.synthesizeEvidence(id, payload, headers);
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

  const getFusionStatus = useCallback(async (id) => {
    try {
      const res = await verificationService.getFusionStatus(id);
      return res?.data || res;
    } catch (err) {
      const errMsg = formatVerificationApiError(err);
      setError(errMsg);
      throw err;
    }
  }, []);

  const confirmFusionRecommendation = useCallback(async (id, payload, headers = {}) => {
    try {
      setLoading(true);
      setError(null);
      const res = await verificationService.confirmFusionRecommendation(id, payload, headers);
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

  const overrideFusionRecommendation = useCallback(async (id, payload, headers = {}) => {
    try {
      setLoading(true);
      setError(null);
      const res = await verificationService.overrideFusionRecommendation(id, payload, headers);
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

  const unlockFusion = useCallback(async (id, payload) => {
    try {
      setLoading(true);
      setError(null);
      const res = await verificationService.unlockFusion(id, payload);
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

  const getComplianceLedger = useCallback(async (id) => {
    try {
      const res = await verificationService.getComplianceLedger(id);
      return res?.data || res;
    } catch (err) {
      const errMsg = formatVerificationApiError(err);
      setError(errMsg);
      throw err;
    }
  }, []);

  const verifyLedgerIntegrity = useCallback(async (id) => {
    try {
      const res = await verificationService.verifyLedgerIntegrity(id);
      return res?.data || res;
    } catch (err) {
      const errMsg = formatVerificationApiError(err);
      setError(errMsg);
      throw err;
    }
  }, []);

  const triggerRecertification = useCallback(async (id, payload) => {
    try {
      setLoading(true);
      setError(null);
      const res = await verificationService.triggerRecertification(id, payload);
      const data = res?.data || res;
      return data;
    } catch (err) {
      const errMsg = formatVerificationApiError(err);
      setError(errMsg);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  const downloadCompliancePackage = useCallback(async (id, params) => {
    try {
      setLoading(true);
      setError(null);
      const res = await verificationService.downloadCompliancePackage(id, params);
      return res?.data || res;
    } catch (err) {
      const errMsg = formatVerificationApiError(err);
      setError(errMsg);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  const value = {
    verifications,
    templates,
    workflows,
    activeVerification,
    setActiveVerification,
    widgetData,
    loading,
    error,
    refresh,
    loadWidget,
    fetchCatalogs,
    getVerifications,
    getVerificationById,
    initiateVerification,
    updateDraft,
    submitVerification,
    resubmitVerification,
    uploadDocument,
    reviewVerification,
    approveVerification,
    rejectVerification,
    getHistory,
    getWidget,
    loadPropertyVerification,
    getTemplates,
    getWorkflows,
    startIdentityVerification,
    verifyIdentity,
    getIdentityStatus,
    retryIdentity,
    retryIdentityVerification,
    unlockIdentity,
    startPropertyVerification,
    uploadPropertyDocument,
    verifyProperty,
    getPropertyVerificationStatus,
    retryPropertyVerification,
    unlockPropertyVerification,
    connectDigiLocker,
    getDigiLockerStatus,
    getDigiLockerDocuments,
    importDigiLockerDocument,
    disconnectDigiLocker,
    grantBiometricConsent,
    revokeBiometricConsent,
    verifyFacialBiometrics,
    getFacialStatus,
    retryFacialVerification,
    unlockFacialVerification,
    grantVideoKycConsent,
    revokeVideoKycConsent,
    createVideoKycSession,
    assignVideoKycAgent,
    submitVideoKycEvaluation,
    getVideoKycStatus,
    unlockVideoKyc,
    evaluateVerificationFraud,
    confirmFraud,
    dismissFraud,
    getFraudStatus,
    unlockFraudDetection,
    screenSanction,
    confirmSanctionMatch,
    dismissSanctionMatch,
    getSanctionStatus,
    unlockSanctionScreening,
    synthesizeEvidence,
    getFusionStatus,
    confirmFusionRecommendation,
    overrideFusionRecommendation,
    unlockFusion,
    getComplianceLedger,
    verifyLedgerIntegrity,
    triggerRecertification,
    downloadCompliancePackage,
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
