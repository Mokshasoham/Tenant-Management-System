/**
 * Attachment Manifest (A.6)
 * Always visible. Empty categories show "Not attached".
 */
import PDFDocument from 'pdfkit';
import { DocumentModel, SectionDefinition } from '../types';
type Doc = InstanceType<typeof PDFDocument>;
export declare function renderAttachments(doc: Doc, model: DocumentModel, _def: SectionDefinition): void;
export {};
