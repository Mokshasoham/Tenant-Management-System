import PDFDocument from 'pdfkit';
import { DocumentModel, SectionDefinition } from '../types';
type Doc = InstanceType<typeof PDFDocument>;
export declare function renderAppendix(doc: Doc, model: DocumentModel, _def: SectionDefinition): void;
export {};
