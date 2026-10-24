import React, { useState } from 'react';
import { History, ShieldCheck } from 'lucide-react';
import { useVerificationContext } from '../../context/VerificationContext';
import { useLanguage } from '../../context/LanguageContext';
import { trackEvent, VERIFICATION_EVENTS } from '../../utils/verificationAnalytics';
import { mapTimeline } from '../../mappers/tenantVerificationMapper';
import {
  VerificationPageHeader,
  VerificationSectionCard,
  VerificationTimeline,
  VerificationHistoryDrawer,
  VerificationEmptyState,
} from '../../components/verification';
import { Button } from '../../components/PremiumUI';

export default function TenantVerificationTimeline() {
  const { t } = useLanguage();
  const { activeVerification } = useVerificationContext();
  const [drawerOpen, setDrawerOpen] = useState(false);

  const timelineEvents = mapTimeline(activeVerification?.timeline);

  const handleOpenDrawer = () => {
    setDrawerOpen(true);
    trackEvent(VERIFICATION_EVENTS.TIMELINE_VIEWED, { view: 'history_drawer' });
  };

  return (
    <div className="p-6 sm:p-10 space-y-8">
      <VerificationPageHeader
        title={t('verification.timelineHeaderTitle', 'Tenant Audit & Verification Timeline')}
        subtitle={t('verification.timelineHeaderSubtitle', 'Immutable chronological history of document uploads, verification checks, status updates, and trust score changes')}
        icon={History}
        breadcrumbs={[
          { label: t('verification.tenantPortal', 'Tenant Portal'), href: '/dashboard' },
          { label: t('verification.verificationHome', 'Verification Home'), href: '/tenant/verification' },
          { label: t('verification.auditTimeline', 'Timeline & History') },
        ]}
        actionSlot={
          <Button variant="outline" onClick={handleOpenDrawer} className="text-xs">
            <History className="w-3.5 h-3.5 mr-1.5" />
            {t('verification.viewHistoryDrawer', 'View History Drawer')}
          </Button>
        }
      />

      {/* Enhancement #16: Color Coding Legend Bar */}
      <div className="flex flex-wrap items-center gap-4 p-3 rounded-xl bg-muted/30 border border-border text-xs font-medium">
        <span className="text-muted-foreground font-bold">{t('verification.eventLegend', 'Event Legend:')}</span>
        <div className="flex items-center gap-1.5">
          <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
          <span>{t('verification.legendSuccess', 'Success / Verified')}</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="w-2.5 h-2.5 rounded-full bg-amber-500" />
          <span>{t('verification.legendPending', 'Pending / Saved')}</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="w-2.5 h-2.5 rounded-full bg-rose-500" />
          <span>{t('verification.legendRejected', 'Rejected / Alert')}</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="w-2.5 h-2.5 rounded-full bg-sky-500" />
          <span>{t('verification.legendInfo', 'Information / Action')}</span>
        </div>
      </div>

      <VerificationSectionCard 
        title={t('verification.chronologicalAuditLog', 'Chronological Audit Log')} 
        subtitle={t('verification.showingRecordedEvents', 'Showing {count} recorded events', { count: timelineEvents.length })} 
        icon={ShieldCheck}
      >
        {/* Enhancement #7: Contextual Empty State */}
        {timelineEvents.length === 0 ? (
          <VerificationEmptyState
            icon={History}
            title={t('verification.noTimelineActivity', 'No Timeline Activity')}
            description={t('verification.noTimelineDesc', 'Your verification audit history will appear here once you start the verification process.')}
          />
        ) : (
          <VerificationTimeline timeline={timelineEvents} />
        )}
      </VerificationSectionCard>

      <VerificationHistoryDrawer isOpen={drawerOpen} onClose={() => setDrawerOpen(false)} history={[]} />
    </div>
  );
}
