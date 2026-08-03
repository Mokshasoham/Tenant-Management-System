/**
 * Lease Agreement Data Mapper
 * Domain Entity → Document Model
 */
import { generateDocumentId } from '../../services/documentId.js';
import { createSecurityBlock } from '../../services/hash.js';
export function mapLeaseData(raw) {
    const id = generateDocumentId('LEASE');
    const now = new Date();
    const generatedAt = now.toLocaleString('en-IN', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        timeZone: 'Asia/Kolkata',
        hour12: false,
    }) + ' IST';
    const documentVersion = raw.documentVersion ?? 1;
    return {
        id,
        type: 'LEASE',
        lifecycle: (raw.leaseStatus === 'Signed' ? 'Signed' : 'Generated'),
        version: raw.leaseVersion || '1.0',
        documentVersion,
        templateVersion: 'LeaseTpl-3.2.0',
        generatedAt,
        generatedBy: raw.generatedBy || 'System (Auto)',
        branding: {
            companyName: raw.branding?.companyName || 'Tenant Management System',
            primaryColor: raw.branding?.primaryColor,
        },
        security: createSecurityBlock(Buffer.from('placeholder'), 'Tenant Management System'),
        attachments: raw.attachments || [],
        versionHistory: raw.versionHistory || [],
        metadata: {
            title: 'Lease Agreement',
        },
        sections: {},
        data: {
            tenant: raw.tenant,
            property: raw.property,
            manager: raw.manager,
            owner: raw.owner,
            financial: raw.financial,
            duration: raw.duration,
            startDate: raw.startDate,
            endDate: raw.endDate,
            leaseStatus: raw.leaseStatus || 'Active',
            leaseVersion: raw.leaseVersion || 'v1',
            signers: raw.signers,
            approvalSteps: raw.approvalSteps,
            timeline: raw.timeline,
            terms: raw.terms,
            amendments: raw.amendments,
            emergency: raw.emergency,
        },
    };
}
