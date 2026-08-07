import React from 'react';
import { Activity } from 'lucide-react';
import { VerificationSectionCard, VerificationTimeline } from '../../../../components/verification';
import { MOCK_PROPERTY_TIMELINE } from '../../../../mocks/adminPropertyMock';

export default function PropertyTimelineTab({ property }) {
  return (
    <VerificationSectionCard title="Property Lifecycle Event Timeline" icon={Activity}>
      <VerificationTimeline
        events={MOCK_PROPERTY_TIMELINE.map((t) => ({
          action: t.title,
          timestamp: t.timestamp,
          colorType: t.category === 'Verification' ? 'success' : 'info',
          remarks: `Category: ${t.category} · Author: ${t.author}`,
        }))}
      />
    </VerificationSectionCard>
  );
}
