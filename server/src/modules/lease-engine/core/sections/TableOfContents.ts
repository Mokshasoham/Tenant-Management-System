import PDFDocument from 'pdfkit';
import { DocumentModel, SectionDefinition } from '../types';
import { theme } from '../theme/tokens';

type Doc = InstanceType<typeof PDFDocument>;

export function renderTableOfContents(doc: Doc, model: DocumentModel, _def: SectionDefinition): void {
  doc.font('Helvetica-Bold').fontSize(theme.typography.h1.size).fillColor(theme.colors.navy900).text('TABLE OF CONTENTS');
  doc.moveDown(0.8);

  const groups = [
    { title: 'Overview', items: ['Document Metadata', 'Agreement Summary', 'Approval Summary'] },
    { title: 'Financials & Terms', items: ['Tenant Information', 'Property Information', 'Financial Information', 'Lease Timeline', 'Terms & Conditions', 'Rules & Responsibilities'] },
    { title: 'Evidence & Verification', items: ['Inventory Checklist', 'Emergency Information', 'Digital Signatures', 'Appendix', 'Amendment Log', 'QR Verification & Document Security'] },
    { title: 'Closing', items: ['Attachments'] },
  ];

  groups.forEach((g) => {
    doc.font('Helvetica-Bold').fontSize(10).fillColor(theme.colors.navy700).text(g.title);
    doc.moveDown(0.3);
    g.items.forEach((item) => {
      doc.font('Helvetica').fontSize(9).fillColor(theme.colors.slate700).text(`  ·  ${item}`);
      doc.moveDown(0.25);
    });
    doc.moveDown(0.5);
  });
}
