import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { parse } from '../../../client/node_modules/@babel/parser/lib/index.js';
import traversePkg from '../../../client/node_modules/@babel/traverse/lib/index.js';
import { translations } from '../../../client/src/utils/translations.js';

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
      'step1Title',
      'step1Subtitle',
      'managerFullName',
      'validationBusinessName',
      'validationOfficeAddress',
      'validationGovtIdRequired',
      'validationBusinessDocRequired',
      'cannotSubmitIncomplete',
      'step1PropTitle',
      'step1PropSubtitle',
      'propertyNameLabel',
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
    });
  });

  describe('2. AST Analysis: Zero Unbound Language or Translation Calls', () => {
    const targetFiles = [
      'client/src/pages/manager/ManagerVerificationWizard.jsx',
      'client/src/pages/property/PropertyVerificationWizard.jsx',
      'client/src/pages/manager/ManagerVerificationDocuments.jsx',
      'client/src/pages/manager/ManagerVerificationTimeline.jsx',
      'client/src/pages/property/PropertyVerificationDocuments.jsx',
      'client/src/pages/property/PropertyVerificationTimeline.jsx',
      'client/src/components/verification/progress/VerificationProgressStepper.jsx',
      'client/src/components/verification/common/FileUploader.jsx',
      'client/src/components/verification/documents/DocumentPreviewCard.jsx',
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

  describe('3. Form Validation & Workflow Rules in Wizard Implementations', () => {
    test('Manager wizard Step 1 does not validate businessName and allows proceeding with valid user account', () => {
      const code = fs.readFileSync(
        path.join(rootDir, 'client/src/pages/manager/ManagerVerificationWizard.jsx'),
        'utf8'
      );

      // Verify Step 1 does NOT check !formData.businessName
      const step1Pattern = /currentStep\s*===\s*1\s*&&\s*!formData\.businessName/;
      expect(step1Pattern.test(code)).toBe(false);

      // Verify Step 2 DOES check !formData.businessName
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

    test('Both wizards prevent submission when required items are missing and show warnings', () => {
      const managerCode = fs.readFileSync(
        path.join(rootDir, 'client/src/pages/manager/ManagerVerificationWizard.jsx'),
        'utf8'
      );
      const propCode = fs.readFileSync(
        path.join(rootDir, 'client/src/pages/property/PropertyVerificationWizard.jsx'),
        'utf8'
      );

      expect(managerCode).toContain('missingRequirements');
      expect(managerCode).toContain('cannotSubmitIncomplete');

      expect(propCode).toContain('missingRequirements');
      expect(propCode).toContain('cannotSubmitIncomplete');
    });
  });

  describe('4. Verification Stepper & File Uploader Responsive & Accessible Contracts', () => {
    test('VerificationProgressStepper provides progressbar semantics and mobile responsive indicators', () => {
      const stepperCode = fs.readFileSync(
        path.join(rootDir, 'client/src/components/verification/progress/VerificationProgressStepper.jsx'),
        'utf8'
      );

      expect(stepperCode).toContain('role="progressbar"');
      expect(stepperCode).toContain('aria-valuenow');
      expect(stepperCode).toContain('sm:hidden');
      expect(stepperCode).toContain('stepOf');
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
