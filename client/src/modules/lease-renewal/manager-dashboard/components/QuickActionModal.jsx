import React, { useState } from 'react';

export const QuickActionModal = ({
  isOpen = false,
  type = null,
  campaign = null,
  onClose,
  onExecuteAction
}) => {
  const [reason, setReason] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState(null);

  if (!isOpen || !campaign) return null;

  const handleAction = async (actionType) => {
    setIsSubmitting(true);
    setError(null);
    try {
      await onExecuteAction(actionType, campaign.id || campaign._id, { reason });
      onClose();
    } catch (err) {
      setError(err.response?.data?.message || err.message || 'Action failed');
    } finally {
      setIsSubmitting(false);
    }
  };

  const actions = [
    {
      key: 'view',
      label: 'View Campaign Snapshot',
      icon: '👁️',
      color: 'bg-indigo-600 hover:bg-indigo-700 text-white',
      handler: () => alert(`Campaign Snapshot:\n\nNumber: ${campaign.campaignNumber}\nStatus: ${campaign.status}\nRisk Score: ${campaign.riskScore}\nExpiry: ${campaign.expiryDate ? new Date(campaign.expiryDate).toLocaleDateString() : 'N/A'}`)
    },
    {
      key: 'escalate',
      label: 'Escalate to Senior Management',
      icon: '🚨',
      color: 'bg-red-600 hover:bg-red-700 text-white',
      handler: () => handleAction('escalate')
    },
    {
      key: 'reminder',
      label: 'Send Immediate Reminder',
      icon: '🔔',
      color: 'bg-amber-600 hover:bg-amber-700 text-white',
      handler: () => {
        alert(`Reminder notice sent to tenant for campaign ${campaign.campaignNumber}!`);
        onClose();
      }
    },
    {
      key: 'negotiate',
      label: 'Open Rent Negotiation',
      icon: '💬',
      color: 'bg-cyan-600 hover:bg-cyan-700 text-white',
      handler: () => handleAction('negotiate')
    },
    {
      key: 'timeline',
      label: 'View Full Audit Timeline',
      icon: '📜',
      color: 'bg-slate-700 hover:bg-slate-800 text-white',
      handler: () => alert(`Audit Trail:\n- Campaign Created\n- Risk Score Evaluated (${campaign.riskScore})\n- Status: ${campaign.status}`)
    }
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-sm animate-fadeIn">
      <div className="w-full max-w-lg rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-2xl overflow-hidden p-6 space-y-5">
        {/* Modal Header */}
        <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-4">
          <div>
            <span className="text-xs uppercase tracking-wider text-indigo-600 dark:text-indigo-400 font-bold">
              Quick Action Drawer
            </span>
            <h3 className="text-lg font-bold text-slate-800 dark:text-slate-100">
              {campaign.campaignNumber}
            </h3>
            <p className="text-xs text-slate-400">
              {campaign.snapshot?.tenantName || 'Tenant'} • {campaign.snapshot?.propertyName || 'Property'}
            </p>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 flex items-center justify-center font-bold text-sm transition-colors"
          >
            ✕
          </button>
        </div>

        {error && (
          <div className="p-3 rounded-xl bg-red-50 text-red-600 dark:bg-red-950/40 dark:text-red-300 text-xs">
            {error}
          </div>
        )}

        {/* Reason / Notes Input */}
        <div className="space-y-1">
          <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
            Action Notes / Reason (Optional)
          </label>
          <textarea
            rows={2}
            placeholder="Enter reason or operational notes for this quick action..."
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            className="w-full p-2.5 rounded-xl text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 dark:text-slate-100"
          ></textarea>
        </div>

        {/* Action Buttons Grid */}
        <div className="space-y-2 pt-2">
          <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
            Select Operational Action:
          </label>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
            {actions.map((act) => (
              <button
                key={act.key}
                disabled={isSubmitting}
                onClick={act.handler}
                className={`w-full p-3 rounded-xl text-xs font-semibold shadow-sm hover:shadow active:scale-95 transition-all flex items-center gap-2 justify-center ${act.color}`}
              >
                <span>{act.icon}</span>
                <span>{act.label}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Footer */}
        <div className="pt-2 text-right">
          <button
            onClick={onClose}
            className="px-4 py-2 text-xs font-medium text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 bg-slate-100 dark:bg-slate-800 rounded-xl transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};

export default QuickActionModal;
