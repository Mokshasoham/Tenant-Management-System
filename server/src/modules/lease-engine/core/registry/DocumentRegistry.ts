/**
 * Document Registry
 * Each document type registers: type, section order, lifecycle, branding, PDF settings, data mapper.
 */

import {
  DocumentType,
  DocumentRegistration,
  SectionDefinition,
  LifecycleStatus,
  DocumentModel,
  BrandingConfig,
  PdfSettings,
} from '../types';

class DocumentRegistryImpl {
  private registry = new Map<DocumentType, DocumentRegistration>();

  register(reg: DocumentRegistration): void {
    if (this.registry.has(reg.documentType)) {
      console.warn(`[DocumentRegistry] Overwriting registration for ${reg.documentType}`);
    }
    this.registry.set(reg.documentType, reg);
  }

  get(type: DocumentType): DocumentRegistration | undefined {
    return this.registry.get(type);
  }

  has(type: DocumentType): boolean {
    return this.registry.has(type);
  }

  list(): DocumentType[] {
    return Array.from(this.registry.keys());
  }

  getSectionOrder(type: DocumentType): SectionDefinition[] {
    const reg = this.get(type);
    if (!reg) throw new Error(`Document type ${type} is not registered`);
    return reg.sectionOrder;
  }

  mapData(type: DocumentType, raw: any): DocumentModel {
    const reg = this.get(type);
    if (!reg) throw new Error(`Document type ${type} is not registered`);
    return reg.dataMapper(raw);
  }

  getSupportedLifecycle(type: DocumentType): LifecycleStatus[] {
    return this.get(type)?.supportedLifecycle ?? [];
  }

  getBranding(type: DocumentType): Partial<BrandingConfig> {
    return this.get(type)?.branding ?? {};
  }

  getPdfSettings(type: DocumentType): PdfSettings {
    return (
      this.get(type)?.pdfSettings ?? {
        pageSize: 'A4',
        orientation: 'portrait',
      }
    );
  }
}

/** Singleton registry */
export const DocumentRegistry = new DocumentRegistryImpl();
export default DocumentRegistry;
