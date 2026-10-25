import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Activity, Clock, ShieldCheck, History } from 'lucide-react';
import { useLanguage } from '../../context/LanguageContext';
import {
  VerificationPageHeader,
  VerificationTimeline,
  VerificationSectionCard,
  VerificationHistoryDrawer,
} from '../../components/verification';

import getVerificationMapper from '../../mappers/verificationMapperFactory';
import trackEvent, { VERIFICATION_EVENTS } from '../../utils/verificationAnalytics';

export default function TechnicianVerificationTimeline() {
  const { t } = useLanguage();
  const navigate = useNavigate();
  const mapper = getVerificationMapper('TECHNICIAN');

  const [events, setEvents] = useState([]);
  const [drawerOpen, setDrawerOpen] = useState(false);

  useEffect(() => {
    const timelineData = mapper.mapTimeline(null);
    setEvents(timelineData);
    trackEvent(VERIFICATION_EVENTS.TECHNICIAN_TIMELINE);
  }, []);

  return (
    <div className="p-6 sm:p-10 space-y-8">
      {/* Page Header */}
      <VerificationPageHeader
        title={t('technicianTimeline.title', 'Technician Audit Trail & Verification Timeline')}
        subtitle={t('technicianTimeline.subtitle', 'Chronological history of trade license submissions, background checks, and supervisor approvals')}
        icon={Activity}
        actionText={t('technicianTimeline.viewHistory', 'View History Revisions')}
        onAction={() => setDrawerOpen(true)}
      />

      {/* Color Legend Bar */}
      <div className="p-4 rounded-xl bg-slate-900 border border-slate-800 flex flex-wrap items-center justify-between gap-4">
        <span className="text-xs font-semibold text-slate-300 flex items-center gap-1.5">
          <Clock className="w-4 h-4 text-indigo-400" /> {t('technicianTimeline.eventClassification', 'Event Classification')}
        </span>
        <div className="flex items-center gap-6 text-xs">
          <span className="flex items-center gap-2 text-slate-300">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" /> {t('technicianTimeline.successApproval', 'Success & Approval')}
          </span>
          <span className="flex items-center gap-2 text-slate-300">
            <span className="w-2.5 h-2.5 rounded-full bg-amber-500" /> {t('technicianTimeline.pendingInReview', 'Pending & In-Review')}
          </span>
          <span className="flex items-center gap-2 text-slate-300">
            <span className="w-2.5 h-2.5 rounded-full bg-rose-500" /> {t('technicianTimeline.rejectionAlert', 'Rejection & Alert')}
          </span>
          <span className="flex items-center gap-2 text-slate-300">
            <span className="w-2.5 h-2.5 rounded-full bg-sky-500" /> {t('technicianTimeline.systemInfo', 'System Info')}
          </span>
        </div>
      </div>

      {/* Main Timeline Card */}
      <VerificationSectionCard title={t('technicianTimeline.auditLogTitle', 'Chronological Verification Audit Log')} icon={History}>
        <div className="py-4">
          <VerificationTimeline events={events} />
        </div>
      </VerificationSectionCard>

      {/* History Revisions Slide-Over Drawer */}
      <VerificationHistoryDrawer
        isOpen={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        history={events}
      />
    </div>
  );
}
