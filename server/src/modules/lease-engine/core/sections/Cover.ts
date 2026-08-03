/**
 * Cover Section (A.1 / B.2 Page 0)
 * never split
 */

import PDFDocument from 'pdfkit';
import { DocumentModel, SectionDefinition } from '../types';
import { theme } from '../theme/tokens';
import { drawStatusChip } from '../components/StatusChip';

type Doc = InstanceType<typeof PDFDocument>;

export function renderCover(
  doc: Doc,
  model: DocumentModel,
  _def: SectionDefinition
): void {
  const { marginLeft, marginRight, pageWidth, contentWidth } = theme.layout;
  const cx = pageWidth / 2;

  const coverPanelY = doc.y;
  doc
    .font('Courier')
    .fontSize(theme.typography.mono.size)
    .fillColor(theme.colors.monoSlate)
    .text(model.id.formatted, marginLeft, coverPanelY, { align: 'left' });

  const chipX = pageWidth - marginRight - 90;
  drawStatusChip(doc, model.lifecycle, chipX, coverPanelY - 2);

  doc.moveDown(1.2);

  // Compact header banner inspired by invoice layout
  doc
    .font('Helvetica-Bold')
    .fontSize(12)
    .fillColor(theme.colors.navy900)
    .text(model.branding.companyName, marginLeft, doc.y, { align: 'left' });

  // Right-side document ID / QR placeholder area
  doc
    .font('Helvetica')
    .fontSize(theme.typography.caption.size)
    .fillColor(theme.colors.slate500)
    .text(model.id.formatted, pageWidth - marginRight - 160, doc.y, { width: 160, align: 'right' });

  doc.moveDown(0.8);

  const miniBannerH = 44;
  const bannerY = doc.y;
  doc
    .roundedRect(marginLeft, bannerY, contentWidth, miniBannerH, 8)
    .fill(theme.colors.blueTint)
    .strokeColor(theme.colors.slate200)
    .lineWidth(0.6)
    .stroke();

  // status + key dates in banner (left aligned)
  const status = model.data?.leaseStatus || model.lifecycle;
  drawStatusChip(doc, status, marginLeft + 12, bannerY + 8);
  doc
    .font('Helvetica-Bold')
    .fontSize(10)
    .fillColor(theme.colors.navy700)
    .text(model.data?.property?.name || 'Property', marginLeft + 80, bannerY + 10, { width: 240 });

  // dates (right side)
  doc
    .font('Helvetica')
    .fontSize(theme.typography.caption.size)
    .fillColor(theme.colors.slate500)
    .text(`Generated: ${model.generatedAt || '—'}`, pageWidth - marginRight - 220, bannerY + 10, { width: 220, align: 'right' });

  doc.y = bannerY + miniBannerH + 12;

  // Title and compact meta row (two columns)
  doc
    .font('Helvetica-Bold')
    .fontSize(theme.typography.display.size)
    .fillColor(theme.colors.navy900)
    .text('LEASE AGREEMENT', marginLeft, doc.y, { align: 'left' });

  doc.moveDown(0.4);

  const metaLeftX = marginLeft;
  const metaRightX = marginLeft + contentWidth / 2;

  doc
    .font('Helvetica')
    .fontSize(theme.typography.caption.size)
    .fillColor(theme.colors.slate500)
    .text('Tenant', metaLeftX, doc.y, { width: contentWidth / 2 });
  doc
    .font('Helvetica-Bold')
    .fontSize(theme.typography.body.size)
    .fillColor(theme.colors.slate700)
    .text(model.data?.tenant?.name || '—', metaLeftX, doc.y + 12, { width: contentWidth / 2 });

  doc
    .font('Helvetica')
    .fontSize(theme.typography.caption.size)
    .fillColor(theme.colors.slate500)
    .text('Term', metaRightX, doc.y, { width: contentWidth / 2 });
  doc
    .font('Helvetica-Bold')
    .fontSize(theme.typography.body.size)
    .fillColor(theme.colors.slate700)
    .text(model.data?.duration || '—', metaRightX, doc.y + 12, { width: contentWidth / 2 });

  doc.y += 36;

  doc
    .font('Helvetica')
    .fontSize(theme.typography.caption.size)
    .fillColor(theme.colors.slate500)
    .text('Scan QR on final page to verify authenticity', { align: 'center' });
}
