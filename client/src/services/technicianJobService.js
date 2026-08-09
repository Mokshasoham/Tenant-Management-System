import { technicianPortalService, maintenanceService } from './api';

export const STATUS_LABELS = {
  submitted: 'Submitted',
  open: 'Submitted',
  assigned: 'Assigned',
  technician_assigned: 'Assigned',
  accepted: 'Accepted',
  in_progress: 'In Progress',
  work_started: 'In Progress',
  technician_en_route: 'En Route',
  waiting_parts: 'Waiting Parts',
  visit_scheduled: 'Scheduled',
  scheduled: 'Scheduled',
  resolved: 'Resolved',
  completed: 'Resolved',
  closed: 'Closed',
  cancelled: 'Cancelled',
};

export function isJobActive(status) {
  if (!status) return true;
  return !['resolved', 'completed', 'closed', 'cancelled'].includes(status.toLowerCase());
}

export function isJobCompleted(status) {
  if (!status) return false;
  return ['resolved', 'completed', 'closed'].includes(status.toLowerCase());
}

export function isJobScheduled(job) {
  if (!job) return false;
  const st = job.status?.toLowerCase();
  return ['scheduled', 'visit_scheduled'].includes(st) || Boolean(job.requestedVisitDate || job.scheduledDate);
}

export const technicianJobService = {
  fetchMyJobs: async (params = {}) => {
    try {
      const res = await technicianPortalService.getMyJobs(params);
      const list = res.data?.data || res.data || (Array.isArray(res) ? res : []);
      return list;
    } catch (err) {
      console.warn('[technicianJobService] Error via portal endpoint, falling back to maintenance API', err);
      const res = await maintenanceService.getAllRequests(params);
      return res.data?.data || res.data || (Array.isArray(res) ? res : []);
    }
  },

  getJobById: async (id) => {
    const res = await maintenanceService.getRequestById(id);
    return res.data?.data || res.data;
  },

  acceptJob: async (id) => {
    const res = await maintenanceService.updateStatus(id, 'accepted', 'Technician accepted job dispatch');
    return res.data?.data || res.data;
  },

  startWork: async (id) => {
    const res = await maintenanceService.updateStatus(id, 'work_started', 'Technician started field repair work');
    return res.data?.data || res.data;
  },

  resolveJob: async (id, note = 'Job completed successfully by technician') => {
    const res = await maintenanceService.updateStatus(id, 'resolved', note);
    return res.data?.data || res.data;
  },
};
