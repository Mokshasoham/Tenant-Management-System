/**
 * Summary Section — Agreement Summary + Approval Summary cards
 */
import PDFDocument from 'pdfkit';
import { DocumentModel, SectionDefinition } from '../types';
type Doc = InstanceType<typeof PDFDocument>;
export declare function renderSummary(doc: Doc, model: DocumentModel, def: SectionDefinition): void;
export {};
