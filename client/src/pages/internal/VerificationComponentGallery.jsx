import React, { useState } from 'react';
import { ShieldCheck, Sparkles, AlertTriangle, Layers } from 'lucide-react';
import {
  VerificationPageHeader,
  VerificationSectionCard,
  VerificationStatusBadge,
  VerificationBadge,
  TrustScoreBadge,
  ReviewLevelBadge,
  RiskFlagBadge,
  CircularProgress,
  MiniBarChart,
  MiniLineChart,
  FileUploader,
  DocumentUploadCard,
  DocumentPreviewCard,
  UploadProgressBar,
  UploadRequirementsCard,
  TrustScoreCard,
  TrustBreakdownCard,
  TrustHistoryMiniChart,
  VerificationProgressStepper,
  VerificationTimeline,
  VerificationProgressCard,
  VerificationSkeleton,
  VerificationEmptyState,
  VerificationErrorState,
  VerificationWidget,
  VerificationSummaryCard,
  ApprovalDialog,
  RejectDialog,
} from '../../components/verification';

export default function VerificationComponentGallery() {
  const [approvalModalOpen, setApprovalModalOpen] = useState(false);
  const [rejectModalOpen, setRejectModalOpen] = useState(false);
  const [stepperStep, setStepperStep] = useState(2);

  const sampleSteps = [
    { stepNumber: 1, title: 'Identity Proof' },
    { stepNumber: 2, title: 'Contact & Phone' },
    { stepNumber: 3, title: 'Address Proof' },
    { stepNumber: 4, title: 'Income Statement' },
  ];

  const sampleBreakdown = [
    { label: 'Identity Proof', score: 30, max: 30 },
    { label: 'Phone & Email', score: 15, max: 15 },
    { label: 'Employment Details', score: 15, max: 20 },
    { label: 'Clean Fraud Status', score: 10, max: 10 },
  ];

  const sampleHistory = [
    { value: 0 },
    { value: 30 },
    { value: 45 },
    { value: 70 },
    { value: 85 },
  ];

  const sampleTimeline = [
    { action: 'Verification Initiated', timestamp: new Date(), remarks: 'Draft created by user' },
    { action: 'Level 1 Automated Check Passed', timestamp: new Date(), remarks: 'Document formats validated' },
  ];

  return (
    <div className="min-h-screen bg-background p-6 sm:p-10 space-y-10">
      <VerificationPageHeader
        title="Verification Component Gallery"
        subtitle="Internal developer playground for UI, theme, and component verification"
        icon={Layers}
        breadcrumbs={[{ label: 'Internal Workspace', href: '#' }, { label: 'Verification Gallery' }]}
      />

      {/* 1. Badges & Indicators */}
      <VerificationSectionCard title="1. Badges & Indicators" subtitle="Status, Trust, Review, and Risk Badges">
        <div className="flex flex-wrap items-center gap-4">
          <VerificationStatusBadge status="APPROVED" />
          <VerificationStatusBadge status="PENDING" />
          <VerificationStatusBadge status="REJECTED" />
          <VerificationStatusBadge status="AUTO_REVIEW" />
          <VerificationBadge badge="GOLD" />
          <VerificationBadge badge="SILVER" />
          <VerificationBadge badge="PLATINUM" />
          <TrustScoreBadge score={85} />
          <ReviewLevelBadge level="LEVEL_2_MANAGER" />
          <RiskFlagBadge riskScore={10} />
          <RiskFlagBadge riskScore={65} manualReviewRequired={true} />
        </div>
      </VerificationSectionCard>

      {/* 2. Charts & Progress */}
      <VerificationSectionCard title="2. Chart Primitives & Steppers" subtitle="Circular Progress, Bar Chart, Line Chart">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-center">
          <div className="flex flex-col items-center">
            <CircularProgress value={85} size={90} strokeWidth={9}>
              <span className="text-sm font-black text-foreground">85%</span>
            </CircularProgress>
            <p className="text-xs font-bold text-muted-foreground mt-2">Circular Progress</p>
          </div>
          <div>
            <p className="text-xs font-bold text-muted-foreground mb-2">Mini Bar Chart</p>
            <MiniBarChart items={sampleBreakdown} />
          </div>
          <div>
            <p className="text-xs font-bold text-muted-foreground mb-2">Mini Line Chart Trend</p>
            <MiniLineChart dataPoints={sampleHistory} height={70} />
          </div>
        </div>

        <div className="mt-6 border-t border-border pt-6">
          <p className="text-xs font-bold text-muted-foreground mb-2">Progress Stepper Control</p>
          <VerificationProgressStepper steps={sampleSteps} currentStep={stepperStep} onStepClick={setStepperStep} />
        </div>
      </VerificationSectionCard>

      {/* 3. Cards & Visualizations */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <TrustScoreCard score={85} badge="GOLD" />
        <VerificationProgressCard completedStepsCount={2} totalStepsCount={4} verification={{ status: 'SUBMITTED' }} />
      </div>

      {/* 4. Document Components */}
      <VerificationSectionCard title="4. File Upload & Preview Cards" subtitle="Generic Uploader & Document Checklists">
        <div className="space-y-4">
          <FileUploader label="Upload Sample Document" hint="Drag and drop or select file" />
          <UploadProgressBar progress={65} label="Uploading identity_proof.pdf..." />
          <DocumentPreviewCard document={{ type: 'Passport / Govt ID', filename: 'passport.pdf', status: 'VERIFIED' }} />
          <UploadRequirementsCard requiredTypes={['Govt ID', 'Address Proof', 'Payslip']} uploadedTypes={['Govt ID']} />
        </div>
      </VerificationSectionCard>

      {/* 5. Widgets & Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <VerificationWidget widgetData={{ profile: 'MANAGER', status: 'SUBMITTED', trustScore: 85, pendingReviewCount: 3 }} />
        <VerificationSummaryCard verifiedCount={42} totalCount={50} />
      </div>

      {/* 6. Timeline */}
      <VerificationSectionCard title="6. Timeline Audit Log" subtitle="Timestamped event log">
        <VerificationTimeline timeline={sampleTimeline} />
      </VerificationSectionCard>

      {/* 7. States & Dialog Triggers */}
      <VerificationSectionCard title="7. Component States & Dialog Triggers" subtitle="Skeletons, Empty States, Modals">
        <div className="flex flex-wrap gap-4 mb-6">
          <button
            type="button"
            onClick={() => setApprovalModalOpen(true)}
            className="px-4 py-2 bg-emerald-500 text-white font-bold rounded-xl text-xs"
          >
            Open Approval Modal
          </button>
          <button
            type="button"
            onClick={() => setRejectModalOpen(true)}
            className="px-4 py-2 bg-rose-500 text-white font-bold rounded-xl text-xs"
          >
            Open Rejection Modal
          </button>
        </div>

        <VerificationSkeleton />
        <VerificationErrorState error="Sample component error handling box" />
        <VerificationEmptyState title="Sample Empty Verification" description="Demonstrating clean empty state component" />
      </VerificationSectionCard>

      <ApprovalDialog isOpen={approvalModalOpen} onClose={() => setApprovalModalOpen(false)} onConfirm={() => setApprovalModalOpen(false)} />
      <RejectDialog isOpen={rejectModalOpen} onClose={() => setRejectModalOpen(false)} onConfirm={() => setRejectModalOpen(false)} />
    </div>
  );
}
