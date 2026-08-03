/**
 * Lease Agreement registration into Document Registry
 */
import { DocumentRegistry } from '../../registry/DocumentRegistry.js';
import { mapLeaseData } from './mapper.js';
const leaseSections = [
    // Legal-first, enterprise sequence
    { id: 'Cover', type: 'Cover', keepTogether: true },
    { id: 'Metadata', type: 'Metadata', keepTogether: true },
    { id: 'AgreementSummary', type: 'Summary' },
    { id: 'Tenant', type: 'Cards' },
    { id: 'Property', type: 'Cards' },
    { id: 'Terms', type: 'Terms' },
    { id: 'Financial', type: 'Tables' },
    { id: 'Timeline', type: 'Timeline' },
    { id: 'Signature', type: 'Signature', keepTogether: true },
    { id: 'QRVerification', type: 'QRVerification', keepTogether: true },
    { id: 'Appendix', type: 'Appendix' },
    { id: 'Attachments', type: 'Attachments' },
];
const supportedLifecycle = [
    'Draft',
    'Generated',
    'Issued',
    'Viewed',
    'Signed',
    'Archived',
    'Superseded',
    'Cancelled',
];
export function registerLeaseAgreement() {
    DocumentRegistry.register({
        documentType: 'LEASE',
        prefix: 'LEASE',
        displayName: 'Lease Agreement',
        sectionOrder: leaseSections,
        supportedLifecycle,
        branding: {
            companyName: 'Tenant Management System',
        },
        pdfSettings: {
            pageSize: 'A4',
            orientation: 'portrait',
        },
        dataMapper: mapLeaseData,
    });
}
