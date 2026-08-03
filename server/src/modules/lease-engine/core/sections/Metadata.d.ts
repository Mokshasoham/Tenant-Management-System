/**
 * Metadata Section (A.1 / B.2 Page 1)
 * never split. Includes Version History when documentVersion > 1 (A.9, A.10)
 */
import PDFDocument from 'pdfkit';
import { DocumentModel, SectionDefinition } from '../types';
type Doc = InstanceType<typeof PDFDocument>;
export declare function renderMetadata(doc: Doc, model: DocumentModel, _def: SectionDefinition): void;
export {};
