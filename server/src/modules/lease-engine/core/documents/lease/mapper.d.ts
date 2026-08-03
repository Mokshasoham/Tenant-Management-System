/**
 * Lease Agreement Data Mapper
 * Domain Entity → Document Model
 */
import { DocumentModel } from '../../types';
export interface LeaseRawInput {
    tenant?: {
        name?: string;
        email?: string;
        phone?: string;
        idType?: string;
        idNumber?: string;
    };
    property?: {
        name?: string;
        address?: string;
        unit?: string;
        type?: string;
        city?: string;
    };
    manager?: {
        name?: string;
        email?: string;
        phone?: string;
    };
    owner?: {
        name?: string;
    };
    financial?: {
        monthlyRent?: string;
        deposit?: string;
        maintenance?: string;
        lineItems?: [string, string][];
    };
    duration?: string;
    startDate?: string;
    endDate?: string;
    leaseStatus?: string;
    leaseVersion?: string;
    signers?: any[];
    approvalSteps?: any[];
    timeline?: any[];
    terms?: string[];
    amendments?: any[];
    emergency?: Record<string, string>;
    attachments?: any[];
    versionHistory?: any[];
    branding?: {
        companyName?: string;
        primaryColor?: string;
    };
    generatedBy?: string;
    documentVersion?: number;
}
export declare function mapLeaseData(raw: LeaseRawInput): DocumentModel;
