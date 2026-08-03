/**
 * Shared PDF Engine
 * Generic engine — Lease Agreement (and future types) only provide data + section order.
 * One engine for all document types.
 */
import { GeneratedDocument } from '../types';
export interface EngineOptions {
    brandingOverride?: Partial<import('../types').BrandingConfig>;
}
export declare class SharedPDFEngine {
    private renderer;
    constructor();
    /**
     * Generate a PDF for any registered document type.
     */
    generate(type: import('../types').DocumentType, rawData: any, options?: EngineOptions): Promise<GeneratedDocument>;
    private renderToBuffer;
}
export declare const pdfEngine: SharedPDFEngine;
export default SharedPDFEngine;
