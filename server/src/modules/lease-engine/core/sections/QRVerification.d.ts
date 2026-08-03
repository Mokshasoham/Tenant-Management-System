/**
 * QR Verification + Document Security (A.5 / B.2 Page 15)
 * never split
 */
import PDFDocument from 'pdfkit';
import { DocumentModel, SectionDefinition } from '../types';
type Doc = InstanceType<typeof PDFDocument>;
export declare function renderQRVerification(doc: Doc, model: DocumentModel, _def: SectionDefinition): void;
export {};
