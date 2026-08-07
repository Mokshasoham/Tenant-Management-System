import { useState, useCallback } from 'react';
import { verificationService } from '../services/api';
import formatVerificationApiError from '../utils/verificationApiErrors';
import { getTrustBadgeTier, formatScoreBreakdown } from '../utils/trustScoreHelpers';

export const useTrustScore = (entityType, entityId) => {
  const [score, setScore] = useState(0);
  const [breakdown, setBreakdown] = useState([]);
  const [badgeTier, setBadgeTier] = useState(getTrustBadgeTier(0));
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const fetchScoreAndHistory = useCallback(async () => {
    if (!entityType || !entityId) return;
    try {
      setLoading(true);
      setError(null);
      const res = await verificationService.getHistory(entityType, entityId);
      const historyData = res?.data || res || [];
      setHistory(historyData);

      if (historyData.length > 0) {
        const latest = historyData[0];
        const currentScore = latest.score || 0;
        setScore(currentScore);
        setBadgeTier(getTrustBadgeTier(currentScore));
        setBreakdown(formatScoreBreakdown(latest.breakdown || {}));
      }
    } catch (err) {
      setError(formatVerificationApiError(err));
    } finally {
      setLoading(false);
    }
  }, [entityType, entityId]);

  return {
    score,
    breakdown,
    badgeTier,
    history,
    loading,
    error,
    fetchScoreAndHistory,
  };
};

export default useTrustScore;
