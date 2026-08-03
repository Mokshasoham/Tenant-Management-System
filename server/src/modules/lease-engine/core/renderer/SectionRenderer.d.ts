/**
 * Shared Renderer (A.13)
 * Applies theme tokens, page-break rules.
 */
import PDFDocument from 'pdfkit';
import { DocumentModel, SectionDefinition } from '../types';
type Doc = InstanceType<typeof PDFDocument>;
export declare class SectionRenderer {
    renderDocument(doc: Doc, model: DocumentModel, sections: SectionDefinition[]): void;
    private renderSection;
    private drawHeader;
    private drawFooter;
}
export default SectionRenderer;
