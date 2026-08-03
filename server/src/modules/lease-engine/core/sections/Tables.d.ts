import PDFDocument from 'pdfkit';
import { DocumentModel, SectionDefinition } from '../types';
type Doc = InstanceType<typeof PDFDocument>;
export declare function renderTables(doc: Doc, model: DocumentModel, def: SectionDefinition): void;
export {};
