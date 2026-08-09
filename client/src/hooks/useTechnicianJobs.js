import { useState, useEffect, useCallback } from 'react';
import { technicianJobService, isJobActive, isJobCompleted, isJobScheduled } from '../services/technicianJobService';

export function useTechnicianJobs(params = {}) {
  const [jobs, setJobs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchJobs = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await technicianJobService.fetchMyJobs(params);
      setJobs(data);
    } catch (err) {
      console.error('[useTechnicianJobs] Failed to load technician jobs:', err);
      setError('Unable to load your assigned maintenance requests.');
    } finally {
      setLoading(false);
    }
  }, [JSON.stringify(params)]);

  useEffect(() => {
    fetchJobs();
  }, [fetchJobs]);

  const activeJobs = jobs.filter(j => isJobActive(j.status));
  const completedJobs = jobs.filter(j => isJobCompleted(j.status));
  const scheduledJobs = jobs.filter(j => isJobScheduled(j));

  return {
    jobs,
    activeJobs,
    completedJobs,
    scheduledJobs,
    loading,
    error,
    refetch: fetchJobs,
  };
}
