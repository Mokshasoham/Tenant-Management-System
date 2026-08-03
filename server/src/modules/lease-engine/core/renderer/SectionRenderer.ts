/**
 * Shared Renderer (A.13)
 * Applies theme tokens, page-break rules.
 */

import PDFDocument from 'pdfkit';
import { DocumentModel, SectionDefinition } from '../types';
import { theme } from '../theme/tokens';
import { formatHashShort } from '../services/hash';
import * as Sections from '../sections';

type Doc = InstanceType<typeof PDFDocument>;

export class SectionRenderer {
  renderDocument(
    doc: Doc,
    model: DocumentModel,
    sections: SectionDefinition[]
  ): void {
    // Respect compact flag on branding to produce a condensed document
    const compact = !!(model.branding && (model.branding as any).compact);
    if (compact) {
      const keep = new Set(['Cover', 'Metadata', 'Summary', 'Signature', 'Terms']);
      sections = sections.filter((s) => keep.has(s.type as string));
    }

    let isFirst = true;

    for (const sectionDef of sections) {
      if (!isFirst) {
        doc.addPage();
      }
      isFirst = false;

      this.drawHeader(doc, model, sectionDef.id);
      this.renderSection(doc, model, sectionDef);
      this.drawFooter(doc, model);
    }
  }

  private renderSection(
    doc: Doc,
    model: DocumentModel,
    def: SectionDefinition
  ): void {
    const key = def.type as keyof typeof Sections;
    const handler = (Sections as any)[key] || (Sections as any)[`render${def.type}`];
    if (typeof handler === 'function') {
      handler(doc, model, def);
    } else {
      doc
        .fontSize(theme.typography.h2.size)
        .fillColor(theme.colors.navy700)
        .text(`[Section: ${def.type} / ${def.id}]`);
      doc.moveDown();
    }
  }

  private drawHeader(doc: Doc, model: DocumentModel, sectionTitle: string): void {
    const { marginLeft, marginRight, pageWidth } = theme.layout;
    const y = theme.layout.marginTop - 18;
    const contentW = pageWidth - marginLeft - marginRight;

    // Subtle watermark / background for premium 'bgood' theme
    try {
      doc.save();
      doc.fillColor(theme.colors.goldTint);
      doc.opacity(0.12);
      doc.font('Helvetica-Bold').fontSize(84);
      const wmX = pageWidth / 2 - 200;
      const wmY = theme.layout.pageHeight / 2 - 40;
      // rotate watermark
      // rotate is stateful so use save/restore
      // @ts-ignore runtime API
      doc.rotate(-30, { origin: [pageWidth / 2, theme.layout.pageHeight / 2] });
      doc.text('PREMIUM', wmX, wmY, { align: 'left' });
      doc.restore();
      doc.opacity(1);
    } catch (e) {
      // ignore if PDFKit variant lacks rotate/opacity
      try {
        doc.opacity(1);
      } catch (_err) {
        /* noop */
      }
    }

    doc
      .fontSize(theme.typography.caption.size)
      .fillColor(theme.colors.navy900)
      .font('Helvetica-Bold')
      .text(model.branding.companyName || 'Tenant Management', marginLeft, y, {
        width: contentW * 0.35,
        align: 'left',
      });

    doc
      .font('Helvetica')
      .fillColor(theme.colors.slate500)
      .text(sectionTitle, marginLeft + contentW * 0.35, y, {
        width: contentW * 0.3,
        align: 'center',
      });

    doc
      .font('Courier')
      .fillColor(theme.colors.monoSlate)
      .text(model.id.formatted, marginLeft + contentW * 0.65, y, {
        width: contentW * 0.35,
        align: 'right',
      });

    doc
      .strokeColor(theme.colors.slate200)
      .lineWidth(0.6)
      .moveTo(marginLeft, y + 12)
      .lineTo(pageWidth - marginRight, y + 12)
      .stroke();

    doc.y = theme.layout.marginTop + 4;
  }

  private drawFooter(doc: Doc, model: DocumentModel): void {
    const { marginLeft, marginRight, pageWidth, pageHeight, marginBottom } =
      theme.layout;
    const y = pageHeight - marginBottom + 8;
    const hashShort = formatHashShort(model.security?.sha256Hash || 'pending');

    const line = [
      model.id.formatted,
      `v${model.version}`,
      `Generated ${model.generatedAt}`,
      'Confidential',
      `Hash ${hashShort}`,
    ].join('  ·  ');

    doc
      .fontSize(theme.typography.footer.size)
      .fillColor(theme.colors.slate500)
      .font('Helvetica')
      .text(line, marginLeft, y, {
        width: pageWidth - marginLeft - marginRight,
        align: 'center',
        lineBreak: false,
      });
  }
}

export default SectionRenderer;
