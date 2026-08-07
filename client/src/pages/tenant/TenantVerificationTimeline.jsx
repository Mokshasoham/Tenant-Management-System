import React, { useState } from 'react';
import { History, ShieldCheck } from 'lucide-react';
import { useVerificationContext } from '../../context/VerificationContext';
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
        title="Tenant Audit & Verification Timeline"
        subtitle="Immutable chronological history of document uploads, verification checks, status updates, and trust score changes"
        icon={History}
        breadcrumbs={[
          { label: 'Tenant Portal', href: '/dashboard' },
          { label: 'Verification Home', href: '/tenant/verification' },
          { label: 'Timeline & History' },
        ]}
        actionSlot={
          <Button variant="outline" onClick={handleOpenDrawer} className="text-xs">
            <History className="w-3.5 h-3.5 mr-1.5" />
            View History Drawer
          </Button>
        }
      />

      {/* Enhancement #16: Color Coding Legend Bar */}
      <div className="flex flex-wrap items-center gap-4 p-3 rounded-xl bg-muted/30 border border-border text-xs font-medium">
        <span className="text-muted-foreground font-bold">Event Legend:</span>
        <div className="flex items-center gap-1.5">
          <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
          <span>Success / Verified</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="w-2.5 h-2.5 rounded-full bg-amber-500" />
          <span>Pending / Saved</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="w-2.5 h-2.5 rounded-full bg-rose-500" />
          <span>Rejected / Alert</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="w-2.5 h-2.5 rounded-full bg-sky-500" />
          <span>Information / Action</span>
        </div>
      </div>

      <VerificationSectionCard title="Chronological Audit Log" subtitle={`Showing ${timelineEvents.length} recorded events`} icon={ShieldCheck}>
        {/* Enhancement #7: Contextual Empty State */}
        {timelineEvents.length === 0 ? (
          <VerificationEmptyState
            icon={History}
            title="No Timeline Activity"
            description="Your verification audit history will appear here once you start the verification process."
          />
        ) : (
          <VerificationTimeline timeline={timelineEvents} />
        )}
      </VerificationSectionCard>

      <VerificationHistoryDrawer isOpen={drawerOpen} onClose={() => setDrawerOpen(false)} history={[]} />
    </div>
  );
}
