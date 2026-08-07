import VerificationDocumentTemplate from '../models/VerificationDocumentTemplate.js';
import VerificationWorkflow from '../models/VerificationWorkflow.js';
import logger from '../platform/logging/logger.js';

export const DEFAULT_DOCUMENT_TEMPLATES = [
  {
    documentType: 'AADHAAR',
    label: 'Aadhaar Card',
    description: 'Government issued unique identity card',
    category: 'IDENTITY',
    applicableEntityTypes: ['TENANT', 'MANAGER', 'TECHNICIAN'],
    allowedMimeTypes: ['image/jpeg', 'image/png', 'application/pdf'],
    maxFileSizeMB: 5,
    hasExpiry: false,
    demoAutoAccept: true,
  },
  {
    documentType: 'PAN',
    label: 'PAN Card',
    description: 'Permanent Account Number card for tax verification',
    category: 'IDENTITY',
    applicableEntityTypes: ['TENANT', 'MANAGER', 'TECHNICIAN'],
    allowedMimeTypes: ['image/jpeg', 'image/png', 'application/pdf'],
    maxFileSizeMB: 5,
    hasExpiry: false,
    demoAutoAccept: true,
  },
  {
    documentType: 'PASSPORT',
    label: 'Passport',
    description: 'International travel and identity document',
    category: 'IDENTITY',
    applicableEntityTypes: ['TENANT', 'MANAGER'],
    allowedMimeTypes: ['image/jpeg', 'image/png', 'application/pdf'],
    maxFileSizeMB: 5,
    hasExpiry: true,
    defaultValidityMonths: 120,
    renewalReminderDaysBefore: 30,
    demoAutoAccept: true,
  },
  {
    documentType: 'DRIVING_LICENSE',
    label: 'Driving License',
    description: 'Official driving license identity proof',
    category: 'IDENTITY',
    applicableEntityTypes: ['TENANT', 'TECHNICIAN'],
    allowedMimeTypes: ['image/jpeg', 'image/png', 'application/pdf'],
    maxFileSizeMB: 5,
    hasExpiry: true,
    defaultValidityMonths: 60,
    renewalReminderDaysBefore: 30,
    demoAutoAccept: true,
  },
  {
    documentType: 'GST_CERTIFICATE',
    label: 'GST Certificate',
    description: 'Goods and Services Tax registration certificate',
    category: 'BUSINESS',
    applicableEntityTypes: ['MANAGER'],
    allowedMimeTypes: ['image/jpeg', 'image/png', 'application/pdf'],
    maxFileSizeMB: 5,
    hasExpiry: true,
    defaultValidityMonths: 12,
    renewalReminderDaysBefore: 30,
    demoAutoAccept: true,
  },
  {
    documentType: 'COMPANY_REGISTRATION',
    label: 'Company Registration',
    description: 'Certificate of Incorporation or Business License',
    category: 'BUSINESS',
    applicableEntityTypes: ['MANAGER'],
    allowedMimeTypes: ['image/jpeg', 'image/png', 'application/pdf'],
    maxFileSizeMB: 10,
    hasExpiry: false,
    demoAutoAccept: true,
  },
  {
    documentType: 'BUSINESS_PAN',
    label: 'Business PAN',
    description: 'Permanent Account Number card of the entity',
    category: 'BUSINESS',
    applicableEntityTypes: ['MANAGER'],
    allowedMimeTypes: ['image/jpeg', 'image/png', 'application/pdf'],
    maxFileSizeMB: 5,
    hasExpiry: false,
    demoAutoAccept: true,
  },
  {
    documentType: 'POLICE_VERIFICATION',
    label: 'Police Verification Certificate',
    description: 'Background check clearance certificate',
    category: 'EMPLOYMENT',
    applicableEntityTypes: ['TECHNICIAN'],
    allowedMimeTypes: ['image/jpeg', 'image/png', 'application/pdf'],
    maxFileSizeMB: 5,
    hasExpiry: true,
    defaultValidityMonths: 12,
    renewalReminderDaysBefore: 30,
    demoAutoAccept: true,
  },
  {
    documentType: 'TRADE_LICENSE',
    label: 'Trade / Professional License',
    description: 'Authorized technical license or certification',
    category: 'EMPLOYMENT',
    applicableEntityTypes: ['TECHNICIAN'],
    allowedMimeTypes: ['image/jpeg', 'image/png', 'application/pdf'],
    maxFileSizeMB: 5,
    hasExpiry: true,
    defaultValidityMonths: 24,
    renewalReminderDaysBefore: 30,
    demoAutoAccept: true,
  },
  {
    documentType: 'INSURANCE_CERTIFICATE',
    label: 'Workplace Insurance Certificate',
    description: 'Liability or worker compensation insurance policy',
    category: 'EMPLOYMENT',
    applicableEntityTypes: ['TECHNICIAN'],
    allowedMimeTypes: ['image/jpeg', 'image/png', 'application/pdf'],
    maxFileSizeMB: 5,
    hasExpiry: true,
    defaultValidityMonths: 6,
    renewalReminderDaysBefore: 30,
    demoAutoAccept: true,
  },
  {
    documentType: 'OWNERSHIP_DEED',
    label: 'Property Ownership Deed',
    description: 'Registered title deed or sale deed of property',
    category: 'PROPERTY',
    applicableEntityTypes: ['PROPERTY'],
    allowedMimeTypes: ['image/jpeg', 'image/png', 'application/pdf'],
    maxFileSizeMB: 10,
    hasExpiry: false,
    demoAutoAccept: true,
  },
  {
    documentType: 'PROPERTY_TAX_RECEIPT',
    label: 'Property Tax Receipt',
    description: 'Latest municipal property tax payment receipt',
    category: 'PROPERTY',
    applicableEntityTypes: ['PROPERTY'],
    allowedMimeTypes: ['image/jpeg', 'image/png', 'application/pdf'],
    maxFileSizeMB: 5,
    hasExpiry: true,
    defaultValidityMonths: 12,
    renewalReminderDaysBefore: 30,
    demoAutoAccept: true,
  },
  {
    documentType: 'ENCUMBRANCE_CERTIFICATE',
    label: 'Encumbrance Certificate',
    description: 'Certificate showing property free from legal liabilities',
    category: 'PROPERTY',
    applicableEntityTypes: ['PROPERTY'],
    allowedMimeTypes: ['image/jpeg', 'image/png', 'application/pdf'],
    maxFileSizeMB: 5,
    hasExpiry: true,
    defaultValidityMonths: 6,
    renewalReminderDaysBefore: 30,
    demoAutoAccept: true,
  },
  {
    documentType: 'SELFIE',
    label: 'Live Photo / Selfie',
    description: 'Live facial capture for identity verification',
    category: 'IDENTITY',
    applicableEntityTypes: ['TENANT', 'MANAGER', 'TECHNICIAN'],
    allowedMimeTypes: ['image/jpeg', 'image/png'],
    maxFileSizeMB: 5,
    hasExpiry: false,
    demoAutoAccept: true,
  },
];

export const DEFAULT_WORKFLOWS = [
  {
    workflowType: 'MANAGER',
    version: '1.0',
    isActive: true,
    levelsRequired: [1, 3],
    steps: [
      {
        stepKey: 'email',
        label: 'Email Verification',
        description: 'Verify corporate email address',
        order: 1,
        isRequired: true,
        isEnabled: true,
        autoApproveInDemo: true,
      },
      {
        stepKey: 'phone',
        label: 'Phone Verification',
        description: 'Verify phone via OTP',
        order: 2,
        isRequired: true,
        isEnabled: true,
        autoApproveInDemo: true,
      },
      {
        stepKey: 'identity',
        label: 'Identity Documents',
        description: 'Upload Aadhaar, PAN, or Passport',
        order: 3,
        isRequired: true,
        isEnabled: true,
        documentTypes: ['AADHAAR', 'PAN', 'PASSPORT'],
        autoApproveInDemo: true,
      },
      {
        stepKey: 'business',
        label: 'Business Credentials',
        description: 'Upload GST, Company Registration, Business PAN',
        order: 4,
        isRequired: true,
        isEnabled: true,
        documentTypes: ['GST_CERTIFICATE', 'COMPANY_REGISTRATION', 'BUSINESS_PAN'],
        autoApproveInDemo: true,
      },
      {
        stepKey: 'property',
        label: 'Property Portfolio',
        description: 'Assign initial managed properties',
        order: 5,
        isRequired: false,
        isEnabled: true,
        allowSkipInDemo: true,
      },
    ],
    trustWeights: {
      identity: 30,
      phone: 15,
      business: 25,
      property: 10,
      reviews: 10,
      noFraud: 5,
      base: 5,
    },
    slaConfig: {
      targetHours: 72,
      atRiskThresholdPercent: 80,
      escalateAfterHours: 96,
    },
  },
  {
    workflowType: 'TENANT',
    version: '1.0',
    isActive: true,
    levelsRequired: [1, 3],
    steps: [
      {
        stepKey: 'email',
        label: 'Email Verification',
        description: 'Verify primary email address',
        order: 1,
        isRequired: true,
        isEnabled: true,
        autoApproveInDemo: true,
      },
      {
        stepKey: 'phone',
        label: 'Phone Verification',
        description: 'Verify mobile phone via OTP',
        order: 2,
        isRequired: true,
        isEnabled: true,
        autoApproveInDemo: true,
      },
      {
        stepKey: 'identity',
        label: 'Identity Verification',
        description: 'Upload Aadhaar, PAN, or Driving License',
        order: 3,
        isRequired: true,
        isEnabled: true,
        documentTypes: ['AADHAAR', 'PAN', 'DRIVING_LICENSE'],
        autoApproveInDemo: true,
      },
      {
        stepKey: 'address',
        label: 'Address Proof',
        description: 'Upload secondary proof of current address',
        order: 4,
        isRequired: false,
        isEnabled: true,
        allowSkipInDemo: true,
      },
    ],
    trustWeights: {
      identity: 40,
      phone: 20,
      business: 0,
      property: 15,
      reviews: 15,
      noFraud: 5,
      base: 5,
    },
    slaConfig: {
      targetHours: 48,
      atRiskThresholdPercent: 80,
      escalateAfterHours: 72,
    },
  },
  {
    workflowType: 'TECHNICIAN',
    version: '1.0',
    isActive: true,
    levelsRequired: [1, 2, 3],
    steps: [
      {
        stepKey: 'email',
        label: 'Email Verification',
        description: 'Verify work email address',
        order: 1,
        isRequired: true,
        isEnabled: true,
        autoApproveInDemo: true,
      },
      {
        stepKey: 'phone',
        label: 'Phone Verification',
        description: 'Verify mobile number',
        order: 2,
        isRequired: true,
        isEnabled: true,
        autoApproveInDemo: true,
      },
      {
        stepKey: 'identity',
        label: 'Identity Verification',
        description: 'Upload Aadhaar or PAN',
        order: 3,
        isRequired: true,
        isEnabled: true,
        documentTypes: ['AADHAAR', 'PAN'],
        autoApproveInDemo: true,
      },
      {
        stepKey: 'employment',
        label: 'Employment & Credentials',
        description: 'Upload Police Clearance, Trade License, Insurance',
        order: 4,
        isRequired: true,
        isEnabled: true,
        documentTypes: ['POLICE_VERIFICATION', 'TRADE_LICENSE', 'INSURANCE_CERTIFICATE'],
        autoApproveInDemo: true,
      },
    ],
    trustWeights: {
      identity: 30,
      phone: 15,
      business: 0,
      property: 0,
      reviews: 20,
      noFraud: 5,
      base: 30,
    },
    slaConfig: {
      targetHours: 72,
      atRiskThresholdPercent: 80,
      escalateAfterHours: 96,
    },
  },
  {
    workflowType: 'PROPERTY',
    version: '1.0',
    isActive: true,
    levelsRequired: [1, 3],
    steps: [
      {
        stepKey: 'ownership',
        label: 'Ownership Deed',
        description: 'Upload registered Title / Sale Deed',
        order: 1,
        isRequired: true,
        isEnabled: true,
        documentTypes: ['OWNERSHIP_DEED'],
        autoApproveInDemo: true,
      },
      {
        stepKey: 'tax',
        label: 'Property Tax Receipts',
        description: 'Upload recent municipal property tax receipt',
        order: 2,
        isRequired: true,
        isEnabled: true,
        documentTypes: ['PROPERTY_TAX_RECEIPT'],
        autoApproveInDemo: true,
      },
      {
        stepKey: 'encumbrance',
        label: 'Encumbrance Certificate',
        description: 'Upload recent Encumbrance Certificate',
        order: 3,
        isRequired: false,
        isEnabled: true,
        documentTypes: ['ENCUMBRANCE_CERTIFICATE'],
        allowSkipInDemo: true,
      },
    ],
    trustWeights: {
      identity: 0,
      phone: 0,
      business: 0,
      property: 60,
      reviews: 25,
      noFraud: 10,
      base: 5,
    },
    slaConfig: {
      targetHours: 120,
      atRiskThresholdPercent: 80,
      escalateAfterHours: 144,
    },
  },
];

/**
 * Idempotent Seed Function for Verification Templates and Workflows.
 * Checks for existing items by unique key before creating.
 */
export async function seedVerificationDefaults() {
  try {
    let templatesCreated = 0;
    for (const templateData of DEFAULT_DOCUMENT_TEMPLATES) {
      const existing = await VerificationDocumentTemplate.findOne({
        documentType: templateData.documentType,
        isDeleted: false,
      });

      if (!existing) {
        await VerificationDocumentTemplate.create(templateData);
        templatesCreated++;
      }
    }

    let workflowsCreated = 0;
    for (const workflowData of DEFAULT_WORKFLOWS) {
      const existing = await VerificationWorkflow.findOne({
        workflowType: workflowData.workflowType,
        isDeleted: false,
      });

      if (!existing) {
        await VerificationWorkflow.create(workflowData);
        workflowsCreated++;
      }
    }

    logger.info(
      `[VerificationSeed] Idempotent seed completed. Templates created: ${templatesCreated}, Workflows created: ${workflowsCreated}`
    );

    return { templatesCreated, workflowsCreated };
  } catch (err) {
    logger.error('[VerificationSeed] Seed execution failed:', err);
    throw err;
  }
}
