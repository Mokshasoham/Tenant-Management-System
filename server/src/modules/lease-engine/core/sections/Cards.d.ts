import PDFDocument from 'pdfkit';
import { DocumentModel, SectionDefinition } from '../types';
type Doc = InstanceType<typeof PDFDocument>;
export declare function renderCards(doc: Doc, model: DocumentModel, def: SectionDefinition): void;
export {};
