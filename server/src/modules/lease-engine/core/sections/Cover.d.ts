/**
 * Cover Section (A.1 / B.2 Page 0)
 * never split
 */
import PDFDocument from 'pdfkit';
import { DocumentModel, SectionDefinition } from '../types';
type Doc = InstanceType<typeof PDFDocument>;
export declare function renderCover(doc: Doc, model: DocumentModel, _def: SectionDefinition): void;
export {};
