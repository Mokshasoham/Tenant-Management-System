import PDFDocument from 'pdfkit';
import { DocumentModel, SectionDefinition } from '../types';
import { theme } from '../theme/tokens';

type Doc = InstanceType<typeof PDFDocument>;

export function renderTables(doc: Doc, model: DocumentModel, def: SectionDefinition): void {
  const { marginLeft, contentWidth } = theme.layout;
  const title = def.id === 'Financial' ? 'FINANCIAL INFORMATION' :
                def.id === 'Inventory' ? 'INVENTORY CHECKLIST' :
                def.id === 'Rules' ? 'RULES & RESPONSIBILITIES' : 'TABLE';

  doc.font('Helvetica-Bold').fontSize(theme.typography.h1.size).fillColor(theme.colors.navy900).text(title);
  doc.moveDown(0.6);

  if (def.id === 'Financial') {
    const rows = model.data?.financial?.lineItems || [
      ['Monthly Rent', model.data?.financial?.monthlyRent || '₹18,000'],
      ['Security Deposit', model.data?.financial?.deposit || '₹36,000'],
      ['Maintenance', model.data?.financial?.maintenance || '₹2,000'],
    ];
    rows.forEach(([k, v]: string[]) => {
      doc.font('Helvetica').fontSize(9).fillColor(theme.colors.slate500).text(k, marginLeft, doc.y, { width: 200, continued: true });
      doc.font('Helvetica-Bold').fillColor(theme.colors.slate700).text(String(v), { align: 'right' });
      doc.moveDown(0.4);
    });
  } else if (def.id === 'Inventory') {
    doc.font('Helvetica').fontSize(9).fillColor(theme.colors.slate700)
      .text('Inventory tracking enabled. Checklist and meter readings would appear here.');
  } else {
    doc.font('Helvetica').fontSize(9).fillColor(theme.colors.slate700)
      .text('Rules & Responsibilities table content.');
  }
  doc.moveDown();
}
