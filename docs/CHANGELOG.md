# Project Changelog — MERN Tenant Management System

All notable changes to the Enterprise Tenant Management System & Demo Verification & Trust Platform will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/), and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

---

## [Unreleased] — Phase 5.2 (Planned)
### Planned
- Portal-specific verification pages (`TenantVerificationPage`, `ManagerVerificationPage`, `TechnicianVerificationPage`, `AdminVerificationCenterPage`).
- Routing integration for role-based verification portals.

---

## [2.2.0] — 2026-08-07 — Phase 6.1 Enterprise Property Inspection Workspace
### Added
- **Future-Proof Role Navigation Helper**: `client/src/utils/propertyNavigationHelper.js` exporting `handleViewPropertyNavigation({ navigate, property, role, mode })` delegating Admin users to `/admin/property/:propertyId` and Tenants/Managers to `/properties/:id`.
- **Preserved Browse Properties Page**: Kept `client/src/pages/BrowsePropertiesPage.jsx` 100% visually identical while delegating card click handlers to `handleViewPropertyNavigation`.
- **360° Enterprise Property Inspection Workspace**: Created `client/src/pages/admin/property/AdminPropertyInspection.jsx` mounted at `/admin/property/:propertyId` featuring Activity Ribbon chips, Status Banner, Quick Stats bar, high-risk admin action confirmation modal with mandatory audit reason logging, and inspection scheduler.
- **9 Lazy-Loaded Workspace Tabs (`React.lazy` + `Suspense`)**:
  - `PropertyOverviewTab.jsx`: Property gallery, specs, specs grid, owner/manager profiles.
  - `PropertyVerificationTab.jsx`: Verification status, review level, priority, checklist, Triple Metrics (`Trust 92`, `Health 88`, `Compliance 94%`).
  - `PropertyDocumentsTab.jsx`: Grouped document repository (`Ownership`, `Tax`, `Insurance`, `Safety`, `Utilities`, `Inspection`) with version history, expiry, uploaded/verified metadata.
  - `PropertyTimelineTab.jsx`: Categorized lifecycle event log.
  - `PropertyLeaseHistoryTab.jsx`: Past tenants, lease duration, rent changes, vacancy, security deposit records.
  - `PropertyMaintenanceTab.jsx`: Maintenance tickets, AMC contracts, repair expenses.
  - `PropertyCommunicationsTab.jsx`: Internal manager, tenant, and compliance notes stream.
  - `PropertyAuditTab.jsx`: Compliance audit log table with IP and session telemetry.
  - `PropertyReportsTab.jsx`: Report cards with Preview, Download, and Share options.
- **Future Production API Hooks**: 8 disabled integration cards for `OCR Verification`, `AI Document Validation`, `Fraud Engine`, `Land Registry`, `Government APIs`, `Fire NOC Board`, `Utility Board`, `Drone GIS`.

### Test Results & Build Status
- **Client Production Build**: Passed cleanly in 25.16s (`0 errors`) with clean code-split chunks for all 9 lazy-loaded workspace tabs.
- **Server Unit Tests**: 100% Passed (14/14 tests in 3.70s).

---

## [2.1.0] — 2026-08-07 — Phase 6.1 Enterprise Property Directory
### Added
- **Independent Admin Directory Page**: Created `client/src/pages/admin/directory/AdminPropertyDirectory.jsx` mounted at `/admin/property-directory` while leaving `BrowsePropertiesPage.jsx` 100% untouched to prevent regressions in public/tenant property browsing.
- **Centralized Directory Infrastructure**: `client/src/mocks/adminPropertyDirectoryMock.js` and `client/src/mappers/adminPropertyDirectoryMapper.js` supplying directory stats, risk summaries, reviewer workloads, smart alerts, saved searches, and 18 enriched property objects.
- **Modular Component Architecture**: 10 dedicated components under `client/src/pages/admin/directory/components/`:
  - `SmartAlertsBar.jsx`: Collapsible smart alert notification banner (`3 SLA Breached`, `2 Duplicates`, `5 Expiring Docs`, `1 Missed Inspection`, `4 Ready Approval`).
  - `ReviewerWorkloadBar.jsx`: Collapsible compliance officer workload strip (Alex: 32, Sarah: 18, David: 12).
  - `RiskOverviewBar.jsx`: Collapsible risk summary bar (Critical: 2, High: 6, Medium: 8, Low: 22).
  - `BulkActionsToolbar.jsx`: Checkbox multi-select toolbar (`Verify`, `Suspend`, `Assign`, `Archive`, `Mark Reviewed`, `Generate Report`, `Download Docs`, `Export CSV/Excel/PDF`).
  - `ManagerPortfolioPopover.jsx`: Hover/Click manager profile popover showing portfolio size, manager trust score, and average response time.
  - `RelatedPropertiesDrawer.jsx`: Contextual drawer tracking related properties (`Same Owner`, `Same Manager`, `Same Society`, `Same Builder`, `Nearby`).
  - `PropertyInspectionModal.jsx`: 360° Property Inspection Modal with 11 tabs (`Overview`, `Documents`, `Checklist`, `Timeline`, `Maintenance`, `Lease History`, `Compliance`, `Inspection History`, `Audit`, `Reports`, `Notes`).
  - `PropertyComparisonModal.jsx`: Side-by-side comparison matrix for 2 to 4 properties.
  - `PropertyGridView.jsx`: Preserved property grid displaying Admin Cards with **Triple Metrics** (`Trust 92`, `Health 88`, `Compliance 94%`), Status lifecycle badge, SLA timer, Duplicate alert tag, Priority badge, and Admin CTAs.
  - `PropertyMapView.jsx`: Interactive map side panel with GIS controls (`Locate Me`, `Reset View`, `Fit All`, `Full Screen`), Marker Color Legend (🟢 Verified, 🟡 Pending, 🔴 High Risk, 🔵 Occupied, 🟣 Premium, ⚫ Suspended), cluster labels with Avg Trust, Smart Popup, and Quick Hover Preview Card.
- **Navigation & Integration**: Added `Property Directory` menu item (`/admin/property-directory`) for `admin` role in `Sidebar.jsx`, registered route in `App.jsx`.

### Test Results & Build Status
- **Client Production Build**: Passed cleanly in 29.58s (`0 errors`).
- **Server Unit Tests**: 100% Passed (14/14 tests in 5.35s).
- **Git Commit**: Implemented without touching tenant/manager property browsing.

---

## [2.0.0] — 2026-08-07 — Phase 5.6 Enterprise Admin Verification Center
### Added
- **Centralized Admin Mock & Mapper**: `client/src/mocks/adminVerificationMock.js` (11 normalized datasets) and `client/src/mappers/adminVerificationMapper.js` registered under key `ADMIN` in `verificationMapperFactory.js`.
- **Enterprise Verification Control Room**: `client/src/pages/admin/verification/AdminVerificationDashboard.jsx` mounted at `/admin/verification` featuring 8 Top KPI cards, State-Driven Notification Banner, Quick Action tools, Pending Review Queue preview, High Risk Escalation Queue, Expiring Documents Watchlist, Live Verification Audit Log stream, and 5 future production hooks (`AI Document Validation`, `OCR Extraction Engine`, `Automated Fraud Engine`, `Background Screening`, `Auto-Assign Engine`).
- **Multi-Criteria Review Queue**: `client/src/pages/admin/verification/AdminVerificationQueue.jsx` mounted at `/admin/verification/queue` featuring 7 Saved Filter Views (`All Requests`, `My Reviews`, `Pending Today`, `High Risk`, `SLA Breached`, `Rejected Today`, `Awaiting Level 3`), multi-criteria filtering by entity, status, risk, reviewer assignment, search, enterprise data table with select all / checkboxes, bulk approve, bulk reject, reviewer assignment toolbar, CSV export, and PDF report generator.
- **Modular 360° Review Workspace**: `client/src/pages/admin/verification/AdminVerificationDetails.jsx` mounted at `/admin/verification/:id` featuring modular internal tabs (`Overview`, `Documents`, `Trust Score`, `Timeline`, `Risk Analysis`, `Review History`, `Actions & Case Notes`), `Download Verification Report` PDF CTA, reviewer assignment toolbar, interactive `ApprovalDialog` and `RejectDialog`, and **Internal Case Notes Timeline** (timestamped reviewer collaboration hidden from applicant).
- **Executive Analytics & Compliance Insights**: `client/src/pages/admin/verification/AdminVerificationAnalytics.jsx` mounted at `/admin/verification/analytics` featuring SLA compliance gauges (96.2%), processing time telemetry, weekly submission throughput bar charts, entity type distribution progress bars, top rejection reasons Pareto breakdown, and risk matrix.
- **Verification Engine Settings**: `client/src/pages/admin/verification/AdminVerificationSettings.jsx` mounted at `/admin/verification/settings` featuring active workflow configuration table, document template list, SLA target timers (Level 1: 4h, Level 2: 24h, Level 3: 48h), and 8 production feature flag toggles.
- **Compliance Audit Center**: `client/src/pages/admin/verification/AdminVerificationAudit.jsx` mounted at `/admin/verification/audit` featuring immutable audit log table, IP/session telemetry, search/filters, CSV export, and PDF report export.
- **Sidebar & Route Integration**: Added `Verification Center` menu item (`/admin/verification`) for `admin` role in `Sidebar.jsx`, registered 6 routes under `AdminRoute` + `DashboardLayout` in `App.jsx`.

### Test Results & Platform Status
- **Client Production Build**: Passed cleanly in 39.64s (`0 errors`).
- **Server Unit Tests**: 100% Passed (14/14 tests in 7.88s).
- **Platform Milestone**: Completes the 6-Phase Verification & Trust Platform (Phase 5.1 UI Foundation, Phase 5.2 Manager Portal, Phase 5.3 Tenant Portal, Phase 5.4 Property Portal, Phase 5.5 Technician Portal, Phase 5.6 Admin Verification Center).

---

## [1.9.0] — 2026-08-07 — Phase 5.5 Technician Verification Portal
### Added
- **Reusable Portal Layout Component**: `client/src/components/verification/common/VerificationPortalLayout.jsx` standardizing the 7-tier dashboard structure (`header`, `notification`, `hero`, `widget`, `actions`, `content`, `integrations`) across all verification portals. Re-exported in `components/verification/index.js`.
- **Centralized Technician Mock Module**: `client/src/mocks/technicianVerificationMock.js` exporting 11 normalized technician datasets.
- **Technician Mapper & Factory Integration**: `client/src/mappers/technicianVerificationMapper.js` registered under `TECHNICIAN` in `verificationMapperFactory.js`.
- **Technician Verification Dashboard Home**: `client/src/pages/technician/TechnicianVerificationPage.jsx` mounted at `/technician/verification` featuring State-Driven Notification Banner, Status Card with Technician Verification Level (`Registered`, `Verified`, `Professional`, `Elite`), Technician Trust Hero ("Professional Technician · 91/100 · Top Rated · Gold Technician"), Professional Summary, Readiness Widget, 4 Quick Actions, Professional Skills Grid, Certification & Trade Clearance Summary, Renewal Lifecycle with **Renewal History Array**, Operating Hours, and 4 Future Production Hooks (`NSDC Skill API`, `Police Clearance DB`, `Liability Insurance API`, `Trade License Portal`).
- **Technician Verification Wizard**: `client/src/pages/technician/TechnicianVerificationWizard.jsx` with 6 steps (Personal Details → Professional Details → Professional Documents → Skills & Portfolio → Review → Submit), photo upload, 25-second background autosave, `localStorage` draft restore, `beforeunload` unsaved changes warning, save status indicator, and mobile-friendly vertical stepper + sticky bottom bar.
- **Categorized Technician Document Workspace**: `client/src/pages/technician/TechnicianVerificationDocuments.jsx` with 5 KPI summary counters (`Uploaded`, `Pending`, `Rejected`, `Expired`, `Missing`), 8 category filter tabs (`ALL`, `IDENTITY`, `CERTIFICATES`, `LICENSE`, `EXPERIENCE`, `PORTFOLIO`, `INSURANCE`, `OTHER`), document cards with `Replace File` CTA, and empty states.
- **Color-Coded Technician Audit Timeline**: `client/src/pages/technician/TechnicianVerificationTimeline.jsx` displaying 15 enriched technician audit events color-coded by event type (🟢 Success, 🟡 Pending, 🔴 Rejected, 🔵 Info) with legend bar and history drawer.
- **Technician Trust Analytics**: `client/src/pages/technician/TechnicianTrustScorePage.jsx` featuring "Why is my score 91?" line-item breakdown table, score category progress bars, and actionable trade improvement tips.
- **Sidebar & Route Integration**: Added `Technician Verification` nav item (`/technician/verification`) for technician role in `Sidebar.jsx`, registered 5 routes in `App.jsx` under `ProtectedRoute` and `DashboardLayout`.

### Test Results & Build Status
- **Client Production Build**: Passed cleanly in 33.13s (`0 errors`).
- **Server Unit Tests**: 100% Passed (14/14 tests in 7.85s).
- **Git Commit**: `912e21f`

---

## [1.8.0] — 2026-08-07 — Phase 5.4 Property Verification Portal
### Added
- **Centralized Property Mock Module**: `client/src/mocks/propertyVerificationMock.js` exporting 10 normalized property datasets.
- **Property Mapper & Factory Integration**: `client/src/mappers/propertyVerificationMapper.js` registered under `PROPERTY` in `verificationMapperFactory.js`.
- **Property Verification Dashboard Home**: `client/src/pages/property/PropertyVerificationPage.jsx` mounted at `/property/verification` featuring State-Driven Notification Banner, Status Card with Property Verification Level (`Basic Property`, `Verified Property`, `Premium Property`, `Certified Property`) & Level Progression Requirements, Property Trust Hero ("Verified Property · 88/100 · Top Rated"), Property Quality Card, Property Health Completeness Gauge (`92%`), Google Security-style Verification Widget, Renewal Lifecycle with **Renewal History Array**, Property Specs Summary, and 6 Future Production Hooks (`Land Registry`, `Property Tax`, `Geo Verification`, `Building Safety`, `Utility Board`, `Fire NOC`).
- **Property Verification Wizard**: `client/src/pages/property/PropertyVerificationWizard.jsx` with 6 steps (Property Details → Ownership Details → Property Documents → Property Photos → Review → Submit), **8 Ownership Categories** (`Individual Owner`, `Company`, `Builder`, `Housing Society`, `Property Management Company`, `Government`, `Trust`, `Inherited Property`), photo upload with canvas compression (`compressImage`), 25-second autosave, `localStorage` draft restore, `beforeunload` unsaved changes warning, save status indicator, and mobile-friendly vertical stepper + sticky bottom bar.
- **Categorized Property Document Workspace**: `client/src/pages/property/PropertyVerificationDocuments.jsx` with 5 KPI summary counters (`Uploaded`, `Pending`, `Rejected`, `Expired`, `Missing`), 8 category filter tabs (`ALL`, `OWNERSHIP`, `LEGAL`, `TAX`, `UTILITY`, `PHOTOS`, `SAFETY`, `OTHER`), document cards with `Replace Deed` CTA, and empty states.
- **Color-Coded Property Audit Timeline**: `client/src/pages/property/PropertyVerificationTimeline.jsx` displaying 15 enriched property lifecycle events color-coded by event type (🟢 Success, 🟡 Pending, 🔴 Rejected, 🔵 Info) with legend bar and history drawer.
- **Property Trust & Health Analytics**: `client/src/pages/property/PropertyTrustScorePage.jsx` featuring "Why is my score 88?" line-item breakdown table, Property Health Completeness Card (`92%`), 6-month score evolution chart, category breakdown, and safety NOC improvement tips.
- **Sidebar & Route Integration**: Added `Property Verification` nav item (`/property/verification`) to manager/admin menu in `Sidebar.jsx`, registered 5 routes in `App.jsx` under `ManagerRoute` and `DashboardLayout`.

### Test Results & Build Status
- **Client Production Build**: Passed in 34.70s (`0 errors`).
- **Server Unit Tests**: 100% Passed (14/14 tests in 9.01s).
- **Git Commit**: `622af73323f14fcd44bc3979a310505a9e740200`

---

## [1.7.0] — 2026-08-07 — Phase 5.3 Tenant Verification Portal
### Added
- **Centralized Mock Data Module**: `client/src/mocks/tenantVerificationMock.js` exporting 10 normalized datasets as single source of truth.
- **Centralized Analytics Wrapper**: `client/src/utils/verificationAnalytics.js` exporting `trackEvent()` utility and `VERIFICATION_EVENTS` constants.
- **Data Transformation Mapper**: `client/src/mappers/tenantVerificationMapper.js` mapping raw/mock payloads to UI domain models.
- **Tenant Verification Dashboard Home**: `client/src/pages/tenant/TenantVerificationPage.jsx` at `/tenant/verification` featuring Notification Banner, Status Card with Tenant Verification Level (`Basic`, `Trusted`, `Premium`, `Elite`), Trust Score Hero ("Excellent Tenant · 72/100 · Top 18%"), Rental Reputation Card, Google Security-style Verification Widget, Renewal Lifecycle, Profile Summary, and Future Production Hooks (`DigiLocker`, `Face Verification`, `Video KYC`, `Background Check`, `Employer Check`).
- **Tenant Verification Wizard**: `client/src/pages/tenant/TenantVerificationWizard.jsx` with 6 steps (Personal Info → Contact & References → Identity Docs → Address Proof → Review → Submit), editable References list, 25-second autosave, `localStorage` auto-restore, `beforeunload` unsaved changes warning, save status indicator, step progress text, and mobile-friendly vertical stepper + sticky bottom bar.
- **Categorized Document Workspace**: `client/src/pages/tenant/TenantVerificationDocuments.jsx` with 5 KPI summary counters (`Uploaded`, `Pending`, `Rejected`, `Expired`, `Missing`), 8 category tabs (`ALL`, `IDENTITY`, `ADDRESS`, `EMPLOYMENT`, `INCOME`, `FINANCIAL`, `REFERENCES`, `OTHER`), document cards with `Replace File` CTA, and empty states.
- **Color-Coded Audit Timeline**: `client/src/pages/tenant/TenantVerificationTimeline.jsx` displaying 12+ enriched events color-coded by type (🟢 Success, 🟡 Pending, 🔴 Rejected, 🔵 Info) with legend bar and history drawer.
- **Trust Score & Credibility Analytics**: `client/src/pages/tenant/TenantTrustScorePage.jsx` featuring "Why is my score 72?" line-item breakdown table + penalties, score evolution trend chart, category breakdown, and actionable improvement tips.
- **Sidebar & Route Integration**: Added `Verification` nav item (`/tenant/verification`) to tenant menu in `Sidebar.jsx`, registered 5 routes in `App.jsx` under `ProtectedRoute` and `DashboardLayout`.

### Test Results & Build Status
- **Client Production Build**: Passed in 45.14s (`0 errors`).
- **Server Unit Tests**: 100% Passed (14/14 tests in 9.17s).
- **Git Commit**: `80c5bd33dd82bc9bec3f538ce5abbbd6ae046b1f`

---

## [1.6.0] — 2026-08-07 — Phase 5.2 Manager Verification Portal
### Added
- **Manager Verification Dashboard Home**: `client/src/pages/manager/ManagerVerificationPage.jsx` mounted at `/manager/verification` as permanent verification home with VRF status, trust score, badge tier, required docs summary, quick navigation, and state-driven actions (`UNVERIFIED`, `DRAFT`, `SUBMITTED`, `AUTO_REVIEW`, `MANAGER_REVIEW`, `ADMIN_REVIEW`, `APPROVED`, `REJECTED`).
- **Manager Verification Wizard**: `client/src/pages/manager/ManagerVerificationWizard.jsx` with 6-step progress stepper (Profile → Business → Identity Docs → Business Docs → Review → Submit) and 25-second background autosave.
- **Categorized Document Workspace**: `client/src/pages/manager/ManagerVerificationDocuments.jsx` with category tabs (`IDENTITY`, `BUSINESS`, `TAX`, `PROPERTY`), drag & drop file upload, image compression, and status indicators.
- **Audit & History Timeline**: `client/src/pages/manager/ManagerVerificationTimeline.jsx` displaying timestamped audit events and history drawer.
- **Trust Score & Credibility Analytics**: `client/src/pages/manager/ManagerTrustScorePage.jsx` showing score card (0-100), badge tier, 7-part breakdown, score trend line, and dynamic improvement suggestions.
- **Sidebar Integration**: Added `Verification` sub-module item (`/manager/verification`) to `Sidebar.jsx`.

### Test Results & Build Status
- **Client Production Build**: Passed in 26.82s (`0 errors`).
- **Server Unit Tests**: 100% Passed (14/14 tests in 3.47s).
- **Git Commit**: `84e428714bdd9e3edd9a4b184dd5a57ec59e5dd4`

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
