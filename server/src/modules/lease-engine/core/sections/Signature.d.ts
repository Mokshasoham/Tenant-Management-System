/**
 * Digital Signatures (B.2 Page 12)
 * Each block never split (A.11). Audit strip only on Signed blocks (A.10).
 */
import PDFDocument from 'pdfkit';
import { DocumentModel, SectionDefinition } from '../types';
type Doc = InstanceType<typeof PDFDocument>;
export declare function renderSignature(doc: Doc, model: DocumentModel, _def: SectionDefinition): void;
export {};
