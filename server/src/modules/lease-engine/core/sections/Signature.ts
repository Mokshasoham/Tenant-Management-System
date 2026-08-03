/**
 * Digital Signatures (B.2 Page 12)
 * Each block never split (A.11). Audit strip only on Signed blocks (A.10).
 */

import PDFDocument from 'pdfkit';
import { DocumentModel, SectionDefinition } from '../types';
import { theme } from '../theme/tokens';
import { drawStatusChip } from '../components/StatusChip';

type Doc = InstanceType<typeof PDFDocument>;

export function renderSignature(
  doc: Doc,
  model: DocumentModel,
  _def: SectionDefinition
): void {
  const { marginLeft, contentWidth } = theme.layout;

  doc
    .font('Helvetica-Bold')
    .fontSize(theme.typography.h1.size)
    .fillColor(theme.colors.navy900)
    .text('DIGITAL SIGNATURES');
  doc.moveDown(0.6);

  const signers = model.data?.signers || [
    { role: 'Tenant', name: model.data?.tenant?.name || 'Tenant', status: 'Pending' },
    { role: 'Co-Tenant', name: '—', status: 'Pending' },
    { role: 'Property Manager', name: model.data?.manager?.name || 'Manager', status: 'Pending' },
    { role: 'Owner / Landlord', name: model.data?.owner?.name || 'Owner', status: 'Pending' },
  ];

  const gap = 12;
  const cardW = (contentWidth - gap) / 2;
  const cardH = 110;
  let startY = doc.y;

  signers.forEach((s: any, i: number) => {
    const col = i % 2;
    const row = Math.floor(i / 2);
    const x = marginLeft + col * (cardW + gap);
    const y = startY + row * (cardH + gap);

    // keepTogether: each cell is atomic — we draw fully or would have checked space
    doc
      .roundedRect(x, y, cardW, cardH, 6)
      .fill(theme.colors.slate50)
      .strokeColor(theme.colors.slate200)
      .lineWidth(0.5)
      .stroke();

    doc
      .font('Helvetica')
      .fontSize(7)
      .fillColor(theme.colors.slate500)
      .text(s.role.toUpperCase(), x + 10, y + 8, { width: cardW - 20 });

    doc
      .font('Helvetica-Bold')
      .fontSize(10)
      .fillColor(theme.colors.slate700)
      .text(s.name, x + 10, y + 22, { width: cardW - 20 });

    // Signature image (if available) — supports data URL or file path
    if (s.signatureImage) {
      try {
        const imgX = x + cardW - 74;
        const imgY = y + 10;
        if (typeof s.signatureImage === 'string' && s.signatureImage.startsWith('data:')) {
          const base64 = s.signatureImage.split(',')[1];
          const buf = Buffer.from(base64, 'base64');
          // draw signature image
          // @ts-ignore PDFKit accepts buffer
          doc.image(buf, imgX, imgY, { width: 64, height: 36 });
        } else if (typeof s.signatureImage === 'string') {
          // assume path
          // @ts-ignore
          doc.image(s.signatureImage, imgX, y + 8, { width: 64, height: 36 });
        }
      } catch (e) {
        // ignore image errors
      }
    }

    drawStatusChip(doc, s.status || 'Pending', x + 10, y + 40, { size: 'sm' });

    // Signature Audit strip — only when Signed (A.10)
    if (s.status === 'Signed' && s.audit) {
      const auditY = y + 62;
      doc
        .font('Courier')
        .fontSize(6)
        .fillColor(theme.colors.monoSlate)
        .text(
          [
            s.audit.method && `Method: ${s.audit.method}`,
            s.audit.ip && `IP: ${s.audit.ip}`,
            s.audit.browser && `Browser: ${s.audit.browser}`,
            s.audit.device && `Device: ${s.audit.device}`,
            s.audit.time && `Time: ${s.audit.time}`,
            s.audit.hash && `Hash: ${s.audit.hash}`,
          ]
            .filter(Boolean)
            .join('  ·  '),
          x + 10,
          auditY,
          { width: cardW - 20 }
        );
    } else if (s.status !== 'Signed') {
      doc
        .font('Helvetica')
        .fontSize(7)
        .fillColor(theme.colors.slate500)
        .text('Awaiting signature', x + 10, y + 62, { width: cardW - 20 });
    }
  });

  doc.y = startY + Math.ceil(signers.length / 2) * (cardH + gap) + 16;

  // Company Seal placeholder
  doc
    .font('Helvetica')
    .fontSize(8)
    .fillColor(theme.colors.slate500)
    .text('Company Seal / Digital Stamp', { align: 'center' });
  doc
    .roundedRect(marginLeft + contentWidth / 2 - 50, doc.y + 4, 100, 40, 4)
    .strokeColor(theme.colors.slate200)
    .lineWidth(0.5)
    .stroke();
  doc.y += 55;
}
