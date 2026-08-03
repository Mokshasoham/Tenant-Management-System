/**
 * Standard Status Chip (A.4)
 * One component, one palette, used everywhere.
 */
import PDFDocument from 'pdfkit';
type Doc = InstanceType<typeof PDFDocument>;
export declare function drawStatusChip(doc: Doc, label: string, x: number, y: number, options?: {
    size?: 'sm' | 'md';
}): number;
export {};
