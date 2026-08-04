import React from 'react';
import { Play, Eye, Download, Upload, MessageSquare, List } from 'lucide-react';

export const QuickActionsCard = ({ onStartRenewal, onViewLease, onUploadDoc, eligibility }) => {
  const isBlocked = !eligibility?.eligible;

  return (
    <div className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-3xl p-6 shadow-sm space-y-6">
      <h4 className="text-lg font-semibold text-slate-800 dark:text-slate-100">Quick Actions</h4>

      <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
        {/* Request Renewal */}
        <button
          onClick={onStartRenewal}
          disabled={isBlocked}
          className={`flex flex-col items-center justify-center p-4 rounded-2xl border text-center transition duration-150 gap-2 ${
            isBlocked
              ? 'opacity-40 cursor-not-allowed bg-slate-50 dark:bg-slate-800 border-slate-100 dark:border-slate-800 text-slate-400'
              : 'bg-primary/5 hover:bg-primary/10 border-primary/20 text-primary'
          }`}
          aria-label="Request lease renewal"
        >
          <Play size={24} />
          <span className="text-xs font-semibold">Request Renewal</span>
        </button>

        {/* View Lease */}
        <button
          onClick={onViewLease}
          className="flex flex-col items-center justify-center p-4 rounded-2xl border border-slate-100 dark:border-slate-800 bg-slate-50/55 hover:bg-slate-100 dark:bg-slate-850 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 text-center transition duration-150 gap-2"
          aria-label="View lease details"
        >
          <Eye size={24} />
          <span className="text-xs font-semibold">View Current Lease</span>
        </button>

        {/* Download Agreement */}
        <a
          href="#"
          onClick={(e) => { e.preventDefault(); alert('Downloading latest lease draft...'); }}
          className="flex flex-col items-center justify-center p-4 rounded-2xl border border-slate-100 dark:border-slate-800 bg-slate-50/55 hover:bg-slate-100 dark:bg-slate-850 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 text-center transition duration-150 gap-2"
          aria-label="Download lease agreement draft"
        >
          <Download size={24} />
          <span className="text-xs font-semibold">Download Draft</span>
        </a>

        {/* Upload Documents */}
        <button
          onClick={onUploadDoc}
          className="flex flex-col items-center justify-center p-4 rounded-2xl border border-slate-100 dark:border-slate-800 bg-slate-50/55 hover:bg-slate-100 dark:bg-slate-850 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 text-center transition duration-150 gap-2"
          aria-label="Upload documents"
        >
          <Upload size={24} />
          <span className="text-xs font-semibold">Upload KYC Docs</span>
        </button>

        {/* Contact Manager */}
        <a
          href="mailto:manager@saas-tenant.com?subject=Lease%20Renewal%20Query"
          className="flex flex-col items-center justify-center p-4 rounded-2xl border border-slate-100 dark:border-slate-800 bg-slate-50/55 hover:bg-slate-100 dark:bg-slate-850 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 text-center transition duration-150 gap-2"
          aria-label="Contact manager"
        >
          <MessageSquare size={24} />
          <span className="text-xs font-semibold">Contact Manager</span>
        </a>

        {/* View Timeline */}
        <button
          onClick={() => {
            const el = document.getElementById('timeline-card');
            if (el) el.scrollIntoView({ behavior: 'smooth' });
          }}
          className="flex flex-col items-center justify-center p-4 rounded-2xl border border-slate-100 dark:border-slate-800 bg-slate-50/55 hover:bg-slate-100 dark:bg-slate-850 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 text-center transition duration-150 gap-2"
          aria-label="Scroll to timeline"
        >
          <List size={24} />
          <span className="text-xs font-semibold">View Timeline</span>
        </button>
      </div>
    </div>
  );
};

export default QuickActionsCard;
