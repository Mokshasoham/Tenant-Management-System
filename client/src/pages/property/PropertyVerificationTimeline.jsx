import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { History, ShieldCheck } from 'lucide-react';
import { useVerificationContext } from '../../context/VerificationContext';
import { trackEvent, VERIFICATION_EVENTS } from '../../utils/verificationAnalytics';
import getVerificationMapper from '../../mappers/verificationMapperFactory';
import {
  VerificationPageHeader,
  VerificationSectionCard,
  VerificationTimeline,
  VerificationHistoryDrawer,
  VerificationEmptyState,
} from '../../components/verification';
import { Button } from '../../components/PremiumUI';

export default function PropertyVerificationTimeline() {
  const [searchParams] = useSearchParams();
  const propertyId = searchParams.get('propertyId') || '';
  const { activeVerification, loadPropertyVerification } = useVerificationContext();
  const [drawerOpen, setDrawerOpen] = useState(false);

  useEffect(() => {
    if (propertyId && String(activeVerification?.entityId) !== String(propertyId)) {
      loadPropertyVerification(propertyId);
    }
  }, [propertyId, activeVerification?.entityId, loadPropertyVerification]);

  const propertyMapper = getVerificationMapper('PROPERTY');
  const timelineEvents = propertyMapper.mapTimeline(activeVerification?.timeline);

  const handleOpenDrawer = () => {
    setDrawerOpen(true);
    trackEvent(VERIFICATION_EVENTS.PROPERTY_TIMELINE, { view: 'history_drawer' });
  };

  return (
    <div className="p-6 sm:p-10 space-y-8">
      <VerificationPageHeader
        title="Property Audit & Verification Timeline"
        subtitle="Chronological audit log of physical inspections, title searches, tax verification, and approval events"
        icon={History}
        breadcrumbs={[
          { label: 'Property Operations', href: '/properties' },
          {
            label: 'Property Verification',
            href: propertyId ? `/property/verification?propertyId=${propertyId}` : '/property/verification',
          },
          { label: 'Timeline & History' },
        ]}
        actionSlot={
          <Button variant="outline" onClick={handleOpenDrawer} className="text-xs">
            <History className="w-3.5 h-3.5 mr-1.5" />
            View History Drawer
          </Button>
        }
      />

      {/* Color Coding Legend Bar */}
      <div className="flex flex-wrap items-center gap-4 p-3 rounded-xl bg-muted/30 border border-border text-xs font-medium">
        <span className="text-muted-foreground font-bold">Event Legend:</span>
        <div className="flex items-center gap-1.5">
          <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
          <span>Success / Verified</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="w-2.5 h-2.5 rounded-full bg-amber-500" />
          <span>Pending / Scheduled</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="w-2.5 h-2.5 rounded-full bg-rose-500" />
          <span>Rejected / Issue</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="w-2.5 h-2.5 rounded-full bg-sky-500" />
          <span>Information / Created</span>
        </div>
      </div>

      <VerificationSectionCard title="Property Audit Log" subtitle={`Showing ${timelineEvents.length} recorded events`} icon={ShieldCheck}>
        {timelineEvents.length === 0 ? (
          <VerificationEmptyState
            icon={History}
            title="No Timeline Activity"
            description="Property audit events will appear here once verification is initiated."
          />
        ) : (
          <VerificationTimeline timeline={timelineEvents} />
        )}
      </VerificationSectionCard>

      <VerificationHistoryDrawer isOpen={drawerOpen} onClose={() => setDrawerOpen(false)} history={[]} />
    </div>
  );
}
