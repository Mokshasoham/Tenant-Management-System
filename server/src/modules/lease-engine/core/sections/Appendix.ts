import PDFDocument from 'pdfkit';
import { DocumentModel, SectionDefinition } from '../types';
import { theme } from '../theme/tokens';

type Doc = InstanceType<typeof PDFDocument>;

export function renderAppendix(doc: Doc, model: DocumentModel, _def: SectionDefinition): void {
  doc.font('Helvetica-Bold').fontSize(theme.typography.h1.size).fillColor(theme.colors.navy900).text('APPENDIX');
  doc.moveDown(0.6);
  // Certificate of Authenticity (if security block exists)
  const sec = model.security;
  if (sec) {
    doc.font('Helvetica-Bold').fontSize(12).fillColor(theme.colors.navy700).text('Certificate of Authenticity');
    doc.moveDown(0.2);
    doc.font('Helvetica').fontSize(9).fillColor(theme.colors.slate700).text(
      `This document was issued by ${model.branding.companyName} and is protected by SHA-256: ${sec.sha256Hash}`
    );
    doc.moveDown(0.6);
  }

  // Attachments listing
  doc.font('Helvetica-Bold').fontSize(10).fillColor(theme.colors.navy700).text('Attachments');
  doc.moveDown(0.2);
  const attachments = model.attachments || [];
  if (attachments.length === 0) {
    doc.font('Helvetica').fontSize(8).fillColor(theme.colors.slate700).text('No attachments available');
  } else {
    attachments.forEach((a) => {
      doc.font('Helvetica-Bold').fontSize(9).fillColor(theme.colors.slate700).text(a.label, { continued: true });
      doc.font('Helvetica').fontSize(8).fillColor(theme.colors.slate500).text(`  ·  ${a.count} file(s)`);
    });
  }
  doc.moveDown(0.6);

  // Fallback appendix sections
  const sections = ['Building Rules', 'Parking Rules', 'Visitor Rules'];
  sections.forEach((s) => {
    doc.font('Helvetica-Bold').fontSize(10).fillColor(theme.colors.navy700).text(s);
    doc.font('Helvetica').fontSize(8).fillColor(theme.colors.slate700)
      .text(`Standard ${s.toLowerCase()} applicable to the property. Full text maintained by property management.`);
    doc.moveDown(0.6);
  });
}
