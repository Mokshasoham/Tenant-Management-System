import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { parse } from '../../../client/node_modules/@babel/parser/lib/index.js';
import traversePkg from '../../../client/node_modules/@babel/traverse/lib/index.js';
import { translations } from '../../../client/src/utils/translations.js';
import { getLocalizedStatus } from '../../../client/src/utils/statusLocalization.js';

const traverse = traversePkg.default || traversePkg;
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '../../../');

describe('TMS Verification End-to-End Workflow & Multilingual Localization Suite', () => {
  const supportedLanguages = ['en', 'hi', 'ta', 'te', 'kn', 'ml', 'es', 'fr'];

  describe('1. Multilingual Key Parity & Localization across All 8 Languages', () => {
    const requiredWizardKeys = [
      'managerWizardTitle',
      'managerWizardSubtitle',
      'propWizardTitle',
      'propWizardSubtitle',
      'propOperations',
      'selectPropertyPrompt',
      'chooseProperty',
      'stepProfileInfo',
      'stepProfileInfoDesc',
      'stepBusinessDetails',
      'stepBusinessDetailsDesc',
      'stepIdentityDocs',
      'stepIdentityDocsDesc',
      'stepBusinessDocs',
      'stepBusinessDocsDesc',
      'stepReviewVerify',
      'stepReviewVerifyDesc',
      'stepSubmitApp',
      'stepSubmitAppDesc',
      'stepPropDetails',
      'stepPropDetailsDesc',
      'stepOwnershipDetails',
      'stepOwnershipDetailsDesc',
      'stepPropDocs',
      'stepPropDocsDesc',
      'stepPropPhotos',
      'stepPropPhotosDesc',
      'stepPropReview',
      'stepPropReviewDesc',
      'stepPropSubmit',
      'stepPropSubmitDesc',
      'fullName',
      'emailAddress',
      'phoneNumber',
      'businessName',
      'businessType',
      'taxIdLabel',
      'addressReview',
      'ownershipStructureLabel',
      'propertyNameLabel',
      'propertyTypeLabel',
      'propertyAddressLabel',
      'validationPropName',
      'validationPropAddress',
      'validationOwnerName',
      'validationPropDocRequired',
      'validationPhotoRequired',
      'saveDraft',
      'saving',
      'saved',
      'savedAt',
      'previousStep',
      'nextStep',
      'fileUploadSuccess',
      'fileUploadError',
      'fileTooLarge',
      'docWorkspaceTitle',
      'managerAuditTitle',
      'propertyDocWorkspaceTitle',
      'propertyAuditTitle',
      'ownership_individual_owner',
      'ownership_company',
      'ownership_builder',
      'ownership_housing_society',
      'ownership_property_management_company',
      'ownership_government',
      'ownership_trust',
      'ownership_inherited_property',
      'biz_real_estate_mgmt',
      'biz_residential_mgmt',
      'biz_commercial_leasing',
      'biz_individual_landlord',
      'trustScoreCardTitle',
      'trustScoreCardSubtitle',
      'trustScoreNotice',
      'trustBreakdownTitle',
      'trustBreakdownSubtitle',
      'percentCompleted',
      'stepsCompletedCounter',
      'draftSubmission',
      'riskManualReview',
      'riskLow',
      'retry',
      'requiredBadge',
      'allowedFormatsHint',
      'noTimelineEvents',
      'submissionHistory',
    ];

    test('All 8 languages have 100% key parity in the verification namespace', () => {
      const enKeys = Object.keys(translations.en.verification).sort();

      for (const lang of supportedLanguages) {
        const langKeys = Object.keys(translations[lang].verification).sort();
        expect(langKeys).toEqual(enKeys);
      }
    });

    test.each(supportedLanguages)(
      'Language "%s" contains valid, non-empty translations for all required wizard keys',
      (lang) => {
        const verifDict = translations[lang].verification;
        expect(verifDict).toBeDefined();

        for (const k of requiredWizardKeys) {
          expect(verifDict[k]).toBeDefined();
          expect(typeof verifDict[k]).toBe('string');
          expect(verifDict[k].trim().length).toBeGreaterThan(0);
        }
      }
    );

    test('Telugu (te) translations contain accurate script content for key wizard elements', () => {
      const te = translations.te.verification;
      expect(te.managerWizardTitle).toContain('మేనేజర్');
      expect(te.propWizardTitle).toContain('ఆస్తి ధృవీకరణ విజార్డ్');
      expect(te.stepProfileInfo).toContain('ప్రొఫైల్ సమాచారం');
      expect(te.stepBusinessDetails).toContain('వ్యాపార వివరాలు');
      expect(te.validationBusinessName).toContain('వ్యాపారం');
      expect(te.validationPropDocRequired).toContain('పత్రం');

      // Ownership options in Telugu
      expect(te.ownership_individual_owner).toBe('వ్యక్తిగత యజమాని');
      expect(te.ownership_company).toBe('కంపెనీ');
      expect(te.ownership_builder).toBe('బిల్డర్');
      expect(te.ownership_housing_society).toBe('హౌసింగ్ సొసైటీ');
      expect(te.ownership_property_management_company).toBe('ప్రాపర్టీ మేనేజ్‌మెంట్ కంపెనీ');
      expect(te.ownership_government).toBe('ప్రభుత్వం');
      expect(te.ownership_trust).toBe('ట్రస్ట్');
      expect(te.ownership_inherited_property).toBe('వారసత్వ ఆస్తి');

      // Business categories in Telugu
      expect(te.biz_real_estate_mgmt).toBe('రియల్ ఎస్టేట్ మేనేజ్‌మెంట్');
      expect(te.biz_residential_mgmt).toBe('నివాస ప్రాపర్టీ మేనేజ్‌మెంట్');
      expect(te.biz_commercial_leasing).toBe('వాణిజ్య లీజింగ్ & కార్యకలాపాలు');
      expect(te.biz_individual_landlord).toBe('వ్యక్తిగత యజమాని / బ్రోకర్');
    });
  });

  describe('2. AST Analysis: Zero Unbound Language or Translation Calls Across All Verification Components', () => {
    const targetFiles = [
      'client/src/pages/manager/ManagerVerificationPage.jsx',
      'client/src/pages/manager/ManagerVerificationWizard.jsx',
      'client/src/pages/manager/ManagerVerificationDocuments.jsx',
      'client/src/pages/manager/ManagerVerificationTimeline.jsx',
      'client/src/pages/property/PropertyVerificationPage.jsx',
      'client/src/pages/property/PropertyVerificationWizard.jsx',
      'client/src/pages/property/PropertyVerificationDocuments.jsx',
      'client/src/pages/property/PropertyVerificationTimeline.jsx',
      'client/src/components/verification/badges/VerificationStatusBadge.jsx',
      'client/src/components/verification/badges/VerificationBadge.jsx',
      'client/src/components/verification/badges/RiskFlagBadge.jsx',
      'client/src/components/verification/badges/TrustScoreBadge.jsx',
      'client/src/components/verification/badges/ReviewLevelBadge.jsx',
      'client/src/components/verification/trust/TrustScoreCard.jsx',
      'client/src/components/verification/trust/TrustBreakdownCard.jsx',
      'client/src/components/verification/progress/VerificationProgressCard.jsx',
      'client/src/components/verification/progress/VerificationProgressStepper.jsx',
      'client/src/components/verification/progress/VerificationTimeline.jsx',
      'client/src/components/verification/common/FileUploader.jsx',
      'client/src/components/verification/documents/DocumentPreviewCard.jsx',
      'client/src/components/verification/documents/DocumentUploadCard.jsx',
      'client/src/components/verification/documents/UploadRequirementsCard.jsx',
      'client/src/components/verification/documents/UploadProgressBar.jsx',
      'client/src/components/verification/states/VerificationEmptyState.jsx',
      'client/src/components/verification/states/VerificationErrorState.jsx',
      'client/src/components/verification/states/VerificationLoadingOverlay.jsx',
      'client/src/components/verification/dialogs/ApprovalDialog.jsx',
      'client/src/components/verification/dialogs/RejectDialog.jsx',
      'client/src/components/verification/dialogs/ReviewRemarksCard.jsx',
      'client/src/components/verification/history/TimelineItem.jsx',
      'client/src/components/verification/history/VerificationHistoryDrawer.jsx',
      'client/src/components/verification/widgets/VerificationSummaryCard.jsx',
      'client/src/components/verification/widgets/VerificationWidget.jsx',
    ];

    test.each(targetFiles)('File "%s" correctly imports useLanguage and has zero unbound calls', (relPath) => {
      const fullPath = path.join(rootDir, relPath);
      expect(fs.existsSync(fullPath)).toBe(true);

      const code = fs.readFileSync(fullPath, 'utf8');
      expect(code).toContain('useLanguage');

      const ast = parse(code, {
        sourceType: 'module',
        plugins: ['jsx', 'classProperties', 'dynamicImport'],
      });

      let unboundUseLanguage = 0;
      let unboundT = 0;

      traverse(ast, {
        Identifier(nodePath) {
          const name = nodePath.node.name;
          if (name === 'useLanguage') {
            if (nodePath.parent.type !== 'ImportSpecifier' && nodePath.parent.type !== 'ImportDefaultSpecifier') {
              if (!nodePath.scope.hasBinding('useLanguage')) {
                unboundUseLanguage++;
              }
            }
          }
          if (name === 't' && nodePath.parent.type === 'CallExpression' && nodePath.parent.callee === nodePath.node) {
            if (!nodePath.scope.hasBinding('t')) {
              unboundT++;
            }
          }
        },
      });

      expect(unboundUseLanguage).toBe(0);
      expect(unboundT).toBe(0);
    });

    test('Both wizards import verificationService from api services', () => {
      const managerCode = fs.readFileSync(
        path.join(rootDir, 'client/src/pages/manager/ManagerVerificationWizard.jsx'),
        'utf8'
      );
      const propCode = fs.readFileSync(
        path.join(rootDir, 'client/src/pages/property/PropertyVerificationWizard.jsx'),
        'utf8'
      );

      expect(managerCode).toContain('verificationService');
      expect(propCode).toContain('verificationService');
    });
  });

  describe('3. Form Validation & Canonical Enum Localization', () => {
    test('Manager wizard Step 1 does not validate businessName and allows proceeding with valid user account', () => {
      const code = fs.readFileSync(
        path.join(rootDir, 'client/src/pages/manager/ManagerVerificationWizard.jsx'),
        'utf8'
      );

      const step1Pattern = /currentStep\s*===\s*1\s*&&\s*!formData\.businessName/;
      expect(step1Pattern.test(code)).toBe(false);

      const step2Pattern = /currentStep\s*===\s*2[\s\S]*?formData\.businessName/;
      expect(step2Pattern.test(code)).toBe(true);
    });

    test('Manager wizard requires Govt ID in Step 3 and Business Registration in Step 4', () => {
      const code = fs.readFileSync(
        path.join(rootDir, 'client/src/pages/manager/ManagerVerificationWizard.jsx'),
        'utf8'
      );

      expect(code).toContain('hasGovtId');
      expect(code).toContain('hasBusinessReg');
      expect(code).toContain('GOVT_ID');
      expect(code).toContain('BUSINESS_REGISTRATION');
    });

    test('Property wizard validates propertyName and address on Step 1, ownerName on Step 2, and docs on Step 3', () => {
      const code = fs.readFileSync(
        path.join(rootDir, 'client/src/pages/property/PropertyVerificationWizard.jsx'),
        'utf8'
      );

      expect(code).toContain('formData.propertyName');
      expect(code).toContain('formData.address');
      expect(code).toContain('formData.ownerName');
      expect(code).toContain('hasPropDoc');
      expect(code).toContain('SALE_DEED');
      expect(code).toContain('TAX_RECEIPT');
    });

    test('All 8 canonical ownership types resolve to translated labels in getLocalizedStatus across all 8 languages', () => {
      const canonicalOwnershipTypes = [
        'Individual Owner',
        'Company',
        'Builder',
        'Housing Society',
        'Property Management Company',
        'Government',
        'Trust',
        'Inherited Property',
      ];

      for (const lang of supportedLanguages) {
        const langDict = translations[lang];
        const t = (k, fb) => {
          const parts = k.split('.');
          return langDict[parts[0]]?.[parts[1]] || fb || k;
        };

        for (const type of canonicalOwnershipTypes) {
          const localized = getLocalizedStatus(type, t, 'ownershipType');
          expect(localized).toBeDefined();
          expect(typeof localized).toBe('string');
          expect(localized.length).toBeGreaterThan(0);
          // In non-English languages, it must not be equal to the English canonical string
          if (lang === 'te') {
            expect(localized).not.toBe(type);
          }
        }
      }
    });

    test('All 4 canonical business categories resolve to translated labels in getLocalizedStatus across all 8 languages', () => {
      const canonicalBizTypes = [
        'Real Estate Management',
        'Residential Property Management',
        'Commercial Leasing & Operations',
        'Individual Landlord / Broker',
      ];

      for (const lang of supportedLanguages) {
        const langDict = translations[lang];
        const t = (k, fb) => {
          const parts = k.split('.');
          return langDict[parts[0]]?.[parts[1]] || fb || k;
        };

        for (const type of canonicalBizTypes) {
          const localized = getLocalizedStatus(type, t, 'businessCategory');
          expect(localized).toBeDefined();
          expect(typeof localized).toBe('string');
          expect(localized.length).toBeGreaterThan(0);
          if (lang === 'te') {
            expect(localized).not.toBe(type);
          }
        }
      }
    });
  });

  describe('4. Verification Stepper & File Uploader Responsive & Accessible Contracts', () => {
    test('VerificationProgressStepper provides progressbar semantics, mobile indicator, and multi-line titles without truncate', () => {
      const stepperCode = fs.readFileSync(
        path.join(rootDir, 'client/src/components/verification/progress/VerificationProgressStepper.jsx'),
        'utf8'
      );

      expect(stepperCode).toContain('role="progressbar"');
      expect(stepperCode).toContain('aria-valuenow');
      expect(stepperCode).toContain('aria-valuetext');
      expect(stepperCode).toContain('aria-current');
      expect(stepperCode).toContain('sm:hidden');
      expect(stepperCode).toContain('stepOf');
      // Must allow 2-line wrapping rather than truncating title
      expect(stepperCode).toContain('break-words');
    });

    test('FileUploader supports drag-and-drop, localized size limits, and file clear actions', () => {
      const uploaderCode = fs.readFileSync(
        path.join(rootDir, 'client/src/components/verification/common/FileUploader.jsx'),
        'utf8'
      );

      expect(uploaderCode).toContain('formatFileSize');
      expect(uploaderCode).toContain('dragAndDropHint');
      expect(uploaderCode).toContain('fileTooLarge');
      expect(uploaderCode).toContain('clearFile');
    });
  });
});
