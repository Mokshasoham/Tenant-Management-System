import React, { useState } from 'react';
import { History, ShieldCheck } from 'lucide-react';
import { useVerificationContext } from '../../context/VerificationContext';
import { useLanguage } from '../../context/LanguageContext';
import {
  VerificationPageHeader,
  VerificationSectionCard,
  VerificationTimeline,
  VerificationHistoryDrawer,
} from '../../components/verification';
import { Button } from '../../components/PremiumUI';

export default function ManagerVerificationTimeline() {
  const { t } = useLanguage();
  const { activeVerification } = useVerificationContext();
  const [drawerOpen, setDrawerOpen] = useState(false);

  const fullTimeline = activeVerification?.timeline || [
    {
      action: t('verification.profileRegistered', 'Profile Registered'),
      timestamp: new Date(Date.now() - 86400000 * 3),
      remarks: t('verification.managerAccountActive', 'Manager account active'),
    },
  ];

  return (
    <div className="p-6 sm:p-10 space-y-8">
      <VerificationPageHeader
        title={t('verification.managerAuditTitle', 'Manager Audit & Verification Timeline')}
        subtitle={t(
          'verification.managerAuditSubtitle',
          'Complete immutable log of all verification draft updates, document attachments, submissions, and review events'
        )}
        icon={History}
        breadcrumbs={[
          { label: t('nav.managerPortal', 'Manager Portal'), href: '/dashboard' },
          { label: t('verification.verificationHome', 'Verification Home'), href: '/manager/verification' },
          { label: t('verification.auditTimeline', 'Timeline & History') },
        ]}
        actionSlot={
          <Button variant="outline" type="button" onClick={() => setDrawerOpen(true)} className="text-xs">
            <History className="w-3.5 h-3.5 mr-1.5" />
            {t('verification.viewVersionHistory', 'View Version History Drawer')}
          </Button>
        }
      />

      <VerificationSectionCard
        title={t('verification.chronologicalAuditLog', 'Chronological Audit Log')}
        subtitle={t('verification.readOnlyLog', 'Read-only system log')}
        icon={ShieldCheck}
      >
        <VerificationTimeline timeline={fullTimeline} />
      </VerificationSectionCard>

      <VerificationHistoryDrawer isOpen={drawerOpen} onClose={() => setDrawerOpen(false)} history={[]} />
    </div>
  );
}
