/**
 * Core types for the Document Design System
 */
export type DocumentType = 'LEASE' | 'INV' | 'REN' | 'INSP' | 'EXIT' | 'DEP';
export type LifecycleStatus = 'Draft' | 'Generated' | 'Issued' | 'Viewed' | 'Signed' | 'Archived' | 'Superseded' | 'Cancelled';
export type StatusChip = 'Draft' | 'Pending' | 'Approved' | 'Signed' | 'Expired' | 'Cancelled' | 'Archived' | 'Verified' | 'Issued' | 'Viewed' | 'Generated' | 'Superseded';
export interface DocumentId {
    type: DocumentType;
    year: number;
    sequence: number;
    /** Formatted as {TYPE}-{YEAR}-{6-digit} */
    formatted: string;
}
export interface VersionHistoryEntry {
    version: string;
    createdBy: string;
    createdAt: string;
    reason: string;
    changes: string;
}
export interface AttachmentItem {
    label: string;
    count: number;
    types: string[];
    attached: boolean;
}
export interface SecurityBlock {
    sha256Hash: string;
    verificationTimestamp: string;
    issuingOrganization: string;
    tamperDetected: boolean;
    digitalSignatureValid?: boolean;
}
export interface BrandingConfig {
    companyLogo?: string;
    companyName: string;
    primaryColor?: string;
    watermark?: string;
    footerText?: string;
    contactDetails?: Record<string, string>;
}
export interface PdfSettings {
    pageSize: 'A4';
    orientation: 'portrait' | 'landscape';
    margins?: {
        top: number;
        bottom: number;
        left: number;
        right: number;
    };
}
export interface SectionDefinition {
    id: string;
    type: SectionType;
    keepTogether?: boolean;
    conditional?: (data: any) => boolean;
}
export type SectionType = 'Cover' | 'Metadata' | 'Summary' | 'Timeline' | 'Tables' | 'Cards' | 'Attachments' | 'Signature' | 'QRVerification' | 'Footer' | 'Header' | 'TableOfContents' | 'Terms' | 'Appendix';
export interface DocumentRegistration {
    documentType: DocumentType;
    prefix: string;
    displayName: string;
    sectionOrder: SectionDefinition[];
    supportedLifecycle: LifecycleStatus[];
    branding?: Partial<BrandingConfig>;
    pdfSettings?: PdfSettings;
    dataMapper: (raw: any) => DocumentModel;
}
export interface DocumentModel {
    id: DocumentId;
    type: DocumentType;
    lifecycle: LifecycleStatus;
    version: string;
    documentVersion: number;
    templateVersion: string;
    generatedAt: string;
    generatedBy: string;
    branding: BrandingConfig;
    security: SecurityBlock;
    attachments: AttachmentItem[];
    versionHistory: VersionHistoryEntry[];
    metadata: Record<string, any>;
    sections: Record<string, any>;
    /** Raw data for section builders */
    data: any;
}
export interface RenderContext {
    model: DocumentModel;
    theme: typeof import('../theme/tokens').theme;
    pageNumber: number;
    totalPages: number;
    currentSection?: string;
}
export interface GeneratedDocument {
    id: string;
    type: DocumentType;
    buffer: Buffer;
    hash: string;
    lifecycle: LifecycleStatus;
    version: string;
    generatedAt: string;
    pageCount: number;
    verificationUrl?: string;
}
