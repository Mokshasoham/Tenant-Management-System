export const VERIFICATION_WORKFLOW_STEPS = {
  TENANT: [
    { stepNumber: 1, key: 'IDENTITY', title: 'Identity Proof', requiredDocs: ['GOVT_ID', 'SELFIE'] },
    { stepNumber: 2, key: 'CONTACT', title: 'Phone & Email', requiredDocs: [] },
    { stepNumber: 3, key: 'ADDRESS', title: 'Address Proof', requiredDocs: ['ADDRESS_PROOF'] },
    { stepNumber: 4, key: 'FINANCIAL', title: 'Income Proof', requiredDocs: ['PAYSLIP'] },
  ],
  MANAGER: [
    { stepNumber: 1, key: 'BUSINESS', title: 'Business Registration', requiredDocs: ['BUSINESS_REGISTRATION'] },
    { stepNumber: 2, key: 'TAX', title: 'Tax Clearance / GST', requiredDocs: ['TAX_PIN'] },
    { stepNumber: 3, key: 'IDENTITY', title: 'Manager Identity', requiredDocs: ['GOVT_ID'] },
  ],
  TECHNICIAN: [
    { stepNumber: 1, key: 'IDENTITY', title: 'Identity Verification', requiredDocs: ['GOVT_ID'] },
    { stepNumber: 2, key: 'TRADE', title: 'Trade Certification', requiredDocs: ['TRADE_LICENSE'] },
    { stepNumber: 3, key: 'POLICE', title: 'Background Check', requiredDocs: ['POLICE_CLEARANCE'] },
  ],
  PROPERTY: [
    { stepNumber: 1, key: 'DEED', title: 'Property Ownership Deed', requiredDocs: ['OWNERSHIP_DEED'] },
    { stepNumber: 2, key: 'TAX', title: 'Property Tax Receipt', requiredDocs: ['PROPERTY_TAX'] },
  ],
};
