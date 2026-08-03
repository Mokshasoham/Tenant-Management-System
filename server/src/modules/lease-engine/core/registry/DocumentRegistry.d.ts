/**
 * Document Registry
 * Each document type registers: type, section order, lifecycle, branding, PDF settings, data mapper.
 */
import { DocumentType, DocumentRegistration, SectionDefinition, LifecycleStatus, DocumentModel, BrandingConfig, PdfSettings } from '../types';
declare class DocumentRegistryImpl {
    private registry;
    register(reg: DocumentRegistration): void;
    get(type: DocumentType): DocumentRegistration | undefined;
    has(type: DocumentType): boolean;
    list(): DocumentType[];
    getSectionOrder(type: DocumentType): SectionDefinition[];
    mapData(type: DocumentType, raw: any): DocumentModel;
    getSupportedLifecycle(type: DocumentType): LifecycleStatus[];
    getBranding(type: DocumentType): Partial<BrandingConfig>;
    getPdfSettings(type: DocumentType): PdfSettings;
}
/** Singleton registry */
export declare const DocumentRegistry: DocumentRegistryImpl;
export default DocumentRegistry;
