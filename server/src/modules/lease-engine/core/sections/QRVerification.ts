/**
 * QR Verification + Document Security (A.5 / B.2 Page 15)
 * never split
 */

import PDFDocument from 'pdfkit';
import { DocumentModel, SectionDefinition } from '../types';
import { theme } from '../theme/tokens';
import { formatHashShort } from '../services/hash';

type Doc = InstanceType<typeof PDFDocument>;

export function renderQRVerification(
  doc: Doc,
  model: DocumentModel,
  _def: SectionDefinition
): void {
  const { marginLeft, contentWidth } = theme.layout;
  const sec = model.security || {
    sha256Hash: 'pending',
    verificationTimestamp: '—',
    issuingOrganization: model.branding.companyName,
    tamperDetected: false,
  };

  doc
    .font('Helvetica-Bold')
    .fontSize(theme.typography.h1.size)
    .fillColor(theme.colors.navy900)
    .text('QR VERIFICATION');
  doc.moveDown(0.5);

  // QR box (render image if available)
  const qrSize = theme.layout.qrMinSize;
  const qrX = marginLeft + (contentWidth - qrSize) / 2;
  const qrDataUrl = (model.security as any)?.qrData;
  if (qrDataUrl) {
    try {
      const base64 = qrDataUrl.split(',')[1];
      const imgBuf = Buffer.from(base64, 'base64');
      doc.image(imgBuf, qrX, doc.y, { width: qrSize, height: qrSize });
      doc.y += qrSize + 12;
    } catch (e) {
      // fallback to placeholder box
      doc
        .roundedRect(qrX, doc.y, qrSize, qrSize, 4)
        .strokeColor(theme.colors.navy700)
        .lineWidth(1.5)
        .stroke();
      doc
        .font('Helvetica')
        .fontSize(8)
        .fillColor(theme.colors.slate500)
        .text('QR CODE', qrX, doc.y + qrSize / 2 - 6, {
          width: qrSize,
          align: 'center',
        });
      doc.y += qrSize + 12;
    }
  } else {
    doc
      .roundedRect(qrX, doc.y, qrSize, qrSize, 4)
      .strokeColor(theme.colors.navy700)
      .lineWidth(1.5)
      .stroke();

    doc
      .font('Helvetica')
      .fontSize(8)
      .fillColor(theme.colors.slate500)
      .text('QR CODE', qrX, doc.y + qrSize / 2 - 6, {
        width: qrSize,
        align: 'center',
      });

    doc.y += qrSize + 12;
  }

  doc
    .font('Helvetica-Bold')
    .fontSize(10)
    .fillColor(theme.colors.navy700)
    .text('Scan to Verify', { align: 'center' });

  const verifyUrl = `https://verify.tenantmgmt.example/doc/${model.id.formatted}`;
  doc
    .font('Helvetica')
    .fontSize(8)
    .fillColor(theme.colors.slate500)
    .text(model.id.formatted + '\n' + verifyUrl, { align: 'center' });

  doc.moveDown(1.5);

  // Document Security block (A.5)
  doc
    .font('Helvetica-Bold')
    .fontSize(theme.typography.h2.size)
    .fillColor(theme.colors.navy900)
    .text('DOCUMENT SECURITY');
  doc.moveDown(0.4);

  const rows: [string, string][] = [
    ['SHA-256 Hash', formatHashShort(sec.sha256Hash, 8, 6)],
    ['Verification Timestamp', sec.verificationTimestamp],
    ['Issuing Organization', sec.issuingOrganization],
    [
      'Tamper Detection',
      sec.tamperDetected
        ? '⚠ Hash mismatch — document may have been altered'
        : '✔ No modifications detected since issue',
    ],
  ];

  if (sec.digitalSignatureValid !== undefined) {
    rows.push([
      'Digital Signature Verify',
      sec.digitalSignatureValid
        ? '✔ Certificate valid'
        : '✗ Certificate invalid or missing',
    ]);
  }

  const cardY = doc.y;
  const rowH = 16;
  const cardH = rows.length * rowH + 16;

  doc
    .roundedRect(marginLeft, cardY, contentWidth, cardH, 6)
    .fill(theme.colors.slate50)
    .strokeColor(theme.colors.slate200)
    .lineWidth(0.5)
    .stroke();

  let y = cardY + 10;
  rows.forEach(([label, value]) => {
    doc
      .font('Helvetica')
      .fontSize(8)
      .fillColor(theme.colors.slate500)
      .text(label, marginLeft + 12, y, { width: 160 });
    doc
      .font(label.includes('Hash') ? 'Courier' : 'Helvetica')
      .fontSize(8)
      .fillColor(
        value.startsWith('✔')
          ? theme.colors.green600
          : value.startsWith('⚠')
            ? theme.colors.red600
            : theme.colors.slate700
      )
      .text(value, marginLeft + 180, y, { width: contentWidth - 200 });
    y += rowH;
  });

  doc.y = cardY + cardH + 10;
}
