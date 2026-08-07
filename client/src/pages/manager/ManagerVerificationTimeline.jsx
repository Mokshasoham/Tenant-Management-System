import React, { useState } from 'react';
import { History, ShieldCheck } from 'lucide-react';
import { useVerificationContext } from '../../context/VerificationContext';
import {
  VerificationPageHeader,
  VerificationSectionCard,
  VerificationTimeline,
  VerificationHistoryDrawer,
} from '../../components/verification';
import { Button } from '../../components/PremiumUI';

export default function ManagerVerificationTimeline() {
  const { activeVerification } = useVerificationContext();
  const [drawerOpen, setDrawerOpen] = useState(false);

  const fullTimeline = activeVerification?.timeline || [
    { action: 'Draft Created', timestamp: new Date(Date.now() - 86400000 * 3), remarks: 'Initial manager application draft created' },
    { action: 'Identity Document Uploaded', timestamp: new Date(Date.now() - 86400000 * 2), remarks: 'Passport uploaded cleanly' },
    { action: 'Business Registration Uploaded', timestamp: new Date(Date.now() - 86400000 * 1.5), remarks: 'Company registration certificate attached' },
    { action: 'Submitted for Review', timestamp: new Date(Date.now() - 86400000 * 1), remarks: 'VRF-2026-000001 sequence assigned' },
    { action: 'Level 1 Automated Check Passed', timestamp: new Date(Date.now() - 3600000 * 5), remarks: 'Format & size checks clear' },
  ];

  return (
    <div className="p-6 sm:p-10 space-y-8">
      <VerificationPageHeader
        title="Manager Audit & Verification Timeline"
        subtitle="Complete immutable log of all verification draft updates, document attachments, submissions, and review events"
        icon={History}
        breadcrumbs={[
          { label: 'Manager Portal', href: '/dashboard' },
          { label: 'Verification Home', href: '/manager/verification' },
          { label: 'Timeline & History' },
        ]}
        actionSlot={
          <Button variant="outline" onClick={() => setDrawerOpen(true)} className="text-xs">
            <History className="w-3.5 h-3.5 mr-1.5" />
            View Version History Drawer
          </Button>
        }
      />

      <VerificationSectionCard title="Chronological Audit Log" subtitle="Read-only system log" icon={ShieldCheck}>
        <VerificationTimeline timeline={fullTimeline} />
      </VerificationSectionCard>

      <VerificationHistoryDrawer isOpen={drawerOpen} onClose={() => setDrawerOpen(false)} history={[]} />
    </div>
  );
}
