import PDFDocument from 'pdfkit';
import QRCode from 'qrcode';
import { uploadFileBuffer } from './fileService.js';

/**
 * Generates an official lease PDF document using PDFKit, overlays the e-signature,
 * and pushes the raw buffer to AWS S3.
 */
export const generateAndUploadLeasePDF = async (lease, tenant, property, base64Signature) => {
    return new Promise((resolve, reject) => {
        try {
            const safeTenant = tenant || { firstName: 'Valued', lastName: 'Tenant', email: 'tenant@tms.com' };
            const safeProperty = property || { name: 'Assigned Residence', address: 'Property Address', city: 'City', zipCode: '000000' };

            const doc = new PDFDocument({ margin: 50 });
            const buffers = [];

            doc.on('data', buffers.push.bind(buffers));
            doc.on('end', async () => {
                const pdfBuffer = Buffer.concat(buffers);
                const filename = `lease_${lease.leaseNumber}.pdf`;
                
                try {
                    const record = await uploadFileBuffer({
                        buffer: pdfBuffer,
                        filename,
                        mimeType: 'application/pdf',
                        category: 'leases',
                        relatedEntityId: lease._id,
                        relatedModelName: 'Lease'
                    });
                    resolve({
                        Location: record.url,
                        Key: record.key,
                        fileId: record._id
                    });
                } catch (err) {
                    reject(err);
                }
            });

            // --- Build Formal Legal PDF Content ---
            doc.fontSize(20).text('RESIDENTIAL LEASE AGREEMENT', { align: 'center' });
            doc.moveDown(2);
            
            doc.fontSize(12).font('Helvetica-Bold').text(`Lease Reference Number: ${lease.leaseNumber}`);
            doc.font('Helvetica').text(`Date of Agreement Execution: ${new Date().toLocaleDateString()}`);
            doc.moveDown(2);

            doc.fontSize(14).font('Helvetica-Bold').text('1. THE PARTIES', { underline: true });
            doc.fontSize(12).font('Helvetica').text(`Landlord/Manager: ${safeProperty.manager?.firstName || 'TMS'} ${safeProperty.manager?.lastName || 'Management'}`);
            doc.text(`Tenant: ${safeTenant.firstName} ${safeTenant.lastName}`);
            doc.moveDown();

            doc.fontSize(14).font('Helvetica-Bold').text('2. THE PREMISES', { underline: true });
            doc.fontSize(12).font('Helvetica').text(`Property Name: ${safeProperty.name}`);
            doc.text(`Address: ${safeProperty.address}, ${safeProperty.city}, ${safeProperty.zipCode || ''}`);
            doc.moveDown();

            doc.fontSize(14).font('Helvetica-Bold').text('3. LEASE TERMS & FINANCIALS', { underline: true });
            doc.fontSize(12).font('Helvetica').text(`Lease Start Date: ${new Date(lease.startDate).toLocaleDateString()}`);
            doc.text(`Lease End Date: ${new Date(lease.endDate).toLocaleDateString()}`);
            doc.text(`Monthly Rent: INR ${lease.rentAmount.toLocaleString('en-IN')}`);
            doc.text(`Security Deposit Held in Escrow: INR ${lease.depositAmount.toLocaleString('en-IN')}`);
            doc.moveDown();

            doc.fontSize(14).font('Helvetica-Bold').text('4. LEGAL DECLARATION', { underline: true });
            doc.fontSize(10).font('Helvetica').text('By signing below, the Tenant acknowledges that they have read, understood, and agree to be bound by the terms and conditions outlined in this electronic agreement. The security deposit is held securely in escrow pending the successful conclusion of the lease period.', { align: 'justify' });
            doc.moveDown(2);

            // Embed Tenant Signature Image dynamically
            doc.fontSize(14).font('Helvetica-Bold').text('5. DIGITAL SIGNATURES', { underline: true });
            doc.moveDown();
            
            if (base64Signature) {
                // Strip the exact MIME prefix to isolate the raw base64 encoded data
                const base64Data = base64Signature.replace(/^data:image\/\w+;base64,/, "");
                const signatureBuffer = Buffer.from(base64Data, 'base64');
                
                doc.fontSize(12).font('Helvetica').text(`Tenant e-Signature Executed By: ${safeTenant.firstName} ${safeTenant.lastName}`);
                doc.moveDown();
                // Embed Base64 Image onto coordinate layout
                doc.image(signatureBuffer, { width: 180 });
            } else {
                doc.fontSize(12).font('Helvetica').text('Tenant Signature: ___________________________');
            }
            
            doc.moveDown(3);
            doc.text('Property Manager / Landlord Signature: ___________________________');
            doc.moveDown(1);
            doc.fontSize(8).text('Electronically signed and verified via TMS Escrow Platform.', { align: 'center', color: 'gray' });

            doc.end();
        } catch (error) {
            reject(error);
        }
    });
};

/**
 * Adapter Pattern: maps Bill + Payment details into the format expected by the invoice PDF generator.
 */
export const buildInvoiceViewModel = (bill, payment) => {
  return {
    _id: bill._id,
    invoiceNumber: bill.billNumber,
    receiptNumber: payment.reference || `RCPT-${String(payment._id).slice(-6).toUpperCase()}`,
    type: bill.type,
    amount: bill.amountDue,
    amountPaid: bill.amountPaid,
    paymentDate: payment.paymentDate || new Date(),
    dueDate: bill.dueDate,
    billingPeriodStart: bill.billingPeriodStart,
    billingPeriodEnd: bill.billingPeriodEnd,
    breakdown: bill.breakdown,
    paymentMethod: payment.paymentMethod,
    reference: payment.reference,
    stripePaymentIntentId: payment.stripePaymentIntentId,
    razorpayPaymentId: payment.razorpayPaymentId,
    status: bill.status
  };
};

const INVOICE_TEMPLATE_VERSION = 'v3.0';

const COMPANY = {
  name: 'Your Company Pvt. Ltd.',
  addressLine1: 'Your Office Address, Area',
  addressLine2: 'City, State, PIN',
  email: 'support@yourdomain.com',
  phone: '+91 00000 00000',
  gstin: '',
  website: 'www.yourdomain.com',
};
const APP_BASE_URL = process.env.APP_URL || 'http://localhost:3000';

const EMERALD = '#059669';
const EMERALD_DARK = '#065f46';
const EMERALD_SOFT = '#ecfdf5';
const INK = '#0f172a';
const SLATE = '#475569';
const SLATE_LIGHT = '#94a3b8';
const LINE = '#e2e8f0';
const RED = '#dc2626';
const AMBER = '#d97706';

const STATUS_MAP = {
  paid: { label: 'PAID', color: EMERALD },
  overdue: { label: 'OVERDUE', color: RED },
  pending: { label: 'PENDING', color: AMBER },
  partially_paid: { label: 'PARTIAL', color: AMBER },
  cancelled: { label: 'CANCELLED', color: SLATE },
  voided: { label: 'VOIDED', color: SLATE },
};

const fmtMoney = (n) => `INR ${Math.abs(Number(n) || 0).toLocaleString('en-IN')}`;
const fmtDate = (d) => (d ? new Date(d).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : '—');

function sectionLabel(doc, text, x, y) {
  doc.font('Helvetica-Bold').fontSize(7.5).fillColor(SLATE_LIGHT).text(text, x, y, { characterSpacing: 1.2 });
}

/**
 * Generates an official, beautiful A4 PDF invoice.
 */
export const generateInvoicePDF = async (payment, tenant, property, lease = null, options = {}) => {
  const safeTenant = tenant || { firstName: 'Valued', lastName: 'Tenant', email: 'tenant@tms.com' };
  const safeProperty = property || { name: 'Assigned Residence', address: 'Property Address', city: '', zipCode: '' };

  const invoiceNumber = payment.invoiceNumber
    || `INV-${new Date(payment.paymentDate || Date.now()).getFullYear()}-${String(payment._id).slice(-6).toUpperCase()}`;
  const receiptNumber = payment.receiptNumber || `RCPT-${String(payment._id).slice(-6).toUpperCase()}`;
  const tenantId = safeTenant.tenantCode || `TEN-${String(safeTenant._id || payment._id).slice(-4).toUpperCase()}`;
  const leaseNumber = lease?.leaseNumber || '—';

  const invoiceDate = payment.paymentDate || payment.createdAt || new Date();
  const dueDate = payment.dueDate || null;
  const billingMonth = payment.billingPeriodStart
    ? new Date(payment.billingPeriodStart).toLocaleDateString('en-IN', { month: 'long', year: 'numeric' })
    : new Date(payment.dueDate || payment.paymentDate || Date.now()).toLocaleDateString('en-IN', { month: 'long', year: 'numeric' });

  const breakdown = Array.isArray(payment.breakdown) && payment.breakdown.length
    ? payment.breakdown
    : [{ label: `${(payment.type || 'rent').replace('_', ' ').toUpperCase()} PAYMENT`, amount: payment.amount }];
  const amountDue = breakdown.reduce((s, c) => s + (Number(c.amount) || 0), 0);
  const amountPaid = payment.amountPaid ?? (payment.status === 'paid' ? amountDue : 0);
  const balance = amountDue - amountPaid;

  const verificationUrl = `${APP_BASE_URL}/verify/${invoiceNumber}`;
  const qrBuffer = await QRCode.toBuffer(verificationUrl, { margin: 0, width: 300, color: { dark: EMERALD_DARK, light: '#ffffff' } });

  return new Promise((resolve, reject) => {
    try {
      const PAGE_W = 595.28, PAGE_H = 841.89, M = 40;
      const CW = PAGE_W - M * 2;

      const doc = new PDFDocument({ size: 'A4', margin: 0 });
      const buffers = [];
      doc.on('data', buffers.push.bind(buffers));
      doc.on('end', async () => {
        const pdfBuffer = Buffer.concat(buffers);
        const filename = `invoice_${payment._id}.pdf`;
        try {
          const record = await uploadFileBuffer({
            buffer: pdfBuffer, filename, mimeType: 'application/pdf',
            category: 'invoices', relatedEntityId: payment._id, relatedModelName: 'Payment',
          });
          resolve({ Location: record.url, Key: record.key, fileId: record._id });
        } catch (err) { reject(err); }
      });

      doc.rect(0, 0, PAGE_W, PAGE_H).fill('#ffffff');

      // Watermark
      if (payment.status === 'paid' || payment.status === 'overdue') {
        const wmText = payment.status === 'paid' ? 'PAID' : 'OVERDUE';
        const wmColor = payment.status === 'paid' ? EMERALD : RED;
        doc.save();
        doc.opacity(0.06).fillColor(wmColor).font('Helvetica-Bold').fontSize(120);
        doc.rotate(-38, { origin: [PAGE_W / 2, PAGE_H / 2] });
        doc.text(wmText, 0, PAGE_H / 2 - 60, { width: PAGE_W, align: 'center' });
        doc.rotate(38, { origin: [PAGE_W / 2, PAGE_H / 2] });
        doc.opacity(1);
        doc.restore();
      }

      // Header: logo + company
      let y = M;
      doc.save();
      doc.roundedRect(M, y, 34, 34, 8).fill(EMERALD_DARK);
      doc.opacity(0.85).roundedRect(M + 10, y + 10, 22, 22, 6).fill(EMERALD);
      doc.opacity(1);
      doc.restore();

      doc.font('Helvetica-Bold').fontSize(13).fillColor(INK).text(COMPANY.name, M + 44, y);
      doc.font('Helvetica').fontSize(7.5).fillColor(SLATE)
        .text(COMPANY.addressLine1, M + 44, y + 16, { width: 270, lineBreak: false })
        .text(COMPANY.addressLine2, M + 44, y + 26, { width: 270, lineBreak: false });
      doc.font('Helvetica').fontSize(7.5).fillColor(SLATE)
        .text(`${COMPANY.email}   |   ${COMPANY.phone}`, M + 44, y + 40, { width: 270, lineBreak: false });
      if (COMPANY.gstin) {
        doc.font('Helvetica-Bold').fontSize(7.5).fillColor(SLATE_LIGHT)
          .text(`GSTIN: ${COMPANY.gstin}`, M + 44, y + 52, { width: 270, lineBreak: false });
      }

      // Header: invoice meta
      const metaX = M + 300, metaW = 145;
      doc.font('Helvetica-Bold').fontSize(16).fillColor(EMERALD_DARK).text('INVOICE', metaX, y, { width: metaW, align: 'right' });
      doc.font('Helvetica-Bold').fontSize(10).fillColor(INK).text(invoiceNumber, metaX, y + 20, { width: metaW, align: 'right' });
      doc.font('Helvetica').fontSize(7.5).fillColor(SLATE).text(`Receipt: ${receiptNumber}`, metaX, y + 34, { width: metaW, align: 'right' });
      const generatedOn = new Date();
      doc.font('Helvetica').fontSize(7.5).fillColor(SLATE)
        .text(`Generated: ${fmtDate(generatedOn)}, ${generatedOn.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}`, metaX, y + 46, { width: metaW, align: 'right' });

      // QR code
      const qrSize = 62;
      const qrX = PAGE_W - M - qrSize;
      doc.image(qrBuffer, qrX, y - 2, { width: qrSize, height: qrSize });
      doc.font('Helvetica').fontSize(6).fillColor(SLATE_LIGHT).text('Scan to verify', qrX, y + qrSize + 2, { width: qrSize, align: 'center' });

      // Status ribbon
      {
        const st = STATUS_MAP[payment.status] || STATUS_MAP.paid;
        doc.save();
        doc.rotate(45, { origin: [PAGE_W, 0] });
        doc.rect(PAGE_W - 30, -16, 170, 22).fill(st.color);
        doc.restore();
        doc.save();
        doc.rotate(45, { origin: [PAGE_W, 0] });
        doc.font('Helvetica-Bold').fontSize(10).fillColor('#ffffff').text(st.label, PAGE_W - 30, -11, { width: 170, align: 'center', characterSpacing: 2 });
        doc.restore();
      }

      y += 74;
      doc.moveTo(M, y).lineTo(PAGE_W - M, y).lineWidth(1).strokeColor(LINE).stroke();
      y += 12;

      // Quick status strip: Status | Invoice Date | Due Date | Payment Date
      const stripH = 42;
      doc.roundedRect(M, y, CW, stripH, 6).fill(EMERALD_SOFT);
      const scW = CW / 4;
      const stMap2 = { paid: { label: 'PAID', color: EMERALD, icon: '✓' }, overdue: { label: 'OVERDUE', color: RED, icon: '!' }, pending: { label: 'PENDING', color: AMBER, icon: '…' }, partially_paid: { label: 'PARTIAL', color: AMBER, icon: '…' }, cancelled: { label: 'CANCELLED', color: SLATE, icon: '×' }, voided: { label: 'VOIDED', color: SLATE, icon: '×' } };
      const st2 = stMap2[payment.status] || stMap2.paid;
      doc.circle(M + 18, y + 21, 8).fill(st2.color);
      doc.font('Helvetica-Bold').fontSize(9).fillColor('#ffffff').text(st2.icon, M + 14, y + 16.5);
      doc.font('Helvetica-Bold').fontSize(7).fillColor(SLATE_LIGHT).text('STATUS', M + 32, y + 9, { characterSpacing: 1 });
      doc.font('Helvetica-Bold').fontSize(9.5).fillColor(st2.color).text(st2.label, M + 32, y + 20);

      doc.font('Helvetica-Bold').fontSize(7).fillColor(SLATE_LIGHT).text('INVOICE DATE', M + scW, y + 9, { characterSpacing: 1 });
      doc.font('Helvetica-Bold').fontSize(9.5).fillColor(INK).text(fmtDate(invoiceDate), M + scW, y + 20);

      doc.font('Helvetica-Bold').fontSize(7).fillColor(SLATE_LIGHT).text('DUE DATE', M + scW * 2, y + 9, { characterSpacing: 1 });
      doc.font('Helvetica-Bold').fontSize(9.5).fillColor(INK).text(fmtDate(dueDate), M + scW * 2, y + 20);

      doc.font('Helvetica-Bold').fontSize(7).fillColor(SLATE_LIGHT).text('PAYMENT DATE', M + scW * 3, y + 9, { characterSpacing: 1 });
      doc.font('Helvetica-Bold').fontSize(9.5).fillColor(INK).text(fmtDate(payment.paymentDate), M + scW * 3, y + 20);

      y += stripH + 14;

      // Tenant | Property
      const colW = CW / 2 - 10;
      sectionLabel(doc, 'TENANT', M, y);
      doc.font('Helvetica-Bold').fontSize(11).fillColor(INK).text(`${safeTenant.firstName} ${safeTenant.lastName}`, M, y + 11);
      doc.font('Helvetica').fontSize(8).fillColor(SLATE).text(`Tenant ID: ${tenantId}`, M, y + 26);
      doc.font('Helvetica').fontSize(8).fillColor(SLATE).text(safeTenant.email || '', M, y + 38);
      doc.font('Helvetica').fontSize(8).fillColor(SLATE).text(safeTenant.phone || '', M, y + 50);

      const col2 = M + colW + 20;
      sectionLabel(doc, 'PROPERTY', col2, y);
      doc.font('Helvetica-Bold').fontSize(11).fillColor(INK)
        .text(safeProperty.type ? `${safeProperty.name}  ·  ${safeProperty.type}` : safeProperty.name, col2, y + 11, { width: colW });
      doc.font('Helvetica').fontSize(8).fillColor(SLATE)
        .text(safeProperty.unit ? `${safeProperty.unit}${safeProperty.floor ? ', ' + safeProperty.floor : ''}` : (safeProperty.address || ''), col2, y + 26);
      doc.font('Helvetica').fontSize(8).fillColor(SLATE).text(`${safeProperty.city || ''} ${safeProperty.zipCode || ''}`, col2, y + 38);
      const managerName = property?.manager?.firstName ? `${property.manager.firstName} ${property.manager.lastName || ''}`.trim() : (safeProperty.managerName || null);
      if (managerName) doc.font('Helvetica').fontSize(8).fillColor(SLATE).text(`Manager: ${managerName}`, col2, y + 50);

      y += 68;
      doc.moveTo(M, y).lineTo(PAGE_W - M, y).lineWidth(0.5).dash(2, { space: 2 }).strokeColor(LINE).stroke();
      doc.undash();
      y += 12;

      // Lease | Billing Month (+ period)
      sectionLabel(doc, 'LEASE', M, y);
      doc.font('Helvetica-Bold').fontSize(11).fillColor(INK).text(leaseNumber, M, y + 11);

      sectionLabel(doc, 'BILLING MONTH', col2, y);
      if (payment.billingPeriodStart && payment.billingPeriodEnd) {
        doc.font('Helvetica-Bold').fontSize(10.5).fillColor(INK).text(billingMonth, col2, y + 11, { continued: true });
        doc.font('Helvetica').fontSize(8).fillColor(SLATE_LIGHT)
          .text(`   (${fmtDate(payment.billingPeriodStart)} - ${fmtDate(payment.billingPeriodEnd)})`);
      } else {
        doc.font('Helvetica-Bold').fontSize(10.5).fillColor(INK).text(billingMonth, col2, y + 11);
      }

      y += 36;
      doc.moveTo(M, y).lineTo(PAGE_W - M, y).lineWidth(1).strokeColor(LINE).stroke();
      y += 16;

      // Charges table
      doc.roundedRect(M, y, CW, 20, 4).fill(EMERALD_SOFT);
      doc.font('Helvetica-Bold').fontSize(8).fillColor(EMERALD_DARK)
        .text('DESCRIPTION', M + 12, y + 6, { characterSpacing: 0.5 })
        .text('AMOUNT', PAGE_W - M - 110, y + 6, { width: 98, align: 'right', characterSpacing: 0.5 });
      y += 20;

      breakdown.forEach((c, i) => {
        const rowY = y + i * 17;
        if (i % 2 === 1) doc.rect(M, rowY, CW, 17).fill('#fafafa');
        const isNeg = Number(c.amount) < 0;
        doc.font('Helvetica').fontSize(8.5).fillColor(INK).text(c.label, M + 12, rowY + 4.5);
        doc.font('Helvetica-Bold').fontSize(8.5).fillColor(isNeg ? RED : INK)
          .text(`${isNeg ? '-' : ''}${fmtMoney(c.amount)}`, PAGE_W - M - 110, rowY + 4.5, { width: 98, align: 'right' });
      });
      y += breakdown.length * 17;

      doc.moveTo(M, y + 3).lineTo(PAGE_W - M, y + 3).lineWidth(1).strokeColor(INK).stroke();
      y += 12;
      doc.font('Helvetica-Bold').fontSize(11).fillColor(INK).text('AMOUNT DUE', M + 12, y);
      doc.font('Helvetica-Bold').fontSize(13).fillColor(EMERALD_DARK).text(fmtMoney(amountDue), PAGE_W - M - 110, y - 1, { width: 98, align: 'right' });
      y += 26;

      // Payment summary box: Due / Paid / Balance, then Paid Via / Transaction / Date
      const boxH = 88;
      doc.roundedRect(M, y, CW, boxH, 8).fill(EMERALD_DARK);
      const pcolW = CW / 3;
      doc.font('Helvetica-Bold').fontSize(7.5).fillColor('#a7f3d0').text('AMOUNT DUE', M + 16, y + 12, { characterSpacing: 1 });
      doc.font('Helvetica-Bold').fontSize(14).fillColor('#ffffff').text(fmtMoney(amountDue), M + 16, y + 24);

      doc.font('Helvetica-Bold').fontSize(7.5).fillColor('#a7f3d0').text('AMOUNT PAID', M + pcolW, y + 12, { characterSpacing: 1 });
      doc.font('Helvetica-Bold').fontSize(14).fillColor('#ffffff').text(fmtMoney(amountPaid), M + pcolW, y + 24);

      doc.font('Helvetica-Bold').fontSize(7.5).fillColor('#a7f3d0').text('BALANCE', M + pcolW * 2, y + 12, { characterSpacing: 1 });
      doc.font('Helvetica-Bold').fontSize(14).fillColor(balance > 0 ? '#fca5a5' : '#ffffff').text(fmtMoney(balance), M + pcolW * 2, y + 24);

      doc.moveTo(M + 16, y + 48).lineTo(PAGE_W - M - 16, y + 48).lineWidth(0.5).strokeColor('#134e4a').stroke();

      doc.font('Helvetica-Bold').fontSize(7.5).fillColor('#a7f3d0').text('PAID VIA', M + 16, y + 58, { characterSpacing: 1 });
      doc.font('Helvetica-Bold').fontSize(9.5).fillColor('#ffffff')
        .text(`${(payment.paymentMethod || '-').toUpperCase()}${payment.gateway ? ' · ' + payment.gateway : ''}`, M + 16, y + 69);

      doc.font('Helvetica-Bold').fontSize(7.5).fillColor('#a7f3d0').text('TRANSACTION ID', M + pcolW, y + 58, { characterSpacing: 1 });
      doc.font('Helvetica-Bold').fontSize(9).fillColor('#ffffff')
        .text(payment.stripePaymentIntentId || payment.razorpayPaymentId || payment.reference || '—', M + pcolW, y + 69, { width: pcolW - 10 });

      doc.font('Helvetica-Bold').fontSize(7.5).fillColor('#a7f3d0').text('PAYMENT DATE', M + pcolW * 2, y + 58, { characterSpacing: 1 });
      doc.font('Helvetica-Bold').fontSize(9.5).fillColor('#ffffff').text(fmtDate(payment.paymentDate), M + pcolW * 2, y + 69);

      y += boxH + 16;

      // Optional payment history strip
      if (Array.isArray(options.paymentHistory) && options.paymentHistory.length) {
        sectionLabel(doc, `RENT PAYMENT HISTORY (LAST ${options.paymentHistory.length} MONTHS)`, M, y);
        y += 13;
        const hist = options.paymentHistory;
        const chipW = CW / hist.length;
        hist.forEach((h, i) => {
          const cx = M + chipW * i + chipW / 2;
          doc.circle(cx, y + 8, 8).fill(h.paid ? EMERALD : '#e2e8f0');
          doc.font('Helvetica-Bold').fontSize(7.5).fillColor('#ffffff').text(h.paid ? '✓' : '–', cx - 3.5, y + 4.5);
          doc.font('Helvetica').fontSize(6.5).fillColor(SLATE).text(h.label, cx - 10, y + 19, { width: 20, align: 'center' });
        });
        y += 36;
      }

      // Compact terms + support line
      doc.moveTo(M, y).lineTo(PAGE_W - M, y).lineWidth(0.5).strokeColor(LINE).stroke();
      y += 10;
      doc.font('Helvetica').fontSize(7.5).fillColor(SLATE_LIGHT)
        .text('This receipt is generated electronically and does not require a physical signature.', M, y, { width: CW });
      doc.font('Helvetica-Bold').fontSize(7.5).fillColor(SLATE)
        .text(`Need help?  ${COMPANY.email}   ·   ${COMPANY.phone}`, M, y + 11, { width: CW });
      y += 30;

      // Digital signature
      doc.moveTo(PAGE_W - M - 170, y).lineTo(PAGE_W - M, y).lineWidth(0.75).strokeColor(SLATE_LIGHT).stroke();
      doc.font('Helvetica-Oblique').fontSize(13).fillColor(EMERALD_DARK).text('Tenant Management System', PAGE_W - M - 170, y + 4, { width: 170, align: 'right' });
      doc.font('Helvetica-Bold').fontSize(7).fillColor(SLATE_LIGHT).text('AUTHORIZED · ELECTRONICALLY GENERATED', PAGE_W - M - 170, y + 20, { width: 170, align: 'right', characterSpacing: 0.5 });

      doc.font('Helvetica-Bold').fontSize(7.5).fillColor(SLATE_LIGHT).text('VERIFY THIS INVOICE', M, y + 4, { characterSpacing: 1 });
      doc.font('Helvetica').fontSize(8).fillColor(EMERALD_DARK).text(verificationUrl, M, y + 16);

      y += 44;

      // Footer
      doc.moveTo(M, y).lineTo(PAGE_W - M, y).lineWidth(1).strokeColor(LINE).stroke();
      y += 9;
      doc.font('Helvetica-Bold').fontSize(8).fillColor(INK).text(COMPANY.name, M, y, { width: CW / 2 });
      doc.font('Helvetica').fontSize(7.5).fillColor(SLATE_LIGHT)
        .text(`${COMPANY.website}   ·   ${COMPANY.email}   ·   © ${new Date().getFullYear()}`, M, y, { width: CW, align: 'right' });
      doc.font('Helvetica').fontSize(6.5).fillColor(SLATE_LIGHT).text(`Invoice template ${INVOICE_TEMPLATE_VERSION}`, M, y + 13);

      doc.end();
    } catch (error) {
      reject(error);
    }
  });
};
