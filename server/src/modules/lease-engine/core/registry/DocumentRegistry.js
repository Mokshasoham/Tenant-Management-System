/**
 * Document Registry
 * Each document type registers: type, section order, lifecycle, branding, PDF settings, data mapper.
 */
class DocumentRegistryImpl {
    registry = new Map();
    register(reg) {
        if (this.registry.has(reg.documentType)) {
            console.warn(`[DocumentRegistry] Overwriting registration for ${reg.documentType}`);
        }
        this.registry.set(reg.documentType, reg);
    }
    get(type) {
        return this.registry.get(type);
    }
    has(type) {
        return this.registry.has(type);
    }
    list() {
        return Array.from(this.registry.keys());
    }
    getSectionOrder(type) {
        const reg = this.get(type);
        if (!reg)
            throw new Error(`Document type ${type} is not registered`);
        return reg.sectionOrder;
    }
    mapData(type, raw) {
        const reg = this.get(type);
        if (!reg)
            throw new Error(`Document type ${type} is not registered`);
        return reg.dataMapper(raw);
    }
    getSupportedLifecycle(type) {
        return this.get(type)?.supportedLifecycle ?? [];
    }
    getBranding(type) {
        return this.get(type)?.branding ?? {};
    }
    getPdfSettings(type) {
        return (this.get(type)?.pdfSettings ?? {
            pageSize: 'A4',
            orientation: 'portrait',
        });
    }
}
/** Singleton registry */
export const DocumentRegistry = new DocumentRegistryImpl();
export default DocumentRegistry;
