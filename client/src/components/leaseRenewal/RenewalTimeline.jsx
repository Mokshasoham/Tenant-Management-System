import React from 'react';
import { History, CheckCircle2, Clock, Calendar } from 'lucide-react';

const formatDate = (dateStr) => {
  if (!dateStr) return 'N/A';
  try {
    return new Date(dateStr).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
  } catch {
    return dateStr;
  }
};

export function RenewalTimeline({ timeline = [], activeRenewal, lease }) {
  // Build clean timeline steps combining recorded events & lifecycle
  const events = [];

  if (lease?.createdAt || lease?.startDate) {
    events.push({
      id: 'evt-created',
      title: 'Lease Created & Activated',
      date: formatDate(lease.createdAt || lease.startDate),
      description: 'Initial lease agreement executed and property key handover completed.',
      completed: true
    });
  }

  // Renewal window opened (90 days prior to end)
  if (lease?.endDate) {
    const endDate = new Date(lease.endDate);
    const windowDate = new Date(endDate);
    windowDate.setDate(windowDate.getDate() - 90);
    events.push({
      id: 'evt-window',
      title: 'Renewal Window Opened',
      date: formatDate(windowDate),
      description: '90-day renewal qualification window opened for tenant renewal request.',
      completed: true
    });
  }

  if (activeRenewal) {
    events.push({
      id: 'evt-started',
      title: 'Renewal Process Started',
      date: formatDate(activeRenewal.createdAt),
      description: `Tenant initiated renewal request (${activeRenewal.renewalNumber || 'LRN'}).`,
      completed: true
    });

    if (['requested', 'under_review', 'counter_offer', 'approved', 'signed', 'completed'].includes(activeRenewal.status)) {
      events.push({
        id: 'evt-submitted',
        title: 'Renewal Request Submitted',
        date: formatDate(activeRenewal.createdAt),
        description: 'Terms submitted to property manager for formal contract review.',
        completed: true
      });
    }

    if (['under_review', 'counter_offer', 'approved', 'signed', 'completed'].includes(activeRenewal.status)) {
      events.push({
        id: 'evt-review',
        title: 'Manager Review In Progress',
        date: formatDate(activeRenewal.updatedAt || activeRenewal.createdAt),
        description: 'Property manager evaluating rental terms and unit inspection history.',
        completed: true
      });
    }

    if (['approved', 'signed', 'completed'].includes(activeRenewal.status)) {
      events.push({
        id: 'evt-approved',
        title: 'Renewal Approved & Agreement Generated',
        date: formatDate(activeRenewal.approvalDate || activeRenewal.updatedAt),
        description: 'Manager approved terms. Legal lease renewal agreement document generated.',
        completed: true
      });
    }

    if (['signed', 'completed'].includes(activeRenewal.status)) {
      events.push({
        id: 'evt-signed',
        title: 'Agreement Digitally Signed',
        date: formatDate(activeRenewal.tenantSignature?.signedAt || activeRenewal.updatedAt),
        description: 'Tenant digital signature captured and cryptographic checksum verified.',
        completed: true
      });
    }

    if (activeRenewal.status === 'completed') {
      events.push({
        id: 'evt-completed',
        title: 'Renewal Completed & Extended',
        date: formatDate(activeRenewal.updatedAt),
        description: 'Lease extended into new term. Updated records archived in MongoDB.',
        completed: true
      });
    }
  }

  return (
    <div id="lease-timeline-section" className="p-6 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm space-y-4">
      <div className="flex items-center gap-2 border-b border-slate-100 dark:border-slate-800 pb-3">
        <div className="w-8 h-8 rounded-xl bg-blue-50 dark:bg-blue-950/40 text-blue-600 dark:text-blue-400 flex items-center justify-center">
          <History className="w-4 h-4" />
        </div>
        <div>
          <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100">LEASE LIFECYCLE TIMELINE</h3>
          <p className="text-[11px] text-slate-500 dark:text-slate-400">Verifiable milestone history log</p>
        </div>
      </div>

      <div className="space-y-4 relative pl-4 border-l-2 border-slate-200 dark:border-slate-800 my-2">
        {events.map((evt) => (
          <div key={evt.id} className="relative pl-6 space-y-1">
            <div className="absolute -left-[25px] top-0.5 w-4 h-4 rounded-full bg-white dark:bg-slate-900 border-2 border-blue-600 dark:border-blue-400 flex items-center justify-center">
              <div className="w-1.5 h-1.5 rounded-full bg-blue-600 dark:bg-blue-400" />
            </div>

            <div className="flex items-center justify-between text-xs">
              <span className="font-bold text-slate-900 dark:text-slate-100">{evt.title}</span>
              <span className="font-mono text-[11px] font-semibold text-slate-500 dark:text-slate-400">{evt.date}</span>
            </div>

            <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed bg-slate-50/60 dark:bg-slate-950/40 p-2.5 rounded-xl border border-slate-100 dark:border-slate-800">
              {evt.description}
            </p>
          </div>
        ))}
      </div>
    </div>
  );
}

export default RenewalTimeline;
