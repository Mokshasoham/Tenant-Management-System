import VerificationStatusBadge from './badges/VerificationStatusBadge';
import VerificationBadge from './badges/VerificationBadge';
import TrustScoreBadge from './badges/TrustScoreBadge';
import ReviewLevelBadge from './badges/ReviewLevelBadge';
import RiskFlagBadge from './badges/RiskFlagBadge';
import CircularProgress from './charts/CircularProgress';
import MiniBarChart from './charts/MiniBarChart';
import MiniLineChart from './charts/MiniLineChart';
import FileUploader from './common/FileUploader';
import VerificationPageHeader from './common/VerificationPageHeader';
import VerificationSectionCard from './common/VerificationSectionCard';
import ReviewRemarksCard from './dialogs/ReviewRemarksCard';
import ApprovalDialog from './dialogs/ApprovalDialog';
import RejectDialog from './dialogs/RejectDialog';
import DocumentUploadCard from './documents/DocumentUploadCard';
import DocumentPreviewCard from './documents/DocumentPreviewCard';
import UploadProgressBar from './documents/UploadProgressBar';
import UploadRequirementsCard from './documents/UploadRequirementsCard';
import VerificationHistoryDrawer from './history/VerificationHistoryDrawer';
import TimelineItem from './history/TimelineItem';
import VerificationProgressStepper from './progress/VerificationProgressStepper';
import VerificationTimeline from './progress/VerificationTimeline';
import VerificationProgressCard from './progress/VerificationProgressCard';
import VerificationSkeleton from './states/VerificationSkeleton';
import VerificationEmptyState from './states/VerificationEmptyState';
import VerificationErrorState from './states/VerificationErrorState';
import VerificationLoadingOverlay from './states/VerificationLoadingOverlay';
import TrustScoreCard from './trust/TrustScoreCard';
import TrustBreakdownCard from './trust/TrustBreakdownCard';
import TrustHistoryMiniChart from './trust/TrustHistoryMiniChart';
import VerificationWidget from './widgets/VerificationWidget';
import VerificationSummaryCard from './widgets/VerificationSummaryCard';

/**
 * VerificationComponentRegistry
 * Dictionary mapping component string IDs to implementations.
 * Enables dynamic AI layout rendering and customization.
 */
export const VerificationComponentRegistry = {
  STATUS_BADGE: VerificationStatusBadge,
  VERIFICATION_BADGE: VerificationBadge,
  TRUST_BADGE: TrustScoreBadge,
  REVIEW_LEVEL_BADGE: ReviewLevelBadge,
  RISK_FLAG_BADGE: RiskFlagBadge,
  CIRCULAR_PROGRESS: CircularProgress,
  MINI_BAR_CHART: MiniBarChart,
  MINI_LINE_CHART: MiniLineChart,
  FILE_UPLOADER: FileUploader,
  PAGE_HEADER: VerificationPageHeader,
  SECTION_CARD: VerificationSectionCard,
  REVIEW_REMARKS_CARD: ReviewRemarksCard,
  APPROVAL_DIALOG: ApprovalDialog,
  REJECT_DIALOG: RejectDialog,
  DOCUMENT_UPLOAD_CARD: DocumentUploadCard,
  DOCUMENT_PREVIEW_CARD: DocumentPreviewCard,
  UPLOAD_PROGRESS_BAR: UploadProgressBar,
  UPLOAD_REQUIREMENTS_CARD: UploadRequirementsCard,
  HISTORY_DRAWER: VerificationHistoryDrawer,
  TIMELINE_ITEM: TimelineItem,
  PROGRESS_STEPPER: VerificationProgressStepper,
  TIMELINE: VerificationTimeline,
  PROGRESS_CARD: VerificationProgressCard,
  SKELETON: VerificationSkeleton,
  EMPTY_STATE: VerificationEmptyState,
  ERROR_STATE: VerificationErrorState,
  LOADING_OVERLAY: VerificationLoadingOverlay,
  TRUST_SCORE_CARD: TrustScoreCard,
  TRUST_BREAKDOWN_CARD: TrustBreakdownCard,
  TRUST_HISTORY_CHART: TrustHistoryMiniChart,
  WIDGET: VerificationWidget,
  SUMMARY_CARD: VerificationSummaryCard,
};

export default VerificationComponentRegistry;
