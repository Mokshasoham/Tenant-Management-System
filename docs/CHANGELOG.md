# Project Changelog — MERN Tenant Management System

All notable changes to the Enterprise Tenant Management System & Demo Verification & Trust Platform will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/), and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

---

## [Unreleased] — Phase 5.2 (Planned)
### Planned
- Portal-specific verification pages (`TenantVerificationPage`, `ManagerVerificationPage`, `TechnicianVerificationPage`, `AdminVerificationCenterPage`).
- Routing integration for role-based verification portals.

---

## [1.5.0] — 2026-08-07 — Phase 5.1 Verification UI Foundation
### Added
- **Feature Flag Service**: `client/src/services/FeatureFlagService.js` and `client/src/config/featureFlags.js` supporting dynamic Demo vs Production toggles.
- **Route Constants**: `client/src/constants/routes/verificationRoutes.js` for centralized frontend routing paths.
- **Permission Helpers**: `client/src/utils/verificationPermissions.js` (`canUpload`, `canSubmit`, `canApprove`, `canReject`, `canReviewLevel2`, `canViewHistory`, `canEditDraft`, `canResubmit`).
- **Shared Verification Components** (35 components under `client/src/components/verification/`):
  - **Badges**: `VerificationStatusBadge`, `VerificationBadge`, `TrustScoreBadge`, `ReviewLevelBadge`, `RiskFlagBadge`.
  - **Charts**: `CircularProgress`, `MiniBarChart`, `MiniLineChart`.
  - **Common**: `FileUploader`, `VerificationPageHeader`, `VerificationSectionCard`.
  - **Progress**: `VerificationProgressStepper`, `VerificationTimeline`, `VerificationProgressCard`.
  - **Documents**: `DocumentUploadCard`, `DocumentPreviewCard`, `UploadProgressBar`, `UploadRequirementsCard`.
  - **Trust Score**: `TrustScoreCard`, `TrustBreakdownCard`, `TrustHistoryMiniChart`.
  - **Dialogs**: `ReviewRemarksCard`, `ApprovalDialog`, `RejectDialog`.
  - **History**: `VerificationHistoryDrawer`, `TimelineItem`.
  - **States**: `VerificationSkeleton`, `VerificationEmptyState`, `VerificationErrorState`, `VerificationLoadingOverlay`.
  - **Widgets**: `VerificationWidget`, `VerificationSummaryCard`.
  - **Barrel & Registry**: `index.js` and `VerificationComponentRegistry.js`.
- **Context & Custom Hooks**:
  - `VerificationContext.jsx`: State container caching active verification, templates, workflows, and widgets.
  - `useVerification.js`, `useTrustScore.js`, `useVerificationUpload.js`.
- **Utilities & Validators**:
  - `documentIcons.jsx`: `getDocumentIcon(type)`.
  - `verificationApiErrors.js`: Localized HTTP error code mapper (400, 401, 403, 404, 409, 422, 500).
  - `verificationHelpers.js`, `trustScoreHelpers.js`, `documentHelpers.js`.
  - `verificationValidators.js`.
- **Design Tokens & Animations**:
  - `client/src/styles/verificationTheme.js` (Master design tokens for colors, spacing, radius, shadows, typography, transitions, zIndex).
  - `client/src/styles/verificationAnimations.js` (Framer Motion variants).
- **Internal Developer Workspace**:
  - `client/src/pages/internal/VerificationComponentGallery.jsx` mounted at `/dev/verification-gallery`.

### Test Results & Build Status
- **Client Production Build**: Passed in 20.86s (`0 errors`).
- **Server Unit Tests**: 100% Passed (14/14 tests in 3.87s).
- **Git Commit**: `516255aa9fbf99893c6ab080e957b5605ec526ce`

---

## [1.4.0] — 2026-08-07 — Phase 4 HTTP Controllers, Routes & RBAC
### Added
- **`verificationController.js`**: 14 HTTP handler functions strictly delegating to `verificationService`.
- **`verificationRoutes.js`**: Route definitions mounted under `/api/verifications`, `/api/verification`, and `/api/v1/verifications`.
- **RBAC Guards**: Restricts level-3 decisions to `admin`, level-2 reviews to `manager`/`admin`, and enforces ownership checks on self-service endpoints.
- **Integration Test Suite**: `server/tests/unit/verification/verificationPhase4.test.js`.

### Test Results & Build Status
- **Server Unit Tests**: 100% Passed (48/48 tests across 9 test suites).
- **Client Production Build**: Passed in 26.49s (`0 errors`).
- **Git Commit**: `2a84cc0c5125d5fe8fd9c4dcf55217829a9d411d`

---

## [1.3.0] — 2026-08-07 — Phase 3 Repository & Service Layer
### Added
- **`verificationRepository.js`**: Mongo data-access layer for `Verification`, `TrustScoreHistory`, `VerificationWorkflow`, `VerificationDocumentTemplate`. Implements soft-delete filter guards (`isDeleted: false`).
- **`trustScoreService.js`**: Trust score calculator (0-100), 7-part breakdown builder, append-only score history ledger recorder, and User cache sync.
- **`verificationService.js`**: Core business engine for verification lifecycle (`initiate`, `submit`, `resubmit`, `evaluateRisk`, `runAutoReview`, `managerReview`, `adminApprove`, `adminReject`, `generateVerificationNumber`).
- **Unit Test Suite**: `server/tests/unit/verification/verificationPhase3.test.js`.

### Test Results & Build Status
- **Server Unit Tests**: 100% Passed (44/44 tests).
- **Git Commit**: `1a62773afba22eab29544723268e1c3f626aa832`

---

## [1.2.0] — 2026-08-07 — Phase 2 Data Models & Schema Extensions
### Added
- **`Verification.js`**: Schema featuring human-readable sequence (`VRF-YYYY-XXXXXX`), versioning (`submissionVersion`, `previousVersionId`, `isLatestVersion`), review levels, timeline, fraud flags, and SLA tracking.
- **`TrustScoreHistory.js`**: Append-only score ledger with embedded breakdown struct.
- **User Schema Extension**: 13 additive fields in `User.js` (`currentTrustScore`, `verificationBadge`, `verificationStatus`, etc.).
- **Property Schema Extension**: 6 additive fields in `Property.js` (`verificationStatus`, `verificationLevel`, etc.).

### Test Results & Build Status
- **Git Commit**: `41b3e31`

---

## [1.1.0] — 2026-08-07 — Phase 1 Foundations & Defaults
### Added
- Configuration keys in `config.js` (`DEMO_MODE`, `ENGINE_VERSION`, `VERIFICATION_OTP_MODE`, `RISK_THRESHOLD`).
- Domain event types in `eventTypes.js` (`VERIFICATION` block).
- Audit helper `logVerificationAudit()` in `auditService.js`.
- Configurable models: `VerificationDocumentTemplate.js` and `VerificationWorkflow.js`.
- Idempotent seed runner `verificationSeed.js` registered in `index.js`.

### Test Results & Build Status
- **Git Commit**: `b54e03d`
